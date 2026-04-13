import { z } from 'zod';

const ingredientInputSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive().nullable().default(null),
  unit: z.string().max(50).nullable().default(null),
  note: z.string().max(200).default(''),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1, 'Le titre est requis.').max(120),
  description: z.string().max(2000).default(''),
  prepTimeMin: z.number().int().positive().nullable().default(null),
  cookTimeMin: z.number().int().positive().nullable().default(null),
  servings: z.number().int().min(1).max(100).default(1),
  difficulty: z.enum(['facile', 'moyen', 'difficile']),
  category: z.enum(['entree', 'plat', 'dessert', 'aperitif', 'boisson', 'autre']),
  visibility: z.enum(['private', 'friends', 'public']).default('private'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  steps: z.array(z.string().max(1000)).min(1, 'Au moins une étape est requise.'),
  ingredients: z.array(ingredientInputSchema).max(50).default([]),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const recipeFiltersSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.enum(['entree', 'plat', 'dessert', 'aperitif', 'boisson', 'autre']).optional(),
  difficulty: z.enum(['facile', 'moyen', 'difficile']).optional(),
  maxTotalTimeMin: z.coerce.number().int().positive().optional(),
  ingredientIds: z.union([
    z.string().transform(s => s.split(',')),
    z.array(z.string()),
  ]).optional(),
  cursor: z.string().optional(),
});
