import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

async function plugin(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false, // Disable CSP in dev to avoid friction
    hsts: env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

export const helmetPlugin = fp(plugin, { name: 'helmet-plugin' });
