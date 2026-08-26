const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

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

  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
    }),
  );

  // A password field is small; a 100kb cap keeps an oversized body from being
  // parsed before validation can reject it.
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', routes);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
