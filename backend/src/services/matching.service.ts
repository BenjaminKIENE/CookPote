import { sqlite } from '../db/database.js';
import type { RecipeRow } from './recipe.service.js';
import { loadIngredients, attachIngredients } from './recipe.service.js';
import type { Selectable } from 'kysely';
import type { RecipesTable } from '../db/types.js';

export interface MatchResult {
  recipe: RecipeRow;
  score: number;         // 0–100 feasibility
  matchedCount: number;
  totalCount: number;
  missingIngredients: string[];
}

/**
 * Given a list of ingredient IDs the user has, find public recipes
 * and score them by feasibility.
 * Score = matchedRequired / totalRequired * 100
 * Recipes with score >= 60 are returned, sorted desc.
 */
export async function matchRecipes(ingredientIds: string[]): Promise<MatchResult[]> {
  if (!ingredientIds.length) return [];

  // Fetch all public non-deleted recipes (limited scan for performance)
  const rows = sqlite.prepare(`
    SELECT r.*, u.pseudo AS author_pseudo, u.avatar_path AS author_avatar_path
    FROM recipes r
    JOIN users u ON u.id = r.user_id
    WHERE r.deleted_at IS NULL AND r.visibility = 'public'
    ORDER BY r.created_at DESC
    LIMIT 500
  `).all() as Array<Selectable<RecipesTable> & { author_pseudo: string; author_avatar_path: string | null }>;

  if (!rows.length) return [];

  const allIngredients = loadIngredients(rows.map(r => r.id));
  const recipes = attachIngredients(rows, allIngredients) as RecipeRow[];

  const userSet = new Set(ingredientIds);
  const results: MatchResult[] = [];

  for (const recipe of recipes) {
    if (!recipe.ingredients.length) continue;

    const required = recipe.ingredients.filter(i => {
      // Ingredients marked "à goût" (unit agout) or with no quantity are optional
      return i.unit !== 'agout';
    });

    if (!required.length) continue;

    const matched = required.filter(i => userSet.has(i.ingredient_id));
    const score = Math.round((matched.length / required.length) * 100);

    if (score < 60) continue;

    const missingIngredients = required
      .filter(i => !userSet.has(i.ingredient_id))
      .map(i => i.ingredient_name);

    results.push({
      recipe,
      score,
      matchedCount: matched.length,
      totalCount: required.length,
      missingIngredients,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
