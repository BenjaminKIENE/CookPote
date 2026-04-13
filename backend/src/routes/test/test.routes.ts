/**
 * Test-only routes — only registered when NODE_ENV !== 'production'.
 * Exposes last sent email tokens so E2E tests can retrieve them without real SMTP.
 */
import type { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';
import { _testTokenStore } from '../../services/email.service.js';
import { env } from '../../config/env.js';
import { sqlite } from '../../db/database.js';

export async function testRoutes(fastify: FastifyInstance) {
  fastify.get('/last-verification-token', async (_req, reply) => {
    return reply.send({ token: _testTokenStore.lastVerificationToken });
  });

  fastify.get('/last-reset-token', async (_req, reply) => {
    return reply.send({ token: _testTokenStore.lastResetToken });
  });

  fastify.post('/reset-token-store', async (_req, reply) => {
    _testTokenStore.lastVerificationToken = null;
    _testTokenStore.lastResetToken = null;
    return reply.send({ ok: true });
  });

  /** Wipe all user data — for E2E test isolation */
  fastify.post('/clear-db', async (_req, reply) => {
    sqlite.exec('PRAGMA foreign_keys = OFF');
    for (const t of [
      'ai_usage_log', 'usage_quotas', 'audit_log',
      'recipe_ingredients', 'recipes',
      'refresh_tokens', 'password_reset_tokens', 'email_verification_tokens',
      'users',
    ]) {
      sqlite.prepare(`DELETE FROM ${t}`).run();
    }
    sqlite.exec('PRAGMA foreign_keys = ON');
    _testTokenStore.lastVerificationToken = null;
    _testTokenStore.lastResetToken = null;
    return reply.send({ ok: true });
  });

  /** Verify SMTP connectivity */
  fastify.get('/smtp-check', async (_req, reply) => {
    const t = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      authMethod: 'LOGIN',
    } as Parameters<typeof nodemailer.createTransport>[0]);

    try {
      await t.verify();
      return reply.send({ ok: true, message: 'SMTP connection successful' });
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; responseCode?: number };
      return reply.status(200).send({
        ok: false,
        error: e.message,
        code: e.code,
        responseCode: e.responseCode,
        config: { host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, user: env.SMTP_USER },
      });
    }
  });
}
