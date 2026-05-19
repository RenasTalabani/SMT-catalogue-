import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis';
import logger from '../shared/utils/logger.util';

let _io: Server | null = null;

export const init = async (httpServer: HttpServer): Promise<Server> => {
  _io = new Server(httpServer, {
    cors: {
      origin: process.env['ALLOWED_ORIGINS']
        ? process.env['ALLOWED_ORIGINS'].split(',').map((o) => o.trim())
        : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis adapter for horizontal scaling (multiple instances)
  const redis = getRedisClient();
  if (redis) {
    try {
      const pubClient = redis.duplicate();
      const subClient = redis.duplicate();
      _io.adapter(createAdapter(pubClient, subClient));
      logger.info('[socket] Redis adapter attached');
    } catch (err) {
      logger.warn('[socket] Redis adapter failed, using in-memory adapter: ' + (err as Error).message);
    }
  }

  _io.on('connection', (socket: Socket) => {
    const role = (socket.handshake.query['role'] as string) || 'guest';
    const userId = socket.handshake.query['userId'] as string | undefined;

    void socket.join(role);
    void socket.join('all');
    if (userId) void socket.join(`user:${userId}`);

    logger.info(`[socket] Client connected — role=${role} id=${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`[socket] Client disconnected — id=${socket.id} reason=${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`[socket] Error — id=${socket.id}: ${err.message}`);
    });
  });

  return _io;
};

export const getIO = (): Server | null => _io;

// Typed emit helper
export const emitEvent = (event: string, data: unknown, room = 'all'): void => {
  if (_io) {
    _io.to(room).emit(event, data);
  }
};
