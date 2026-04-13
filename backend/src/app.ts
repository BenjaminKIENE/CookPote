import Fastify from 'fastify';
import { env } from './config/env.js';
import { testRoutes } from './routes/test/test.routes.js';

// Plugins
import { corsPlugin } from './plugins/cors.plugin.js';
import { helmetPlugin } from './plugins/helmet.plugin.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { rateLimitPlugin } from './plugins/rate-limit.plugin.js';
import { multipartPlugin } from './plugins/multipart.plugin.js';

// Error handler
import { registerErrorHandler } from './middleware/error-handler.js';

// Routes
import { healthRoutes } from './routes/health/health.routes.js';
import { authRoutes } from './routes/auth/auth.routes.js';
import { recipeRoutes } from './routes/recipes/recipes.routes.js';
import { ingredientRoutes } from './routes/ingredients/ingredients.routes.js';
import { scanFridgeRoutes } from './routes/scan-fridge/scan-fridge.routes.js';
import { matchingRoutes } from './routes/matching/matching.routes.js';
import { profileRoutes } from './routes/profile/profile.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: false, // We use pino directly
    trustProxy: true, // Behind Nginx reverse proxy
  });

  // ── Security plugins (order matters) ──────────────────────────────────────
  await fastify.register(helmetPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(authPlugin);
  await fastify.register(multipartPlugin);

  // ── Error handling ─────────────────────────────────────────────────────────
  registerErrorHandler(fastify);

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(recipeRoutes, { prefix: '/api/recipes' });
  await fastify.register(ingredientRoutes, { prefix: '/api/ingredients' });
  await fastify.register(scanFridgeRoutes, { prefix: '/api/scan-fridge' });
  await fastify.register(matchingRoutes, { prefix: '/api/matching' });
  await fastify.register(profileRoutes, { prefix: '/api/profile' });

  // ── Test helpers (never in production) ────────────────────────────────────
  if (env.NODE_ENV !== 'production') {
    await fastify.register(testRoutes, { prefix: '/api/test' });
  }

  return fastify;
}
