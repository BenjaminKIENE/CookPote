import { db, sqlite } from '../db/database.js';

// ── Search via FTS5 ───────────────────────────────────────────────────────

export interface IngredientSearchResult {
  id: string;
  nom_canonique: string;
  categorie: string;
}

/**
 * FTS5 search on nom_canonique + synonymes.
 * Falls back to LIKE when query is too short for FTS.
 */
export async function search(query: string, limit = 10): Promise<IngredientSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (q.length < 2) {
    // Too short for FTS — use prefix LIKE
    return db.selectFrom('ingredients_reference')
      .select(['id', 'nom_canonique', 'categorie'])
      .where('nom_canonique', 'like', `${q}%`)
      .where('nom_canonique', 'not like', '') // exclude empty
      .orderBy('nom_canonique', 'asc')
      .limit(limit)
      .execute();
  }

  // Sanitize for FTS5: escape double quotes, append * for prefix match
  const ftsQuery = `"${q.replace(/"/g, '""')}"*`;

  // Use raw SQLite for FTS join (Kysely doesn't support FTS5 MATCH natively)
  const rows = sqlite.prepare(`
    SELECT ir.id, ir.nom_canonique, ir.categorie
    FROM ingredients_fts f
    JOIN ingredients_reference ir ON ir.rowid = f.rowid
    WHERE ingredients_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(ftsQuery, limit) as IngredientSearchResult[];

  return rows;
}

// ── Get by IDs (for matching) ──────────────────────────────────────────────

export async function getByIds(ids: string[]): Promise<IngredientSearchResult[]> {
  if (!ids.length) return [];
  return db.selectFrom('ingredients_reference')
    .select(['id', 'nom_canonique', 'categorie'])
    .where('id', 'in', ids)
    .execute();
}

// ── Create a new ingredient (user-contributed) ────────────────────────────

export async function create(
  nomCanonique: string,
  categorie: string,
  createdBy: string,
): Promise<IngredientSearchResult> {
  const normalized = nomCanonique.toLowerCase().trim();

  // Check for duplicate (case-insensitive)
  const existing = await db.selectFrom('ingredients_reference')
    .select(['id', 'nom_canonique', 'categorie'])
    .where('nom_canonique', '=', normalized)
    .executeTakeFirst();

  if (existing) return existing;

  return db.insertInto('ingredients_reference')
    .values({
      nom_canonique: normalized,
      categorie: categorie as never,
      synonymes: '[]',
      created_by: createdBy,
    })
    .returning(['id', 'nom_canonique', 'categorie'])
    .executeTakeFirstOrThrow();
}

// ── List all (for Scan Frigo context) ─────────────────────────────────────

export async function listAll(): Promise<{ id: string; nom_canonique: string; synonymes: string }[]> {
  return db.selectFrom('ingredients_reference')
    .select(['id', 'nom_canonique', 'synonymes'])
    .orderBy('nom_canonique', 'asc')
    .execute();
}
