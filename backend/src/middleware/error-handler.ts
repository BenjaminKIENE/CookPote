import type { FastifyInstance, FastifyError } from 'fastify';
import { logger } from '../utils/logger.js';

/**
 * Uniform error response format:
 * { statusCode, error, message, details? }
 */
export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    // Log server errors (5xx), skip client errors (4xx)
    if (statusCode >= 500) {
      logger.error({ err: error, req: { method: request.method, url: request.url } }, 'Server error');
    }

    // Zod validation errors from Fastify schema validation
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Données invalides.',
        details: error.validation,
      });
    }

    return reply.status(statusCode).send({
      statusCode,
      error: error.name ?? 'Error',
      message: statusCode >= 500 ? 'Une erreur interne est survenue.' : error.message,
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} introuvable.`,
    });
  });
}
