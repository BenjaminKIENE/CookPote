import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { processAndSaveRecipeImage } from '../../services/image.service.js';
import * as recipeService from '../../services/recipe.service.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeFiltersSchema,
} from './recipes.schemas.js';

export async function recipeRoutes(fastify: FastifyInstance) {

  // ── GET /api/recipes  — Public feed ───────────────────────────────────────
  fastify.get('/', async (request, reply) => {
    const filters = recipeFiltersSchema.safeParse(request.query);
    if (!filters.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: filters.error.issues[0].message });
    }
    return recipeService.getPublicFeed(filters.data);
  });

  // ── GET /api/recipes/my  — Authenticated user's own recipes ───────────────
  fastify.get('/my', { preHandler: [authenticate] }, async (request, reply) => {
    const filters = recipeFiltersSchema.safeParse(request.query);
    if (!filters.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: filters.error.issues[0].message });
    }
    return recipeService.getMyRecipes(request.user.sub, filters.data);
  });

  // ── POST /api/recipes  — Create ────────────────────────────────────────────
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createRecipeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    const recipe = await recipeService.create(request.user.sub, parsed.data, null);
    return reply.status(201).send(recipe);
  });

  // ── POST /api/recipes/:id/photo  — Upload photo ───────────────────────────
  fastify.post('/:id/photo', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Verify ownership first
    const existing = await recipeService.getById(id, request.user.sub);
    if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Recette introuvable.' });
    if (existing.user_id !== request.user.sub) return reply.status(403).send({ statusCode: 403, error: 'Forbidden', message: 'Non autorisé.' });

    const data = await (request as any).file();
    if (!data) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Aucune image fournie.' });

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const filename = await processAndSaveRecipeImage(buffer);
    const updated = await recipeService.update(id, request.user.sub, {}, filename);
    return updated;
  });

  // ── GET /api/recipes/:id  — Single recipe ─────────────────────────────────
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const requesterId = (request.headers.authorization?.startsWith('Bearer '))
      ? (() => { try { const p = fastify.jwt.decode<{ sub: string }>(request.headers.authorization!.slice(7)); return p?.sub ?? null; } catch { return null; } })()
      : null;

    const recipe = await recipeService.getById(id, requesterId);
    if (!recipe) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Recette introuvable.' });
    return recipe;
  });

  // ── PATCH /api/recipes/:id  — Update ──────────────────────────────────────
  fastify.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateRecipeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    const recipe = await recipeService.update(id, request.user.sub, parsed.data, undefined);
    return recipe;
  });

  // ── DELETE /api/recipes/:id  — Soft delete ────────────────────────────────
  fastify.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await recipeService.softDelete(id, request.user.sub);
    return reply.status(204).send();
  });
}
