import { describe, it, expect } from 'vitest';
import { generateToken } from '../../src/utils/tokens.js';

describe('generateToken', () => {
  it('returns a non-empty string', () => {
    expect(generateToken()).toBeTruthy();
  });

  it('returns a base64url string (no +, /, = characters)', () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('default length is ~43 chars (32 bytes base64url)', () => {
    // 32 bytes → ceil(32 * 4/3) without padding ≈ 43 chars
    const token = generateToken();
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(token.length).toBeLessThanOrEqual(44);
  });

  it('custom byte length produces proportionally longer token', () => {
    const short = generateToken(16);
    const long  = generateToken(48);
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('each call produces a unique token', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });
});
