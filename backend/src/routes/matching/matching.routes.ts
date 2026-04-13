import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as matchingService from '../../services/matching.service.js';

const manualMatchSchema = z.object({
  ingredientIds: z.array(z.string().min(1)).min(1, 'Au moins un ingrédient est requis.').max(50),
});

export async function matchingRoutes(fastify: FastifyInstance) {

  // ── POST /api/matching  — Manual ingredient matching ──────────────────────
  fastify.post('/', async (request, reply) => {
    const parsed = manualMatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }

    const results = await matchingService.matchRecipes(parsed.data.ingredientIds);
    return results;
  });
}
