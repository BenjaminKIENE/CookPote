import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { runMigrations, clearTables } from '../helpers/db.js';

// ── Mock email service — must be declared before any import that uses it ──
vi.mock('../../src/services/email.service.js', () => ({
  sendVerificationEmail:  vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendSecurityAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Import app AFTER mocks are hoisted ────────────────────────────────────
import { buildApp } from '../../src/app.js';
import * as emailService from '../../src/services/email.service.js';

const REGISTER_PAYLOAD = {
  email: 'alice@example.com',
  pseudo: 'alice',
  password: 'Passw0rd!',
};

describe('Auth flows — integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await runMigrations();
    app = await buildApp();
    // Expose server errors in test output
    app.addHook('onError', async (_req, _reply, error) => {
      console.error('[TEST] Server error:', error.message, '\n', error.stack);
    });
    await app.ready();
  });

  beforeEach(async () => {
    await clearTables();
    vi.clearAllMocks();
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function register(payload = REGISTER_PAYLOAD) {
    return app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload,
    });
  }

  async function getVerifyToken(): Promise<string> {
    const calls = (emailService.sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    return lastCall[2] as string;
  }

  async function verifyEmail(token: string) {
    return app.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { token },
    });
  }

  async function registerAndVerify(payload = REGISTER_PAYLOAD) {
    await register(payload);
    const token = await getVerifyToken();
    await verifyEmail(token);
  }

  async function login(email = REGISTER_PAYLOAD.email, password = REGISTER_PAYLOAD.password) {
    return app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });
  }

  function extractRefreshCookie(res: Awaited<ReturnType<typeof app.inject>>): string {
    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : String(cookies ?? '');
    const found = cookieStr.split(';').find(c => c.trim().startsWith('refresh_token='));
    if (!found) throw new Error('No refresh_token cookie found');
    return found.trim();
  }

  // ── Register ────────────────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('creates a user and sends verification email', async () => {
      const res = await register();
      if (res.statusCode !== 201) console.error('register 500 body:', res.body);
      expect(res.statusCode).toBe(201);
      expect(res.json().message).toContain('Vérifie tes emails');
      expect(emailService.sendVerificationEmail).toHaveBeenCalledOnce();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        REGISTER_PAYLOAD.email,
        REGISTER_PAYLOAD.pseudo,
        expect.any(String),
      );
    });

    it('returns 201 even for duplicate email (silent — anti-enumeration)', async () => {
      await register();
      const res2 = await register();
      expect(res2.statusCode).toBe(201);
    });

    it('returns 409 when pseudo is already taken', async () => {
      await register();
      const res = await register({ ...REGISTER_PAYLOAD, email: 'other@example.com' });
      expect(res.statusCode).toBe(409);
    });

    it('returns 400 for invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'not-an-email', password: 'short', pseudo: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Login before email verification ─────────────────────────────────────
  describe('POST /api/auth/login — unverified account', () => {
    it('returns 403 when email not verified', async () => {
      await register();
      const res = await login();
      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain('email');
    });
  });

  // ── Full flow ────────────────────────────────────────────────────────────
  describe('full auth flow', () => {
    it('verify-email returns 200 and marks email as verified', async () => {
      await register();
      const token = await getVerifyToken();
      const res = await verifyEmail(token);
      expect(res.statusCode).toBe(200);
      expect(res.json().message).toContain('vérifié');
    });

    it('verify-email returns 400 on replay (token already used)', async () => {
      await register();
      const token = await getVerifyToken();
      await verifyEmail(token);
      const replay = await verifyEmail(token);
      expect(replay.statusCode).toBe(400);
    });

    it('login returns accessToken + sets refresh cookie after verification', async () => {
      await registerAndVerify();
      const res = await login();
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.accessToken).toBeTruthy();
      expect(body.user.email).toBe(REGISTER_PAYLOAD.email);
      expect(String(res.headers['set-cookie'] ?? '')).toContain('refresh_token');
    });

    it('login returns 401 for wrong password', async () => {
      await registerAndVerify();
      const res = await login(REGISTER_PAYLOAD.email, 'WrongPass1!');
      expect(res.statusCode).toBe(401);
    });

    it('/api/auth/refresh returns new accessToken when valid cookie present', async () => {
      await registerAndVerify();
      const loginRes = await login();
      const cookie = extractRefreshCookie(loginRes);

      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: { cookie },
      });

      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.json().accessToken).toBeTruthy();
    });

    it('/api/auth/logout clears session — refresh fails after', async () => {
      await registerAndVerify();
      const loginRes = await login();
      const cookie = extractRefreshCookie(loginRes);

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { cookie },
      });
      expect(logoutRes.statusCode).toBe(200);

      const afterLogout = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: { cookie },
      });
      expect(afterLogout.statusCode).toBe(401);
    });
  });

  // ── Forgot / reset password ───────────────────────────────────────────
  describe('forgot / reset password', () => {
    it('forgot-password always returns 200 (anti-enumeration)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'notexist@example.com' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('reset-password allows login with new password', async () => {
      await registerAndVerify();
      vi.clearAllMocks();

      await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: REGISTER_PAYLOAD.email },
      });

      const resetCalls = (emailService.sendPasswordResetEmail as ReturnType<typeof vi.fn>).mock.calls;
      const resetToken = resetCalls[0][2] as string;

      const resetRes = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: resetToken, password: 'NewPass1word!' },
      });
      expect(resetRes.statusCode).toBe(200);

      expect((await login()).statusCode).toBe(401); // old password fails
      expect((await login(REGISTER_PAYLOAD.email, 'NewPass1word!')).statusCode).toBe(200);
    });

    it('reset-password rejects replay of same token', async () => {
      await registerAndVerify();
      vi.clearAllMocks();

      await app.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: REGISTER_PAYLOAD.email },
      });

      const resetToken = (emailService.sendPasswordResetEmail as ReturnType<typeof vi.fn>).mock.calls[0][2];

      await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: resetToken, password: 'NewPass1word!' },
      });

      const replay = await app.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: { token: resetToken, password: 'AnotherPass2!' },
      });
      expect(replay.statusCode).toBe(400);
    });
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns user info when authenticated', async () => {
      await registerAndVerify();
      const { accessToken } = (await login()).json();

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(meRes.statusCode).toBe(200);
      expect(meRes.json().email).toBe(REGISTER_PAYLOAD.email);
    });
  });
});
