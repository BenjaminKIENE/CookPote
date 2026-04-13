import { describe, it, expect } from 'vitest';
import { TOTP, Secret } from 'otpauth';
import {
  generateTotpSecret,
  decryptTotpSecret,
  verifyTotpToken,
  getTotpUri,
} from '../../src/services/totp.service.js';

describe('TOTP service', () => {
  describe('generateTotpSecret', () => {
    it('returns secret, encryptedSecret, and iv', () => {
      const result = generateTotpSecret();
      expect(result.secret).toBeTruthy();
      expect(result.encryptedSecret).toBeTruthy();
      expect(result.iv).toBeTruthy();
    });

    it('secret is a valid base32 string', () => {
      const { secret } = generateTotpSecret();
      // Base32 alphabet: A-Z and 2-7
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('produces unique secrets each call', () => {
      const a = generateTotpSecret();
      const b = generateTotpSecret();
      expect(a.secret).not.toBe(b.secret);
    });
  });

  describe('decryptTotpSecret', () => {
    it('decrypts back to original secret', () => {
      const { secret, encryptedSecret, iv } = generateTotpSecret();
      const decrypted = decryptTotpSecret(encryptedSecret, iv);
      expect(decrypted).toBe(secret);
    });
  });

  describe('verifyTotpToken', () => {
    function makeValidCode(secret: string): string {
      const totp = new TOTP({
        issuer: 'Cookpote',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
      });
      return totp.generate();
    }

    it('accepts a valid TOTP code', () => {
      const { secret, encryptedSecret, iv } = generateTotpSecret();
      const code = makeValidCode(secret);
      expect(verifyTotpToken(encryptedSecret, iv, code)).toBe(true);
    });

    it('rejects an invalid code', () => {
      const { encryptedSecret, iv } = generateTotpSecret();
      expect(verifyTotpToken(encryptedSecret, iv, '000000')).toBe(false);
    });

    it('rejects a non-numeric code', () => {
      const { encryptedSecret, iv } = generateTotpSecret();
      expect(verifyTotpToken(encryptedSecret, iv, 'abcdef')).toBe(false);
    });
  });

  describe('getTotpUri', () => {
    it('returns an otpauth:// URI', () => {
      const { secret } = generateTotpSecret();
      const uri = getTotpUri(secret, 'user@example.com');
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
    });

    it('includes the issuer and account', () => {
      const { secret } = generateTotpSecret();
      const uri = getTotpUri(secret, 'test@cookpote.fr');
      expect(uri).toContain('Cookpote');
      expect(uri).toContain('cookpote.fr');
    });
  });
});
