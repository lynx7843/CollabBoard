const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const routes = require('./routes');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { spec } = require('./docs/openapi');

/*
 * Builds the Express app without binding a port, so the test suite can drive it
 * through supertest while index.js owns the listening server.
 */
function createApp() {
  const app = express();

  // Behind a proxy in deployment; needed for express-rate-limit to key on the
  // real client IP rather than the proxy's.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // A function rather than the raw list: entries may carry a wildcard for a
  // Vercel preview subdomain (config/env.js -> utils/origins.js).
  app.use(
    cors({
      origin: (origin, callback) => callback(null, env.isAllowedOrigin(origin)),
      credentials: true,
    }),
  );

  // A password field is small; a 100kb cap keeps an oversized body from being
  // parsed before validation can reject it.
  app.use(express.json({ limit: '100kb' }));

  // Mounted before the routes' catch-all 404 so /api/docs is not swallowed by it.
  // The spec is generated from the @openapi blocks that sit above each route.
  if (env.docsEnabled) {
    app.get('/api/docs.json', (_req, res) => res.json(spec));
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(spec, {
        customSiteTitle: 'CollabBoard API',
        swaggerOptions: { persistAuthorization: true },
      }),
    );
  }

  app.use('/api', routes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
