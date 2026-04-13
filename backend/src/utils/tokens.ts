import { randomBytes } from 'node:crypto';

/**
 * Generate a cryptographically secure random token.
 * @param byteLength Number of random bytes (default 32 → 43 chars base64url)
 * @returns base64url-encoded token (URL-safe, no padding)
 */
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Generate a UUID v4-like ID using randomBytes.
 * We use hex(randomblob(16)) in SQLite by default, but this is useful
 * for generating IDs in application code (e.g., filename UUIDs).
 */
export function generateId(): string {
  const bytes = randomBytes(16);
  return bytes.toString('hex');
}
