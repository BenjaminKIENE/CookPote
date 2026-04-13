import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { db } from './db/database.js';

async function runMigrationsIfNeeded() {
  if (env.NODE_ENV === 'production') return; // Production: run migrations manually
  try {
    const { up: migration001 } = await import('./db/migrations/001_initial_schema.js');
    await migration001(db);
    try {
      const { up: migration002 } = await import('./db/migrations/002_fts5_indexes.js');
      await migration002(db);
    } catch { /* FTS5 optional */ }
  } catch {
    // Migrations may already exist (idempotent DDL in SQLite — CREATE TABLE IF NOT EXISTS)
  }
}

async function start() {
  try {
    await runMigrationsIfNeeded();
    const app = await buildApp();
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`🍲 Cookpote backend running on ${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();

export { buildApp };
