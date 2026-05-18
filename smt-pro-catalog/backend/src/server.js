require('dotenv').config();
const http   = require('http');
const app    = require('./app');
const prisma = require('./config/prisma');
const logger = require('./shared/utils/logger.util');
const { init: initSocket } = require('./config/socket');
const { initSocketHandlers } = require('./modules/realtime/realtime.service');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('[db]     Database connected');

    const httpServer = http.createServer(app);

    const io = initSocket(httpServer);
    initSocketHandlers(io);
    logger.info('[socket] Socket.IO initialized');

    httpServer.listen(PORT, HOST, () => {
      logger.info(`[server] Running on http://${HOST}:${PORT}`);
      logger.info(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('[server] Failed to start: ' + err.message);
    process.exit(1);
  }
};

start();
