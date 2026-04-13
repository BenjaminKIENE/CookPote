import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import fp from 'fastify-plugin';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function plugin(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
      fields: 20,
    },
  });
}

export const multipartPlugin = fp(plugin, { name: 'multipart-plugin' });
