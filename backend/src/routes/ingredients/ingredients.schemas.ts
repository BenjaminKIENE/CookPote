import { z } from 'zod';

export const ingredientSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createIngredientSchema = z.object({
  nomCanonique: z.string().min(1, 'Le nom est requis.').max(100).trim(),
  categorie: z.enum([
    'legume', 'fruit', 'viande', 'poisson', 'produit_laitier',
    'cereale', 'legumineuse', 'aromate', 'epice', 'matiere_grasse',
    'condiment', 'boisson', 'autre',
  ]),
});
