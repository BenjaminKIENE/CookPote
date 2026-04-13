import type { FastifyInstance } from 'fastify';
import { sqlite } from '../../db/database.js';
import { env } from '../../config/env.js';
import fs from 'node:fs';
import path from 'node:path';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', { logLevel: 'warn' }, async (_request, reply) => {
    const checks = {
      process: true as boolean,
      database: false as boolean,
      filesystem: false as boolean,
    };

    // Check SQLite is accessible
    try {
      sqlite.prepare('SELECT 1').get();
      checks.database = true;
    } catch {
      // database check failed
    }

    // Check uploads dir is writable
    try {
      const uploadsPath = path.resolve(env.UPLOADS_PATH);
      fs.accessSync(uploadsPath, fs.constants.W_OK);
      checks.filesystem = true;
    } catch {
      // Try creating the directory if it doesn't exist
      try {
        fs.mkdirSync(path.resolve(env.UPLOADS_PATH), { recursive: true });
        checks.filesystem = true;
      } catch {
        // filesystem check failed
      }
    }

    const healthy = checks.process && checks.database && checks.filesystem;
    const status = healthy ? 200 : 503;

    return reply.status(status).send({
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
