/**
 * Test DB helper — runs migrations on the in-memory SQLite database.
 * Call once before auth/service integration tests.
 */
import { db, sqlite } from '../../src/db/database.js';
import { up as migration001 } from '../../src/db/migrations/001_initial_schema.js';

let migrated = false;

export async function runMigrations(): Promise<void> {
  if (migrated) return;
  await migration001(db);
  // 002 (FTS5) may fail in some minimal SQLite builds — skip if FTS5 unavailable
  try {
    const { up: migration002 } = await import('../../src/db/migrations/002_fts5_indexes.js');
    await migration002(db);
  } catch {
    // FTS5 optional for tests
  }
  migrated = true;
}

export async function clearTables(): Promise<void> {
  // Order respects FK constraints
  sqlite.prepare('DELETE FROM ai_usage_log').run();
  sqlite.prepare('DELETE FROM usage_quotas').run();
  sqlite.prepare('DELETE FROM audit_log').run();
  sqlite.prepare('DELETE FROM recipe_ingredients').run();
  sqlite.prepare('DELETE FROM recipes').run();
  sqlite.prepare('DELETE FROM refresh_tokens').run();
  sqlite.prepare('DELETE FROM password_reset_tokens').run();
  sqlite.prepare('DELETE FROM email_verification_tokens').run();
  sqlite.prepare('DELETE FROM ingredients_reference').run();
  sqlite.prepare('DELETE FROM users').run();
}
