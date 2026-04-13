import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, hashToken } from '../../src/utils/crypto.js';

describe('crypto utils', () => {
  describe('encrypt / decrypt', () => {
    it('round-trips a plaintext string correctly', () => {
      const original = 'JBSWY3DPEHPK3PXP'; // typical TOTP base32 secret
      const payload = encrypt(original);

      expect(payload.ciphertext).toBeTruthy();
      expect(payload.iv).toBeTruthy();
      expect(payload.ciphertext).not.toBe(original);

      const decrypted = decrypt(payload);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext each call (random IV)', () => {
      const plaintext = 'same-plaintext';
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      expect(a.iv).not.toBe(b.iv);
      expect(a.ciphertext).not.toBe(b.ciphertext);
      expect(decrypt(a)).toBe(plaintext);
      expect(decrypt(b)).toBe(plaintext);
    });

    it('handles empty string', () => {
      const payload = encrypt('');
      expect(decrypt(payload)).toBe('');
    });

    it('handles unicode characters', () => {
      const original = 'Recette façon grand-mère — émojis 🍲';
      const payload = encrypt(original);
      expect(decrypt(payload)).toBe(original);
    });

    it('throws on tampered ciphertext', () => {
      const payload = encrypt('secret');
      const tampered = { ...payload, ciphertext: Buffer.from('bad-data').toString('base64') };
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('hashToken', () => {
    it('produces a 64-char hex string (SHA-256)', () => {
      const hash = hashToken('my-token');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('is deterministic', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });
});
