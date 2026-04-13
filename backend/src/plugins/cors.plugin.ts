import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

async function plugin(fastify: FastifyInstance) {
  // In development we allow the Angular dev server origin explicitly.
  // 'origin: true' can fail to set headers on error responses in some
  // @fastify/cors versions — an explicit allow-list is more reliable.
  const allowedOrigins =
    env.NODE_ENV === 'production'
      ? [env.APP_URL]
      : [env.APP_URL, 'http://localhost:4200', 'http://127.0.0.1:4200'];

  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked: ${origin}`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'],
  });
}

export const corsPlugin = fp(plugin, { name: 'cors-plugin' });
