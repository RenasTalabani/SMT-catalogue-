import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis';
import { verifyToken } from '../shared/utils/jwt.util';
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
      await Promise.all([pubClient.connect(), subClient.connect()]);
      _io.adapter(createAdapter(pubClient, subClient));
      logger.info('[socket] Redis adapter attached');
    } catch (err) {
      logger.warn('[socket] Redis adapter failed, using in-memory adapter: ' + (err as Error).message);
    }
  }

  _io.on('connection', (socket: Socket) => {
    // Verify JWT if provided — fall back to guest role if missing/invalid
    let role   = 'guest';
    let userId: string | undefined;

    const token = (socket.handshake.auth as Record<string, unknown>)?.['token'] as string | undefined
      ?? socket.handshake.query['token'] as string | undefined;

    if (token) {
      try {
        const payload = verifyToken(token);
        role   = payload.role ?? 'guest';
        userId = String(payload.id);
      } catch {
        logger.warn(`[socket] Invalid token — client ${socket.id} connected as guest`);
      }
    }

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
