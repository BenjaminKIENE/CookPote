export type Difficulty = 'facile' | 'moyen' | 'difficile';
export type Category = 'entree' | 'plat' | 'dessert' | 'aperitif' | 'boisson' | 'autre';
export type Visibility = 'private' | 'friends' | 'public';
export type Unit = 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'cac' | 'cas' | 'piece' | 'pincee' | 'agout';

export const UNIT_LABELS: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  l: 'l',
  cac: 'c. à café',
  cas: 'c. à soupe',
  piece: 'pièce(s)',
  pincee: 'pincée(s)',
  agout: 'à goût',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  entree: 'Entrée',
  plat: 'Plat',
  dessert: 'Dessert',
  aperitif: 'Apéritif',
  boisson: 'Boisson',
  autre: 'Autre',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  position: number;
}

export interface Recipe {
  id: string;
  userId: string;
  authorPseudo: string;
  authorAvatarPath: string | null;
  title: string;
  description: string | null;
  photoPath: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number;
  difficulty: Difficulty;
  category: Category;
  visibility: Visibility;
  tags: string[];
  steps: string[];
  ingredients: RecipeIngredient[];
  createdAt: number;
  updatedAt: number;
}

export interface RecipeListItem {
  id: string;
  userId: string;
  authorPseudo: string;
  authorAvatarPath: string | null;
  title: string;
  description: string | null;
  photoPath: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number;
  difficulty: Difficulty;
  category: Category;
  visibility: Visibility;
  tags: string[];
  createdAt: number;
}

export interface RecipeListResponse {
  data: RecipeListItem[];
  nextCursor: string | null;
}

export interface RecipeFilters {
  q?: string;
  category?: Category;
  difficulty?: Difficulty;
  maxTotalTimeMin?: number;
  tags?: string[];
  cursor?: string;
}

export interface RecipeFormData {
  title: string;
  description: string;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number;
  difficulty: Difficulty;
  category: Category;
  visibility: Visibility;
  tags: string[];
  steps: string[];
  ingredients: {
    ingredientId: string;
    quantity: number | null;
    unit: Unit | null;
    note: string;
  }[];
}
