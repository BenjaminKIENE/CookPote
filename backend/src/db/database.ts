import { DatabaseSync } from 'node:sqlite';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'node:path';
import fs from 'node:fs';
import { env } from '../config/env.js';
import type { DB } from './types.js';

/**
 * Normalise les arguments pour node:sqlite.
 * - Kysely appelle stmt.all(array) : un seul arg tableau  → on le spread
 * - Le code service appelle stmt.run(a, b, c) : variadic  → on laisse tel quel
 * SQLite n'accepte que des scalaires en paramètre, jamais des tableaux,
 * donc la heuristique "premier et unique arg est un tableau" est sans ambiguïté.
 */
function resolveParams(args: unknown[]): unknown[] {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
}

function adaptStatement(raw: DatabaseSync, sql: string) {
  const trimmed = sql.trimStart().toUpperCase();
  // Treat as reader if it's a SELECT/WITH, OR if it uses RETURNING (INSERT/UPDATE/DELETE ... RETURNING)
  const reader = trimmed.startsWith('SELECT')
    || trimmed.startsWith('WITH')
    || /\bRETURNING\b/.test(trimmed);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = raw.prepare(sql);
  return {
    reader,
    all:     (...args: unknown[]) => s.all(...resolveParams(args))     as unknown[],
    run:     (...args: unknown[]) => {
      const r = s.run(...resolveParams(args));
      return { changes: r.changes as number, lastInsertRowid: r.lastInsertRowid as number | bigint };
    },
    get:     (...args: unknown[]) => s.get(...resolveParams(args))     as unknown,
    iterate: (...args: unknown[]) => s.iterate(...resolveParams(args)) as IterableIterator<unknown>,
  };
}

export type SqliteAdapter = ReturnType<typeof createDatabase>;

/**
 * Wraps DatabaseSync, exposing:
 *   - prepare(sql)        → statement with variadic params + get()
 *   - transaction(fn)     → BEGIN/COMMIT wrapper (better-sqlite3 style)
 *   - exec(sql)           → raw SQL execution
 * The adapter is passed to Kysely via `as unknown as SqliteDatabase`
 * because Kysely's SqliteStatement interface is a strict subset of ours.
 */
function createDatabase() {
  const isMemory = env.DATABASE_PATH === ':memory:';
  const dbPath = isMemory ? ':memory:' : path.resolve(env.DATABASE_PATH);

  if (!isMemory) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const raw = new DatabaseSync(dbPath);

  raw.exec('PRAGMA journal_mode = WAL');
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec('PRAGMA synchronous = NORMAL');
  raw.exec('PRAGMA busy_timeout = 5000');
  raw.exec('PRAGMA cache_size = -20000');

  return {
    prepare: (sql: string) => adaptStatement(raw, sql),

    transaction<T>(fn: () => T): () => T {
      return () => {
        raw.exec('BEGIN');
        try {
          const result = fn();
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          try { raw.exec('ROLLBACK'); } catch { /* ignore */ }
          throw err;
        }
      };
    },

    exec: (sql: string) => raw.exec(sql),
    close: () => raw.close(),
  };
}

export const sqlite = createDatabase();

export const db = new Kysely<DB>({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dialect: new SqliteDialect({ database: sqlite as any }),
});
