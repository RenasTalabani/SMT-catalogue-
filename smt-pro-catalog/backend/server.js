// Load and validate env vars first — fail fast before any other require
const env = require('./config/env');

const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

connectDB()
  .then(() => {
    const server = app.listen(env.PORT, () => {
      logger.info(`SMT Pro Catalog API running on port ${env.PORT} [${env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
