import type { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;       // user ID
      email: string;
      role: string;
      type: 'access' | 'refresh' | 'temp-2fa';
    };
    user: {
      sub: string;
      email: string;
      role: string;
      type: 'access' | 'refresh' | 'temp-2fa';
    };
  }
}

async function plugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCookie);

  // Primary JWT instance (access tokens, signed with access secret)
  await fastify.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
    verify: {
      // Only accept access tokens on standard verify
      allowedIss: undefined,
    },
  });
}

export const authPlugin = fp(plugin, { name: 'auth-plugin' });
