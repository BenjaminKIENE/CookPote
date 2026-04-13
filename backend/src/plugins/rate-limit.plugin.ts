import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

async function plugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    allowList: process.env['NODE_ENV'] === 'test' ? () => true : undefined,
    errorResponseBuilder: (_req: unknown, context: { after: string }) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Trop de requêtes. Réessaie dans ${context.after}.`,
    }),
  });
}

export const rateLimitPlugin = fp(plugin, { name: 'rate-limit-plugin' });
