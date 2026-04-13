/**
 * Vitest global setup — inject test environment variables before any module loads.
 * Must run before env.ts is imported (setupFiles runs before test files).
 */

// ── Minimal env for tests ──────────────────────────────────────────────────
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_PATH'] = ':memory:';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-that-is-at-least-32-chars!';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-that-is-at-least-32-chars!';
process.env['ENCRYPTION_KEY'] = Buffer.from('01234567890123456789012345678901').toString('base64'); // 32 bytes
process.env['CSRF_SECRET'] = 'test-csrf-secret-that-is-at-least-32-characters!';
process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-key-placeholder-not-used-in-unit-tests';
process.env['SMTP_HOST'] = 'smtp.test.local';
process.env['SMTP_PORT'] = '465';
process.env['SMTP_SECURE'] = 'true';
process.env['SMTP_USER'] = 'test@cookpote.fr';
process.env['SMTP_PASS'] = 'test-smtp-pass';
process.env['SMTP_FROM'] = '"Cookpote Test" <test@cookpote.fr>';
process.env['UPLOADS_PATH'] = '/tmp/cookpote-test-uploads';
process.env['APP_URL'] = 'http://localhost:4200';
process.env['API_URL'] = 'http://localhost:3000';
