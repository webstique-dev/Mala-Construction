const env = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

let server;

const { seedLookups } = require('./utils/seedLookups');

async function start() {
  try {
    await connectDB();
    await seedLookups();
    server = app.listen(env.port, () => {
      logger.info(`MALA ERP API listening on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

function shutdown(signal) {
  logger.warn(`${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
  // Force-exit if shutdown hangs.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  process.exit(1);
});

start();
