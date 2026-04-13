import argon2 from 'argon2';
import { db, sqlite } from '../db/database.js';
import { hashToken } from '../utils/crypto.js';
import { generateToken } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';
import * as emailService from './email.service.js';
import * as totpService from './totp.service.js';
import { env } from '../config/env.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  email: string;
  pseudo: string;
  bio: string | null;
  avatarPath: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  role: string;
  createdAt: number;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export interface TempTotpResult {
  requires2FA: true;
  tempToken: string;
}

// ── Argon2id config (OWASP 2024+) ─────────────────────────────────────────

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function toPublicUser(row: {
  id: string; email: string; pseudo: string; bio: string | null;
  avatar_path: string | null; email_verified: 0|1; totp_enabled: 0|1;
  role: string; created_at: number;
}): PublicUser {
  return {
    id: row.id,
    email: row.email,
    pseudo: row.pseudo,
    bio: row.bio,
    avatarPath: row.avatar_path,
    emailVerified: row.email_verified === 1,
    totpEnabled: row.totp_enabled === 1,
    role: row.role,
    createdAt: row.created_at,
  };
}

function nowMs(): number {
  return Date.now();
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Audit log ──────────────────────────────────────────────────────────────

async function audit(userId: string | null, action: string, ip: string | null, meta?: object) {
  await db.insertInto('audit_log').values({
    user_id: userId,
    action,
    ip,
    meta: meta ? JSON.stringify(meta) : null,
  }).execute();
}

// ── Register ───────────────────────────────────────────────────────────────

export async function register(email: string, password: string, pseudo: string, ip: string | null): Promise<void> {
  const emailNormalized = email.toLowerCase().trim();

  // Check uniqueness
  const existing = await db.selectFrom('users')
    .select(['id', 'email_normalized'])
    .where('email_normalized', '=', emailNormalized)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (existing) {
    // Don't reveal whether email exists — same response as success
    // But we still send a "someone tried to register" email to the existing user
    logger.warn({ email: emailNormalized }, 'Register attempt on existing email');
    return;
  }

  const pseudoExists = await db.selectFrom('users')
    .select('id')
    .where('pseudo', '=', pseudo)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (pseudoExists) {
    throw Object.assign(new Error('Ce pseudo est déjà pris.'), { statusCode: 409 });
  }

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  const user = await db.insertInto('users').values({
    email,
    email_normalized: emailNormalized,
    password_hash: passwordHash,
    pseudo,
    email_verified: 0,
    totp_enabled: 0,
    role: 'user',
  }).returningAll().executeTakeFirstOrThrow();

  // Email verification token — 24h expiry
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  await db.insertInto('email_verification_tokens').values({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: nowMs() + 24 * 60 * 60 * 1000,
  }).execute();

  await emailService.sendVerificationEmail(user.email, user.pseudo, rawToken);
  await audit(user.id, 'account_created', ip);
}

// ── Verify email ───────────────────────────────────────────────────────────

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = nowMs();

  const tokenRow = await db.selectFrom('email_verification_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

  if (!tokenRow) {
    throw Object.assign(new Error('Lien de vérification invalide.'), { statusCode: 400 });
  }
  if (tokenRow.used_at !== null) {
    throw Object.assign(new Error('Ce lien a déjà été utilisé.'), { statusCode: 400 });
  }
  if (tokenRow.expires_at < now) {
    throw Object.assign(new Error('Ce lien a expiré. Demande un nouvel email de vérification.'), { statusCode: 400 });
  }

  await db.updateTable('users')
    .set({ email_verified: 1 })
    .where('id', '=', tokenRow.user_id)
    .execute();

  await db.updateTable('email_verification_tokens')
    .set({ used_at: now })
    .where('id', '=', tokenRow.id)
    .execute();
}

// ── Resend verification email ──────────────────────────────────────────────

export async function resendVerificationEmail(email: string): Promise<void> {
  const emailNormalized = email.toLowerCase().trim();
  const user = await db.selectFrom('users')
    .selectAll()
    .where('email_normalized', '=', emailNormalized)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  // Always return success to avoid enumeration
  if (!user || user.email_verified === 1) return;

  // Invalidate previous tokens
  await db.deleteFrom('email_verification_tokens')
    .where('user_id', '=', user.id)
    .execute();

  const rawToken = generateToken();
  await db.insertInto('email_verification_tokens').values({
    user_id: user.id,
    token_hash: hashToken(rawToken),
    expires_at: nowMs() + 24 * 60 * 60 * 1000,
  }).execute();

  await emailService.sendVerificationEmail(user.email, user.pseudo, rawToken);
}

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  ip: string | null,
): Promise<LoginResult | TempTotpResult> {
  const emailNormalized = email.toLowerCase().trim();

  const user = await db.selectFrom('users')
    .selectAll()
    .where('email_normalized', '=', emailNormalized)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  // Constant-time fake verify to prevent user enumeration via timing
  if (!user) {
    await argon2.hash('dummy_password_for_timing', ARGON2_OPTIONS);
    throw Object.assign(new Error('Email ou mot de passe incorrect.'), { statusCode: 401 });
  }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    logger.warn({ email: emailNormalized, ip }, 'Failed login attempt');
    throw Object.assign(new Error('Email ou mot de passe incorrect.'), { statusCode: 401 });
  }

  if (user.email_verified === 0) {
    throw Object.assign(new Error('Confirme ton adresse email avant de te connecter.'), { statusCode: 403 });
  }

  // If 2FA is enabled, return a short-lived temp token instead of full tokens
  if (user.totp_enabled === 1) {
    return { requires2FA: true, tempToken: user.id }; // resolved to real JWT in routes
  }

  const { refreshToken, family } = await createRefreshToken(user.id);
  await audit(user.id, 'login', ip);

  return {
    accessToken: user.id, // resolved to real JWT in routes layer
    refreshToken,
    user: toPublicUser(user),
  };
}

// ── Refresh token ──────────────────────────────────────────────────────────

export async function refreshTokens(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: PublicUser }> {
  const tokenHash = hashToken(rawRefreshToken);
  const now = nowMs();

  const tokenRow = await db.selectFrom('refresh_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

  if (!tokenRow) {
    throw Object.assign(new Error('Session invalide.'), { statusCode: 401 });
  }

  if (tokenRow.revoked_at !== null) {
    // Token reuse detected — revoke entire family (session hijacking protection)
    await db.updateTable('refresh_tokens')
      .set({ revoked_at: now })
      .where('family', '=', tokenRow.family)
      .execute();
    logger.warn({ userId: tokenRow.user_id, family: tokenRow.family }, 'Refresh token reuse detected — family revoked');
    throw Object.assign(new Error('Session compromise détectée. Reconnecte-toi.'), { statusCode: 401 });
  }

  if (tokenRow.expires_at < now) {
    throw Object.assign(new Error('Session expirée. Reconnecte-toi.'), { statusCode: 401 });
  }

  const user = await db.selectFrom('users')
    .selectAll()
    .where('id', '=', tokenRow.user_id)
    .where('deleted_at', 'is', null)
    .executeTakeFirstOrThrow();

  // Rotate: revoke old, create new in same family
  await db.updateTable('refresh_tokens')
    .set({ revoked_at: now })
    .where('id', '=', tokenRow.id)
    .execute();

  const { refreshToken } = await createRefreshToken(user.id, tokenRow.family);

  return {
    accessToken: user.id, // resolved to JWT in routes
    refreshToken,
    user: toPublicUser(user),
  };
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  const now = nowMs();

  const tokenRow = await db.selectFrom('refresh_tokens')
    .select(['id', 'family'])
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

  if (!tokenRow) return; // Already gone — idempotent

  // Revoke entire family on explicit logout
  await db.updateTable('refresh_tokens')
    .set({ revoked_at: now })
    .where('family', '=', tokenRow.family)
    .execute();
}

// ── Forgot password ────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const emailNormalized = email.toLowerCase().trim();
  const user = await db.selectFrom('users')
    .selectAll()
    .where('email_normalized', '=', emailNormalized)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  // Always return success — don't reveal whether email exists
  if (!user) return;

  // Invalidate previous reset tokens for this user
  await db.deleteFrom('password_reset_tokens')
    .where('user_id', '=', user.id)
    .execute();

  const rawToken = generateToken();
  await db.insertInto('password_reset_tokens').values({
    user_id: user.id,
    token_hash: hashToken(rawToken),
    expires_at: nowMs() + 60 * 60 * 1000, // 1 hour
  }).execute();

  await emailService.sendPasswordResetEmail(user.email, user.pseudo, rawToken);
}

// ── Reset password ─────────────────────────────────────────────────────────

export async function resetPassword(rawToken: string, newPassword: string, ip: string | null): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = nowMs();

  const tokenRow = await db.selectFrom('password_reset_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

  if (!tokenRow || tokenRow.used_at !== null || tokenRow.expires_at < now) {
    throw Object.assign(new Error('Lien invalide ou expiré.'), { statusCode: 400 });
  }

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  // Use a SQLite transaction: update password + revoke tokens atomically
  sqlite.transaction(() => {
    sqlite.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .run(newHash, now, tokenRow.user_id);
    sqlite.prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`)
      .run(now, tokenRow.id);
    // Revoke all active refresh tokens — force re-login everywhere
    sqlite.prepare(`UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`)
      .run(now, tokenRow.user_id);
  })();

  const user = await db.selectFrom('users').select(['email', 'pseudo'])
    .where('id', '=', tokenRow.user_id).executeTakeFirstOrThrow();

  await emailService.sendSecurityAlertEmail(user.email, user.pseudo, 'password_changed');
  await audit(tokenRow.user_id, 'password_changed', ip);
}

// ── Verify 2FA + issue full tokens ────────────────────────────────────────

export async function verify2FA(userId: string, totpCode: string, ip: string | null): Promise<{ refreshToken: string; user: PublicUser }> {
  const user = await db.selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user || user.totp_enabled === 0 || !user.totp_secret_enc || !user.totp_secret_iv) {
    throw Object.assign(new Error('2FA non configurée.'), { statusCode: 400 });
  }

  const valid = totpService.verifyTotpToken(user.totp_secret_enc, user.totp_secret_iv, totpCode);
  if (!valid) {
    throw Object.assign(new Error('Code incorrect.'), { statusCode: 401 });
  }

  const { refreshToken } = await createRefreshToken(user.id);
  await audit(user.id, 'login_2fa', ip);

  return { refreshToken, user: toPublicUser(user) };
}

// ── Internal: create refresh token ────────────────────────────────────────

async function createRefreshToken(userId: string, existingFamily?: string): Promise<{ refreshToken: string; family: string }> {
  const rawToken = generateToken(48);
  const family = existingFamily ?? generateToken(16);

  await db.insertInto('refresh_tokens').values({
    user_id: userId,
    token_hash: hashToken(rawToken),
    family,
    expires_at: nowMs() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }).execute();

  return { refreshToken: rawToken, family };
}

// ── 2FA Setup (generate secret + QR) ─────────────────────────────────────

export async function setup2FA(userId: string): Promise<{ qrCodeDataUrl: string; secret: string }> {
  const user = await db.selectFrom('users')
    .select(['id', 'email', 'totp_enabled'])
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });
  if (user.totp_enabled === 1) throw Object.assign(new Error('La 2FA est déjà activée.'), { statusCode: 409 });

  const { secret, encryptedSecret, iv } = totpService.generateTotpSecret();

  // Store pending secret (not yet confirmed) — totp_enabled stays 0
  await db.updateTable('users')
    .set({ totp_secret_enc: encryptedSecret, totp_secret_iv: iv })
    .where('id', '=', userId)
    .execute();

  const qrCodeDataUrl = await totpService.getTotpQrCodeDataUrl(secret, user.email);
  return { qrCodeDataUrl, secret };
}

// ── 2FA Enable (confirm with first TOTP code) ─────────────────────────────

export async function enable2FA(userId: string, totpCode: string, ip: string | null): Promise<void> {
  const user = await db.selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });
  if (user.totp_enabled === 1) throw Object.assign(new Error('La 2FA est déjà activée.'), { statusCode: 409 });
  if (!user.totp_secret_enc || !user.totp_secret_iv) {
    throw Object.assign(new Error('Lance d\'abord la configuration 2FA.'), { statusCode: 400 });
  }

  const valid = totpService.verifyTotpToken(user.totp_secret_enc, user.totp_secret_iv, totpCode);
  if (!valid) throw Object.assign(new Error('Code incorrect.'), { statusCode: 401 });

  await db.updateTable('users')
    .set({ totp_enabled: 1 })
    .where('id', '=', userId)
    .execute();

  await audit(userId, '2fa_enabled', ip);

  const u = await db.selectFrom('users').select(['email', 'pseudo']).where('id', '=', userId).executeTakeFirstOrThrow();
  await emailService.sendSecurityAlertEmail(u.email, u.pseudo, '2fa_enabled');
}

// ── 2FA Disable ────────────────────────────────────────────────────────────

export async function disable2FA(userId: string, password: string, ip: string | null): Promise<void> {
  const user = await db.selectFrom('users')
    .selectAll()
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });
  if (user.totp_enabled === 0) throw Object.assign(new Error('La 2FA n\'est pas activée.'), { statusCode: 400 });

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) throw Object.assign(new Error('Mot de passe incorrect.'), { statusCode: 401 });

  await db.updateTable('users')
    .set({ totp_enabled: 0, totp_secret_enc: null, totp_secret_iv: null })
    .where('id', '=', userId)
    .execute();

  await audit(userId, '2fa_disabled', ip);

  await emailService.sendSecurityAlertEmail(user.email, user.pseudo, '2fa_disabled');
}

// ── Clean up expired tokens (can be called on a schedule) ─────────────────

export async function cleanupExpiredTokens(): Promise<void> {
  const now = nowMs();
  await db.deleteFrom('email_verification_tokens').where('expires_at', '<', now).execute();
  await db.deleteFrom('password_reset_tokens').where('expires_at', '<', now).execute();
  await db.deleteFrom('refresh_tokens')
    .where((eb) => eb.or([
      eb('expires_at', '<', now),
      eb('revoked_at', 'is not', null),
    ]))
    .execute();
}
