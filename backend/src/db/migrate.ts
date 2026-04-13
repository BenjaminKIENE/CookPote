/**
 * Standalone migration runner — called by the deploy workflow.
 * Usage: node --import tsx/esm src/db/migrate.js
 */
import { db } from './database.js';
import { up as migration001 } from './migrations/001_initial_schema.js';
import { up as migration002 } from './migrations/002_fts5_indexes.js';

async function migrate() {
  console.log('Running migrations…');
  await migration001(db);
  console.log('✓ 001_initial_schema');
  try {
    await migration002(db);
    console.log('✓ 002_fts5_indexes');
  } catch {
    console.warn('⚠ 002_fts5_indexes skipped (FTS5 unavailable)');
  }
  console.log('Migrations done.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
