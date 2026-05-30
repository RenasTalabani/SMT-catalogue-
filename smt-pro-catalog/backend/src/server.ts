import 'dotenv/config';
import * as Sentry from '@sentry/node';
import http from 'http';
import app from './app';
import prisma from './config/prisma';
import logger from './shared/utils/logger.util';
import { init as initSocket } from './config/socket';
import { initSocketHandlers } from './modules/realtime/realtime.service';

// ─── Sentry (init before anything else) ──────────────────────────────────────
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  });
}

const PORT = Number(process.env['PORT'] ?? 3000);
const HOST = '0.0.0.0';

// HTTP server created immediately — no async work before listen()
const httpServer = http.createServer(app);

const start = async (): Promise<void> => {
  // ── 1. Listen first — Railway healthcheck at /health passes immediately ──
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
      logger.info(`[server] Version: 3.0.0`);
      resolve();
    });
  });

  // ── 2. Validate env — warn only, server is already up ────────────────────
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    logger.warn(`[server] Missing env vars: ${missing.join(', ')} — affected endpoints will return 500`);
  }

  // ── 3. Socket.IO ──────────────────────────────────────────────────────────
  try {
    const io = await initSocket(httpServer);
    initSocketHandlers(io);
    logger.info('[socket] Socket.IO initialized');
  } catch (err) {
    logger.warn('[socket] Failed to initialize: ' + (err as Error).message);
  }

  // ── 4. Database — async with backoff, never blocks the server ─────────────
  const connectDB = async (attempt = 1): Promise<void> => {
    try {
      await prisma.$connect();
      logger.info('[db]     Database connected');
    } catch (err) {
      const delay = Math.min(attempt * 2000, 30000);
      logger.warn(`[db]     Connection attempt ${attempt} failed (retry in ${delay / 1000}s): ${(err as Error).message}`);
      if (attempt <= 10) {
        await new Promise((r) => setTimeout(r, delay));
        await connectDB(attempt + 1);
      } else {
        logger.error('[db]     Giving up after 10 attempts — DB-dependent routes will return 500');
        Sentry.captureException(err);
      }
    }
  };

  void connectDB();

  // ── 5. Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`[server] ${signal} — shutting down`);
    await prisma.$disconnect();
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
};

void start().catch((err) => {
  logger.error('[server] Fatal startup error: ' + (err as Error).message);
  process.exit(1);
});
