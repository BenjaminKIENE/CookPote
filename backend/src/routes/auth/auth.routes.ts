import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../../services/auth.service.js';
import {
  registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema,
  forgotPasswordSchema, resetPasswordSchema, verify2FASchema,
  enable2FASchema, disable2FASchema,
  type RegisterBody, type LoginBody, type Verify2FABody, type ResetPasswordBody,
  type Enable2FABody, type Disable2FABody,
} from './auth.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';

const REFRESH_COOKIE = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

function getIp(request: FastifyRequest): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? null;
  return request.ip ?? null;
}

function validate<T>(schema: { parse: (v: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err: unknown) {
    const zodErr = err as { errors?: { message: string }[] };
    const message = zodErr.errors?.[0]?.message ?? 'Données invalides.';
    throw Object.assign(new Error(message), { statusCode: 400 });
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // ── Register ───────────────────────────────────────────────────────────────
  fastify.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(registerSchema, request.body) as RegisterBody;
    await authService.register(body.email, body.password, body.pseudo, getIp(request));
    return reply.status(201).send({ message: 'Compte créé. Vérifie tes emails pour activer ton compte.' });
  });

  // ── Verify email ───────────────────────────────────────────────────────────
  fastify.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(verifyEmailSchema, request.body);
    await authService.verifyEmail(body.token);
    return reply.send({ message: 'Email vérifié. Tu peux maintenant te connecter.' });
  });

  // ── Resend verification ────────────────────────────────────────────────────
  fastify.post('/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(resendVerificationSchema, request.body);
    await authService.resendVerificationEmail(body.email);
    return reply.send({ message: 'Si ce compte existe et n\'est pas encore vérifié, un nouvel email a été envoyé.' });
  });

  // ── Login ──────────────────────────────────────────────────────────────────
  fastify.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(loginSchema, request.body) as LoginBody;
    const result = await authService.login(body.email, body.password, getIp(request));

    // 2FA required — return temp token (will be a short-lived JWT signed in service)
    if ('requires2FA' in result) {
      const tempToken = fastify.jwt.sign(
        { sub: result.tempToken, email: '', role: '', type: 'temp-2fa' },
        { expiresIn: '5m' },
      );
      return reply.send({ requires2FA: true, tempToken });
    }

    // Full login — issue access + refresh tokens
    const accessToken = fastify.jwt.sign(
      { sub: result.user.id, email: result.user.email, role: result.user.role, type: 'access' },
      { expiresIn: '15m' },
    );

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return reply.send({ accessToken, user: result.user });
  });

  // ── Refresh ────────────────────────────────────────────────────────────────
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawRefreshToken = (request.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (!rawRefreshToken) {
      return reply.status(401).send({ statusCode: 401, error: 'Non autorisé', message: 'Session introuvable.' });
    }

    const result = await authService.refreshTokens(rawRefreshToken);

    const accessToken = fastify.jwt.sign(
      { sub: result.user.id, email: result.user.email, role: result.user.role, type: 'access' },
      { expiresIn: '15m' },
    );

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return reply.send({ accessToken, user: result.user });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawRefreshToken = (request.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return reply.send({ message: 'Déconnecté.' });
  });

  // ── Forgot password ────────────────────────────────────────────────────────
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(forgotPasswordSchema, request.body);
    await authService.forgotPassword(body.email);
    return reply.send({ message: 'Si ce compte existe, un email de réinitialisation a été envoyé.' });
  });

  // ── Reset password ─────────────────────────────────────────────────────────
  fastify.post('/reset-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(resetPasswordSchema, request.body) as ResetPasswordBody;
    await authService.resetPassword(body.token, body.password, getIp(request));
    return reply.send({ message: 'Mot de passe réinitialisé. Tu peux te connecter.' });
  });

  // ── Verify 2FA ─────────────────────────────────────────────────────────────
  fastify.post('/2fa/verify', {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(verify2FASchema, request.body) as Verify2FABody;

    // Verify temp token
    let userId: string;
    try {
      const payload = fastify.jwt.verify<{ sub: string; type: string }>(body.tempToken);
      if (payload.type !== 'temp-2fa') throw new Error();
      userId = payload.sub;
    } catch {
      return reply.status(401).send({ statusCode: 401, error: 'Non autorisé', message: 'Token temporaire invalide ou expiré.' });
    }

    const result = await authService.verify2FA(userId, body.code, getIp(request));

    const accessToken = fastify.jwt.sign(
      { sub: result.user.id, email: result.user.email, role: result.user.role, type: 'access' },
      { expiresIn: '15m' },
    );

    reply.setCookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return reply.send({ accessToken, user: result.user });
  });

  // ── 2FA Setup — generate secret + QR code ─────────────────────────────────
  fastify.post('/2fa/setup', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.setup2FA(request.user.sub);
    return reply.send(result);
  });

  // ── 2FA Enable — confirm with first TOTP code ─────────────────────────────
  fastify.post('/2fa/enable', {
    preHandler: [authenticate],
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(enable2FASchema, request.body) as Enable2FABody;
    await authService.enable2FA(request.user.sub, body.code, getIp(request));
    return reply.send({ message: '2FA activée avec succès.' });
  });

  // ── 2FA Disable ────────────────────────────────────────────────────────────
  fastify.delete('/2fa/disable', {
    preHandler: [authenticate],
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = validate(disable2FASchema, request.body) as Disable2FABody;
    await authService.disable2FA(request.user.sub, body.password, getIp(request));
    return reply.send({ message: '2FA désactivée.' });
  });

  // ── Me (current user) ──────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const userId = request.user.sub;
    const user = await import('../../db/database.js').then(({ db }) =>
      db.selectFrom('users')
        .select(['id', 'email', 'pseudo', 'bio', 'avatar_path', 'email_verified', 'totp_enabled', 'role', 'created_at'])
        .where('id', '=', userId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst()
    );
    if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });
    return user;
  });
}
