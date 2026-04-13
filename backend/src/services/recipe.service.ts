import { db, sqlite } from '../db/database.js';
import { deleteRecipeImage } from './image.service.js';
import type { RecipesTable, RecipeIngredientsTable } from '../db/types.js';
import type { Selectable } from 'kysely';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  note: string;
}

export interface RecipeInput {
  title: string;
  description: string;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
  category: 'entree' | 'plat' | 'dessert' | 'aperitif' | 'boisson' | 'autre';
  visibility: 'private' | 'friends' | 'public';
  tags: string[];
  steps: string[];
  ingredients: RecipeIngredientInput[];
}

export interface RecipeFilters {
  q?: string;
  category?: string;
  difficulty?: string;
  maxTotalTimeMin?: number;
  ingredientIds?: string[];
  cursor?: string;
}

export interface Cursor {
  createdAt: number;
  id: string;
}

export interface RecipeListResponse {
  data: RecipeRow[];
  nextCursor: string | null;
}

export type RecipeRow = Selectable<RecipesTable> & {
  author_pseudo: string;
  author_avatar_path: string | null;
  ingredients: Array<Selectable<RecipeIngredientsTable> & { ingredient_name: string }>;
};

const PAGE_SIZE = 20;

// ── Cursor helpers ─────────────────────────────────────────────────────────

function encodeCursor(createdAt: number, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url');
}

function decodeCursor(cursor: string): Cursor | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof decoded.createdAt === 'number' && typeof decoded.id === 'string') {
      return decoded as Cursor;
    }
    return null;
  } catch {
    return null;
  }
}

// ── FTS5 query sanitizer ───────────────────────────────────────────────────

function buildFtsQuery(q: string): string {
  // Escape special FTS5 chars, use prefix match
  return `"${q.trim().replace(/"/g, '""')}"*`;
}

// ── Load ingredients for a list of recipe IDs ─────────────────────────────

export function loadIngredients(recipeIds: string[]): Array<Selectable<RecipeIngredientsTable> & { ingredient_name: string }> {
  if (!recipeIds.length) return [];
  const placeholders = recipeIds.map(() => '?').join(',');
  return sqlite.prepare(`
    SELECT ri.*, ir.nom_canonique AS ingredient_name
    FROM recipe_ingredients ri
    JOIN ingredients_reference ir ON ir.id = ri.ingredient_id
    WHERE ri.recipe_id IN (${placeholders})
    ORDER BY ri.recipe_id, ri.position
  `).all(...recipeIds) as Array<Selectable<RecipeIngredientsTable> & { ingredient_name: string }>;
}

// ── Attach ingredients to recipe rows ─────────────────────────────────────

export function attachIngredients<T extends { id: string }>(
  recipes: T[],
  allIngredients: Array<Selectable<RecipeIngredientsTable> & { ingredient_name: string }>,
): Array<T & { ingredients: typeof allIngredients }> {
  const map = new Map<string, typeof allIngredients>();
  for (const ing of allIngredients) {
    const list = map.get(ing.recipe_id) ?? [];
    list.push(ing);
    map.set(ing.recipe_id, list);
  }
  return recipes.map((r) => ({ ...r, ingredients: map.get(r.id) ?? [] }));
}

// ── Public feed ────────────────────────────────────────────────────────────

export async function getPublicFeed(filters: RecipeFilters): Promise<RecipeListResponse> {
  return buildRecipeList({ ...filters, visibilityScope: 'public' });
}

// ── My recipes ─────────────────────────────────────────────────────────────

export async function getMyRecipes(userId: string, filters: RecipeFilters): Promise<RecipeListResponse> {
  return buildRecipeList({ ...filters, visibilityScope: 'mine', userId });
}

// ── Shared list builder ────────────────────────────────────────────────────

async function buildRecipeList(opts: RecipeFilters & {
  visibilityScope: 'public' | 'mine';
  userId?: string;
}): Promise<RecipeListResponse> {
  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null;
  const limit = PAGE_SIZE + 1; // Fetch one extra to detect next page

  // Build base query using raw SQLite for flexibility with FTS + cursor
  const conditions: string[] = ['r.deleted_at IS NULL'];
  const params: unknown[] = [];

  // Visibility scope
  if (opts.visibilityScope === 'public') {
    conditions.push(`r.visibility = 'public'`);
  } else {
    conditions.push(`r.user_id = ?`);
    params.push(opts.userId);
  }

  // FTS full-text search
  if (opts.q) {
    const ftsQ = buildFtsQuery(opts.q);
    conditions.push(`r.rowid IN (SELECT rowid FROM recipes_fts WHERE recipes_fts MATCH ?)`);
    params.push(ftsQ);
  }

  // Filters
  if (opts.category) { conditions.push(`r.category = ?`); params.push(opts.category); }
  if (opts.difficulty) { conditions.push(`r.difficulty = ?`); params.push(opts.difficulty); }
  if (opts.maxTotalTimeMin) {
    conditions.push(`(COALESCE(r.prep_time_min, 0) + COALESCE(r.cook_time_min, 0)) <= ?`);
    params.push(opts.maxTotalTimeMin);
  }

  // Ingredient filter (all specified ingredients must be present)
  if (opts.ingredientIds?.length) {
    for (const ingId of opts.ingredientIds) {
      conditions.push(`EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.ingredient_id = ?)`);
      params.push(ingId);
    }
  }

  // Cursor-based pagination
  if (cursor) {
    conditions.push(`(r.created_at < ? OR (r.created_at = ? AND r.id < ?))`);
    params.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = sqlite.prepare(`
    SELECT r.*,
           u.pseudo AS author_pseudo,
           u.avatar_path AS author_avatar_path
    FROM recipes r
    JOIN users u ON u.id = r.user_id
    ${where}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ?
  `).all(...params, limit) as Array<Selectable<RecipesTable> & { author_pseudo: string; author_avatar_path: string | null }>;

  const hasNextPage = rows.length > PAGE_SIZE;
  const pageRows = hasNextPage ? rows.slice(0, PAGE_SIZE) : rows;

  const ingredients = loadIngredients(pageRows.map((r) => r.id));
  const data = attachIngredients(pageRows, ingredients) as RecipeRow[];

  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor = hasNextPage && lastRow
    ? encodeCursor(lastRow.created_at, lastRow.id)
    : null;

  return { data, nextCursor };
}

// ── Get single recipe ──────────────────────────────────────────────────────

export async function getById(id: string, requesterId: string | null): Promise<RecipeRow | null> {
  const recipe = sqlite.prepare(`
    SELECT r.*, u.pseudo AS author_pseudo, u.avatar_path AS author_avatar_path
    FROM recipes r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.deleted_at IS NULL
  `).get(id) as (Selectable<RecipesTable> & { author_pseudo: string; author_avatar_path: string | null }) | undefined;

  if (!recipe) return null;

  // Visibility check
  if (recipe.visibility === 'private' && recipe.user_id !== requesterId) return null;
  // 'friends' behaves as 'private' in V1 (no follow system yet)
  if (recipe.visibility === 'friends' && recipe.user_id !== requesterId) return null;

  const ingredients = loadIngredients([recipe.id]);
  return attachIngredients([recipe], ingredients)[0] as RecipeRow;
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function create(userId: string, input: RecipeInput, photoFilename: string | null): Promise<RecipeRow> {
  const now = Date.now();

  const recipe = sqlite.transaction(() => {
    const result = sqlite.prepare(`
      INSERT INTO recipes (user_id, title, description, photo_path, prep_time_min, cook_time_min,
        servings, difficulty, category, visibility, tags, steps, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, input.title, input.description || null, photoFilename,
      input.prepTimeMin, input.cookTimeMin, input.servings,
      input.difficulty, input.category, input.visibility,
      JSON.stringify(input.tags), JSON.stringify(input.steps),
      now, now,
    );

    const recipeId = sqlite.prepare(`SELECT id FROM recipes WHERE rowid = ?`).get(result.lastInsertRowid) as { id: string };

    // Insert ingredients
    for (let i = 0; i < input.ingredients.length; i++) {
      const ing = input.ingredients[i];
      sqlite.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, note, position)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(recipeId.id, ing.ingredientId, ing.quantity, ing.unit, ing.note || null, i);
    }

    return recipeId.id;
  })() as string;

  return (await getById(recipe, userId))!;
}

// ── Update ─────────────────────────────────────────────────────────────────

export async function update(
  recipeId: string,
  userId: string,
  input: Partial<RecipeInput>,
  newPhotoFilename: string | null | undefined,
): Promise<RecipeRow> {
  const existing = await getById(recipeId, userId);
  if (!existing) throw Object.assign(new Error('Recette introuvable.'), { statusCode: 404 });
  if (existing.user_id !== userId) throw Object.assign(new Error('Non autorisé.'), { statusCode: 403 });

  const now = Date.now();

  sqlite.transaction(() => {
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (input.title !== undefined) { updates.push('title = ?'); values.push(input.title); }
    if (input.description !== undefined) { updates.push('description = ?'); values.push(input.description || null); }
    if (input.prepTimeMin !== undefined) { updates.push('prep_time_min = ?'); values.push(input.prepTimeMin); }
    if (input.cookTimeMin !== undefined) { updates.push('cook_time_min = ?'); values.push(input.cookTimeMin); }
    if (input.servings !== undefined) { updates.push('servings = ?'); values.push(input.servings); }
    if (input.difficulty !== undefined) { updates.push('difficulty = ?'); values.push(input.difficulty); }
    if (input.category !== undefined) { updates.push('category = ?'); values.push(input.category); }
    if (input.visibility !== undefined) { updates.push('visibility = ?'); values.push(input.visibility); }
    if (input.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(input.tags)); }
    if (input.steps !== undefined) { updates.push('steps = ?'); values.push(JSON.stringify(input.steps)); }
    if (newPhotoFilename !== undefined) { updates.push('photo_path = ?'); values.push(newPhotoFilename); }

    sqlite.prepare(`UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`).run(...values, recipeId);

    // Replace ingredients if provided
    if (input.ingredients !== undefined) {
      sqlite.prepare(`DELETE FROM recipe_ingredients WHERE recipe_id = ?`).run(recipeId);
      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];
        sqlite.prepare(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, note, position)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(recipeId, ing.ingredientId, ing.quantity, ing.unit, ing.note || null, i);
      }
    }
  })();

  // Delete old photo if replaced
  if (newPhotoFilename !== undefined && existing.photo_path && existing.photo_path !== newPhotoFilename) {
    await deleteRecipeImage(existing.photo_path);
  }

  return (await getById(recipeId, userId))!;
}

// ── Soft delete ────────────────────────────────────────────────────────────

export async function softDelete(recipeId: string, userId: string): Promise<void> {
  const existing = await getById(recipeId, userId);
  if (!existing) throw Object.assign(new Error('Recette introuvable.'), { statusCode: 404 });
  if (existing.user_id !== userId) throw Object.assign(new Error('Non autorisé.'), { statusCode: 403 });

  await db.updateTable('recipes')
    .set({ deleted_at: Date.now() })
    .where('id', '=', recipeId)
    .execute();

  // Delete photo file (orphan prevention)
  if (existing.photo_path) await deleteRecipeImage(existing.photo_path);
}
