import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../utils/crypto.js';

const ISSUER = 'Cookpote';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30;
const WINDOW = 1; // ±1 period tolerance for clock drift

// ── Secret generation ──────────────────────────────────────────────────────

export function generateTotpSecret(): { secret: string; encryptedSecret: string; iv: string } {
  const secret = new Secret({ size: 20 }); // 160-bit secret (RFC 4226 recommendation)
  const base32Secret = secret.base32;

  const { ciphertext, iv } = encrypt(base32Secret);
  return { secret: base32Secret, encryptedSecret: ciphertext, iv };
}

export function decryptTotpSecret(encryptedSecret: string, iv: string): string {
  return decrypt({ ciphertext: encryptedSecret, iv });
}

// ── Verification ───────────────────────────────────────────────────────────

export function verifyTotpToken(encryptedSecret: string, iv: string, token: string): boolean {
  const base32Secret = decryptTotpSecret(encryptedSecret, iv);

  const totp = new TOTP({
    issuer: ISSUER,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(base32Secret),
  });

  const delta = totp.validate({ token, window: WINDOW });
  return delta !== null;
}

// ── QR Code URI ────────────────────────────────────────────────────────────

export function getTotpUri(base32Secret: string, userEmail: string): string {
  const totp = new TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(base32Secret),
  });
  return totp.toString(); // otpauth:// URI
}

export async function getTotpQrCodeDataUrl(base32Secret: string, userEmail: string): Promise<string> {
  const uri = getTotpUri(base32Secret, userEmail);
  return QRCode.toDataURL(uri);
}
