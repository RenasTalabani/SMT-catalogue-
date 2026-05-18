import 'dotenv/config';
import http from 'http';
import app from './app';
import prisma from './config/prisma';
import logger from './shared/utils/logger.util';
import { init as initSocket } from './config/socket';
import { initSocketHandlers } from './modules/realtime/realtime.service';

const PORT = process.env['PORT'] ?? 3000;
const HOST = '0.0.0.0';

const start = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('[db]     Database connected');

    const httpServer = http.createServer(app);
    const io         = initSocket(httpServer);
    initSocketHandlers(io);
    logger.info('[socket] Socket.IO initialized');

    httpServer.listen(Number(PORT), HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
    });
  } catch (err) {
    logger.error('[server] Failed to start: ' + (err as Error).message);
    process.exit(1);
  }
};

void start();
