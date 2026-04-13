import argon2 from 'argon2';
import { db, sqlite } from '../db/database.js';
import { processAndSaveRecipeImage, deleteRecipeImage } from './image.service.js';
import { generateToken } from '../utils/tokens.js';
import { hashToken } from '../utils/crypto.js';
import * as emailService from './email.service.js';
import type { Selectable } from 'kysely';
import type { UsersTable } from '../db/types.js';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export type PublicProfile = Pick<Selectable<UsersTable>, 'id' | 'pseudo' | 'bio' | 'avatar_path' | 'created_at'> & {
  recipe_count: number;
};

export type PrivateProfile = PublicProfile & Pick<Selectable<UsersTable>, 'email' | 'email_verified' | 'totp_enabled' | 'role'>;

// ── Get own profile ────────────────────────────────────────────────────────

export async function getMyProfile(userId: string): Promise<PrivateProfile | null> {
  const row = sqlite.prepare(`
    SELECT u.id, u.email, u.pseudo, u.bio, u.avatar_path, u.email_verified,
           u.totp_enabled, u.role, u.created_at,
           COUNT(r.id) AS recipe_count
    FROM users u
    LEFT JOIN recipes r ON r.user_id = u.id AND r.deleted_at IS NULL
    WHERE u.id = ? AND u.deleted_at IS NULL
    GROUP BY u.id
  `).get(userId) as (PrivateProfile) | undefined;

  return row ?? null;
}

// ── Update profile ─────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  pseudo?: string;
  bio?: string;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PrivateProfile> {
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [Date.now()];

  if (input.pseudo !== undefined) { updates.push('pseudo = ?'); values.push(input.pseudo); }
  if (input.bio !== undefined) { updates.push('bio = ?'); values.push(input.bio || null); }

  sqlite.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, userId);

  return (await getMyProfile(userId))!;
}

// ── Update avatar ──────────────────────────────────────────────────────────

export async function updateAvatar(userId: string, imageBuffer: Buffer): Promise<PrivateProfile> {
  const existing = await getMyProfile(userId);
  if (!existing) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });

  const filename = await processAndSaveRecipeImage(imageBuffer);

  await db.updateTable('users')
    .set({ avatar_path: filename, updated_at: Date.now() })
    .where('id', '=', userId)
    .execute();

  // Delete old avatar
  if (existing.avatar_path) await deleteRecipeImage(existing.avatar_path);

  return (await getMyProfile(userId))!;
}

// ── Export GDPR data ───────────────────────────────────────────────────────

export async function exportUserData(userId: string): Promise<object> {
  const user = sqlite.prepare(`SELECT id, email, pseudo, bio, created_at FROM users WHERE id = ?`).get(userId);
  const recipes = sqlite.prepare(`SELECT * FROM recipes WHERE user_id = ? AND deleted_at IS NULL`).all(userId);
  return { user, recipes, exportedAt: new Date().toISOString() };
}

// ── Change password ────────────────────────────────────────────────────────

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await db.selectFrom('users')
    .select(['id', 'email', 'pseudo', 'password_hash'])
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });

  const valid = await argon2.verify(user.password_hash, currentPassword);
  if (!valid) throw Object.assign(new Error('Mot de passe actuel incorrect.'), { statusCode: 401 });

  const newHash = await argon2.hash(newPassword, ARGON2_OPTIONS);
  const now = Date.now();

  sqlite.transaction(() => {
    sqlite.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(newHash, now, userId);
    // Revoke all refresh tokens — force re-login on other devices
    sqlite.prepare(`UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).run(now, userId);
  })();

  await emailService.sendSecurityAlertEmail(user.email, user.pseudo, 'password_changed');
}

// ── Request email change ────────────────────────────────────────────────────

export async function requestEmailChange(userId: string, newEmail: string, password: string): Promise<void> {
  const newEmailNormalized = newEmail.toLowerCase().trim();

  const user = await db.selectFrom('users')
    .select(['id', 'email', 'pseudo', 'password_hash'])
    .where('id', '=', userId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (!user) throw Object.assign(new Error('Utilisateur introuvable.'), { statusCode: 404 });

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) throw Object.assign(new Error('Mot de passe incorrect.'), { statusCode: 401 });

  // Check new email not already taken
  const existing = await db.selectFrom('users')
    .select('id')
    .where('email_normalized', '=', newEmailNormalized)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();

  if (existing && existing.id !== userId) {
    throw Object.assign(new Error('Cet email est déjà utilisé.'), { statusCode: 409 });
  }

  // Invalidate previous pending email change tokens
  await db.deleteFrom('email_verification_tokens')
    .where('user_id', '=', userId)
    .execute();

  const rawToken = generateToken();
  await db.insertInto('email_verification_tokens').values({
    user_id: userId,
    token_hash: hashToken(rawToken),
    expires_at: Date.now() + 24 * 60 * 60 * 1000,
    // Store new email in token meta — we'll encode it in the token itself
  }).execute();

  // Send confirmation to the NEW email address
  const url = `${process.env['APP_URL'] ?? 'http://localhost:4200'}/verify-email?token=${rawToken}&newEmail=${encodeURIComponent(newEmail)}`;
  await emailService.sendVerificationEmail(newEmail, user.pseudo, rawToken);
}

// ── Confirm email change ────────────────────────────────────────────────────

export async function confirmEmailChange(userId: string, rawToken: string, newEmail: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  const tokenRow = await db.selectFrom('email_verification_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!tokenRow || tokenRow.used_at !== null || tokenRow.expires_at < now) {
    throw Object.assign(new Error('Lien invalide ou expiré.'), { statusCode: 400 });
  }

  const newEmailNormalized = newEmail.toLowerCase().trim();

  sqlite.transaction(() => {
    sqlite.prepare(`UPDATE users SET email = ?, email_normalized = ?, updated_at = ? WHERE id = ?`)
      .run(newEmail, newEmailNormalized, now, userId);
    sqlite.prepare(`UPDATE email_verification_tokens SET used_at = ? WHERE id = ?`).run(now, tokenRow.id);
  })();
}

// ── Delete account (cascade) ───────────────────────────────────────────────

export async function deleteAccount(userId: string): Promise<void> {
  await db.updateTable('users')
    .set({ deleted_at: Date.now() })
    .where('id', '=', userId)
    .execute();

  // Soft-delete recipes
  await db.updateTable('recipes')
    .set({ deleted_at: Date.now() })
    .where('user_id', '=', userId)
    .execute();

  // Revoke all refresh tokens
  await db.updateTable('refresh_tokens')
    .set({ revoked_at: Date.now() })
    .where('user_id', '=', userId)
    .execute();
}
