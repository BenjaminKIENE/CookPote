export type IngredientCategory =
  | 'legume' | 'fruit' | 'viande' | 'poisson'
  | 'laitier' | 'feculent' | 'epice' | 'condiment' | 'autre';

export interface Ingredient {
  id: string;
  nomCanonique: string;
  synonymes: string[];
  categorie: IngredientCategory;
}

export interface IngredientSearchResult {
  id: string;
  nomCanonique: string;
  categorie: IngredientCategory;
}
