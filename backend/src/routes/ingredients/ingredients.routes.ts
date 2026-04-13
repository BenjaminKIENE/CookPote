import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import * as ingredientService from '../../services/ingredient.service.js';
import { ingredientSearchSchema, createIngredientSchema } from './ingredients.schemas.js';

export async function ingredientRoutes(fastify: FastifyInstance) {

  // ── GET /api/ingredients/search?q=...  — FTS5 autocomplete ───────────────
  fastify.get('/search', async (request, reply) => {
    const parsed = ingredientSearchSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    return ingredientService.search(parsed.data.q, parsed.data.limit);
  });

  // ── POST /api/ingredients  — Create user-contributed ingredient ───────────
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createIngredientSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    const ingredient = await ingredientService.create(
      parsed.data.nomCanonique,
      parsed.data.categorie,
      request.user.sub,
    );
    return reply.status(201).send(ingredient);
  });
}
