import 'dotenv/config';
import * as Sentry from '@sentry/node';
import http from 'http';
import app from './app';
import prisma from './config/prisma';
import logger from './shared/utils/logger.util';
import { init as initSocket } from './config/socket';
import { initSocketHandlers } from './modules/realtime/realtime.service';

// ─── Env validation (production) ─────────────────────────────────────────────
if (process.env['NODE_ENV'] === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing  = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  // Warn about optional but strongly recommended vars (image uploads disabled without these)
  const recommended = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ALLOWED_ORIGINS'];
  const missingRec  = recommended.filter((k) => !process.env[k]);
  if (missingRec.length) {
    console.warn(`[warn]  Missing recommended variables: ${missingRec.join(', ')} — some features disabled`);
  }
}

// ─── Sentry (must be before anything else) ────────────────────────────────────
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  });
  logger.info('[sentry] Initialized');
}

const PORT = process.env['PORT'] ?? 3000;
const HOST = '0.0.0.0';

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('[db]     Database connected');

    const httpServer = http.createServer(app);
    const io         = await initSocket(httpServer);
    initSocketHandlers(io);
    logger.info('[socket] Socket.IO initialized');

    httpServer.listen(Number(PORT), HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
      logger.info(`[server] Version: 3.0.0`);
    });

    // ─── Graceful shutdown ──────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`[server] ${signal} received — shutting down gracefully`);
      await prisma.$disconnect();
      httpServer.close(() => {
        logger.info('[server] HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT',  () => void shutdown('SIGINT'));

  } catch (err) {
    logger.error('[server] Failed to start: ' + (err as Error).message);
    Sentry.captureException(err);
    process.exit(1);
  }
};

void start();
