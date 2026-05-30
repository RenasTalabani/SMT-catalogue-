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
  const recommended = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ALLOWED_ORIGINS'];
  const missingRec  = recommended.filter((k) => !process.env[k]);
  if (missingRec.length) {
    console.warn(`[warn]  Missing recommended variables: ${missingRec.join(', ')} — some features disabled`);
  }
}

// ─── Sentry ───────────────────────────────────────────────────────────────────
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  });
  logger.info('[sentry] Initialized');
}

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = '0.0.0.0';

// ─── HTTP server starts immediately so Railway healthcheck passes ─────────────
// Database connection happens after — if it fails the server stays up and logs
const httpServer = http.createServer(app);

const start = async (): Promise<void> => {
  // Start listening first — healthcheck at /health returns 200 right away
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
      logger.info(`[server] Version: 3.0.0`);
      resolve();
    });
  });

  // Socket.IO attaches to the already-listening server
  const io = await initSocket(httpServer);
  initSocketHandlers(io);
  logger.info('[socket] Socket.IO initialized');

  // Database connection — retry with backoff so a cold Supabase wakes up
  const connectDB = async (attempt = 1): Promise<void> => {
    try {
      await prisma.$connect();
      logger.info('[db]     Database connected');
    } catch (err) {
      const delay = Math.min(attempt * 2000, 30000);
      logger.warn(`[db]     Connection attempt ${attempt} failed — retrying in ${delay / 1000}s: ${(err as Error).message}`);
      if (attempt <= 10) {
        await new Promise((r) => setTimeout(r, delay));
        await connectDB(attempt + 1);
      } else {
        logger.error('[db]     Could not connect to database after 10 attempts. API routes that need DB will return 500.');
        Sentry.captureException(err);
      }
    }
  };

  void connectDB();

  // ─── Graceful shutdown ────────────────────────────────────────────────────
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
};

void start();
