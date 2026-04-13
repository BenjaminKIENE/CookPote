import type { Kysely } from 'kysely';
import { sql } from 'kysely';

/**
 * FTS5 virtual tables + triggers.
 * Separated from schema migration for clarity — FTS DDL is verbose.
 *
 * recipes_fts: indexes title, description, tags for full-text search.
 * ingredients_fts: indexes nom_canonique + synonymes for autocomplete.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // ── RECIPES FTS5 ───────────────────────────────────────────────────────────
  await sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS recipes_fts USING fts5(
      recipe_id UNINDEXED,
      title,
      description,
      tags,
      content='recipes',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 1'
    )
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS recipes_fts_ai AFTER INSERT ON recipes BEGIN
      INSERT INTO recipes_fts(rowid, recipe_id, title, description, tags)
      VALUES (new.rowid, new.id, new.title, new.description, new.tags);
    END
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS recipes_fts_ad AFTER DELETE ON recipes BEGIN
      INSERT INTO recipes_fts(recipes_fts, rowid, recipe_id, title, description, tags)
      VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags);
    END
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS recipes_fts_au AFTER UPDATE ON recipes BEGIN
      INSERT INTO recipes_fts(recipes_fts, rowid, recipe_id, title, description, tags)
      VALUES ('delete', old.rowid, old.id, old.title, old.description, old.tags);
      INSERT INTO recipes_fts(rowid, recipe_id, title, description, tags)
      VALUES (new.rowid, new.id, new.title, new.description, new.tags);
    END
  `.execute(db);

  // ── INGREDIENTS FTS5 ───────────────────────────────────────────────────────
  await sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS ingredients_fts USING fts5(
      id UNINDEXED,
      nom_canonique,
      synonymes,
      content='ingredients_reference',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 1'
    )
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS ingredients_fts_ai AFTER INSERT ON ingredients_reference BEGIN
      INSERT INTO ingredients_fts(rowid, id, nom_canonique, synonymes)
      VALUES (new.rowid, new.id, new.nom_canonique, new.synonymes);
    END
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS ingredients_fts_ad AFTER DELETE ON ingredients_reference BEGIN
      INSERT INTO ingredients_fts(ingredients_fts, rowid, id, nom_canonique, synonymes)
      VALUES ('delete', old.rowid, old.id, old.nom_canonique, old.synonymes);
    END
  `.execute(db);

  await sql`
    CREATE TRIGGER IF NOT EXISTS ingredients_fts_au AFTER UPDATE ON ingredients_reference BEGIN
      INSERT INTO ingredients_fts(ingredients_fts, rowid, id, nom_canonique, synonymes)
      VALUES ('delete', old.rowid, old.id, old.nom_canonique, old.synonymes);
      INSERT INTO ingredients_fts(rowid, id, nom_canonique, synonymes)
      VALUES (new.rowid, new.id, new.nom_canonique, new.synonymes);
    END
  `.execute(db);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS ingredients_fts_au`.execute(db);
  await sql`DROP TRIGGER IF EXISTS ingredients_fts_ad`.execute(db);
  await sql`DROP TRIGGER IF EXISTS ingredients_fts_ai`.execute(db);
  await sql`DROP TABLE IF EXISTS ingredients_fts`.execute(db);

  await sql`DROP TRIGGER IF EXISTS recipes_fts_au`.execute(db);
  await sql`DROP TRIGGER IF EXISTS recipes_fts_ad`.execute(db);
  await sql`DROP TRIGGER IF EXISTS recipes_fts_ai`.execute(db);
  await sql`DROP TABLE IF EXISTS recipes_fts`.execute(db);
}
