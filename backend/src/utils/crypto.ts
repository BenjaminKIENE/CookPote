import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * AES-256-GCM encryption for sensitive data at rest (TOTP secrets).
 * The master key is loaded from ENCRYPTION_KEY env var (base64-encoded 32 bytes).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'base64');
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export function encrypt(plaintext: string): EncryptedPayload {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Append auth tag to ciphertext for storage
  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decrypt(payload: EncryptedPayload): string {
  const key = getMasterKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const data = Buffer.from(payload.ciphertext, 'base64');

  // Split ciphertext and auth tag
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(0, data.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Hash a token for storage (one-way).
 * Used for: email verification tokens, reset password tokens, refresh tokens.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
