require('dotenv').config();

const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { createApp } = require('./src/app');

async function start() {
  // Fail here, on boot, rather than on the first request that needs a secret.
  env.assertRequired();

  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`CollabBoard API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(() => {
      require('./src/config/db')
        .disconnectDB()
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
