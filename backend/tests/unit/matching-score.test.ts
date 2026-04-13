import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the feasibility score calculation logic used in matching.service.ts.
 * The formula: score = Math.round((matched / required) * 100)
 * Only ingredients with unit !== 'agout' count as required.
 * Recipes below 60% are filtered out.
 */

interface FakeIngredient {
  ingredient_id: string;
  ingredient_name: string;
  unit: string | null;
}

function calcScore(
  recipeIngredients: FakeIngredient[],
  userIngredientIds: string[],
): { score: number; matchedCount: number; totalCount: number; missingIngredients: string[] } | null {
  const required = recipeIngredients.filter(i => i.unit !== 'agout');
  if (!required.length) return null;

  const userSet = new Set(userIngredientIds);
  const matched = required.filter(i => userSet.has(i.ingredient_id));
  const score = Math.round((matched.length / required.length) * 100);

  if (score < 60) return null;

  return {
    score,
    matchedCount: matched.length,
    totalCount: required.length,
    missingIngredients: required.filter(i => !userSet.has(i.ingredient_id)).map(i => i.ingredient_name),
  };
}

describe('matching score calculation', () => {
  const makeIng = (id: string, name: string, unit = 'g'): FakeIngredient => ({
    ingredient_id: id, ingredient_name: name, unit,
  });

  it('returns 100% when all required ingredients match', () => {
    const recipe = [makeIng('1', 'tomate'), makeIng('2', 'oignon'), makeIng('3', 'ail')];
    const result = calcScore(recipe, ['1', '2', '3']);
    expect(result?.score).toBe(100);
    expect(result?.missingIngredients).toEqual([]);
  });

  it('returns 67% when 2/3 ingredients match', () => {
    const recipe = [makeIng('1', 'tomate'), makeIng('2', 'oignon'), makeIng('3', 'ail')];
    const result = calcScore(recipe, ['1', '2']);
    expect(result?.score).toBe(67);
    expect(result?.missingIngredients).toEqual(['ail']);
  });

  it('returns null (below 60%) when fewer than 60% match', () => {
    const recipe = [makeIng('1', 'tomate'), makeIng('2', 'oignon'), makeIng('3', 'ail'), makeIng('4', 'carotte')];
    const result = calcScore(recipe, ['1']); // 25%
    expect(result).toBeNull();
  });

  it('ignores "agout" unit ingredients (optional) in required count', () => {
    const recipe = [
      makeIng('1', 'farine'),
      makeIng('2', 'beurre'),
      { ingredient_id: '3', ingredient_name: 'sel', unit: 'agout' }, // optional
    ];
    // User has farine + beurre but not sel
    const result = calcScore(recipe, ['1', '2']);
    expect(result?.score).toBe(100);   // sel ne compte pas
    expect(result?.totalCount).toBe(2);
  });

  it('returns null for recipe with only optional ingredients', () => {
    const recipe = [
      { ingredient_id: '1', ingredient_name: 'sel', unit: 'agout' },
      { ingredient_id: '2', ingredient_name: 'poivre', unit: 'agout' },
    ];
    const result = calcScore(recipe, ['1', '2']);
    expect(result).toBeNull();
  });

  it('60% threshold: exactly 3/5 returns 60 (included)', () => {
    const recipe = [
      makeIng('1', 'a'), makeIng('2', 'b'), makeIng('3', 'c'),
      makeIng('4', 'd'), makeIng('5', 'e'),
    ];
    const result = calcScore(recipe, ['1', '2', '3']);
    expect(result?.score).toBe(60);
  });

  it('59%: 2/3.4 → below threshold, filtered out', () => {
    // 2/5 = 40% → below 60
    const recipe = [
      makeIng('1', 'a'), makeIng('2', 'b'), makeIng('3', 'c'),
      makeIng('4', 'd'), makeIng('5', 'e'),
    ];
    const result = calcScore(recipe, ['1', '2']); // 40%
    expect(result).toBeNull();
  });

  it('lists all missing ingredients by name', () => {
    const recipe = [
      makeIng('1', 'tomate'),
      makeIng('2', 'mozarella'),
      makeIng('3', 'basilic'),
    ];
    const result = calcScore(recipe, ['1']); // 33% → below threshold
    expect(result).toBeNull();

    // With 2/3 (67%)
    const result2 = calcScore(recipe, ['1', '2']);
    expect(result2?.missingIngredients).toEqual(['basilic']);
  });

  it('handles empty user ingredient list — returns null', () => {
    const recipe = [makeIng('1', 'tomate'), makeIng('2', 'oignon')];
    const result = calcScore(recipe, []);
    expect(result).toBeNull();
  });
});
