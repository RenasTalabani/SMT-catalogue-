import Redis from 'ioredis';
import logger from '../shared/utils/logger.util';

let _redis: Redis | null = null;

const REDIS_URL = process.env['REDIS_URL'];

if (REDIS_URL) {
  _redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: (t: number) => Math.min(t * 100, 3000),
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  _redis.on('connect',    () => logger.info('[redis] Connected'));
  _redis.on('ready',      () => logger.info('[redis] Ready'));
  _redis.on('error',      (e: Error) => logger.warn('[redis] ' + e.message));
  _redis.on('close',      () => logger.warn('[redis] Connection closed'));
  _redis.on('reconnecting', () => logger.info('[redis] Reconnecting...'));
} else {
  logger.info('[redis] REDIS_URL not set — using in-memory cache fallback');
}

export const getRedisClient = (): Redis | null => _redis;
export default _redis;
