require('dotenv').config();

const http = require('http');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { createApp } = require('./src/app');
const { initSocket, closeSocket } = require('./src/socket');

async function start() {
  // Fail here, on boot, rather than on the first request that needs a secret.
  env.assertRequired();

  await connectDB();

  const app = createApp();

  /*
   * Socket.IO needs the underlying HTTP server to handle the upgrade request,
   * so the server is created explicitly here rather than by app.listen().
   * Express still serves every ordinary request; the socket only takes over
   * the /socket.io/ path.
   */
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    const { summary, warnings } = env.describe();
    console.log(`CollabBoard API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`  config: ${summary}`);
    warnings.forEach((warning) => console.warn(`  warning: ${warning}`));
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down.`);
    // Open sockets keep the HTTP server from closing, so they go first.
    closeSocket().finally(() => {
      server.close(() => {
        require('./src/config/db')
          .disconnectDB()
          .finally(() => process.exit(0));
      });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
