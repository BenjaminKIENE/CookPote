import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler — verifies the Bearer JWT access token.
 * Attaches decoded payload to request.user.
 *
 * Usage:
 *   fastify.get('/protected', { preHandler: [authenticate] }, handler)
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();

    if (request.user.type !== 'access') {
      return reply.status(401).send({ statusCode: 401, error: 'Non autorisé', message: 'Token invalide.' });
    }
  } catch {
    return reply.status(401).send({ statusCode: 401, error: 'Non autorisé', message: 'Token manquant ou expiré.' });
  }
}
