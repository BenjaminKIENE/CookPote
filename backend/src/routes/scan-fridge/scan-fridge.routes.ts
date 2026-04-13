import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { processScanFridgeImage } from '../../services/image.service.js';
import * as scanFridgeService from '../../services/scan-fridge.service.js';

export async function scanFridgeRoutes(fastify: FastifyInstance) {

  // ── GET /api/scan-fridge/quota  — Check current quota ────────────────────
  fastify.get('/quota', { preHandler: [authenticate] }, async (request) => {
    return scanFridgeService.getQuota(request.user.sub);
  });

  // ── POST /api/scan-fridge  — Upload + scan ────────────────────────────────
  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await (request as any).file();
    if (!data) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Aucune image fournie.' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const rawBuffer = Buffer.concat(chunks);

    const imageBuffer = await processScanFridgeImage(rawBuffer);
    const result = await scanFridgeService.scanFridge(request.user.sub, imageBuffer);

    return result;
  });
}
