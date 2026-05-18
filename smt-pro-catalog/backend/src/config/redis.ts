import Redis from 'ioredis';
import logger from '../shared/utils/logger.util';

let redis: Redis | null = null;

if (process.env['REDIS_URL']) {
  redis = new Redis(process.env['REDIS_URL'], {
    lazyConnect: true,
    retryStrategy: (t: number) => Math.min(t * 100, 3000),
    maxRetriesPerRequest: 2,
  });
  redis.on('connect', () => logger.info('[redis] Connected'));
  redis.on('error', (e: Error) => logger.warn('[redis] ' + e.message));
} else {
  logger.info('[redis] REDIS_URL not set — using in-memory cache fallback');
}

export default redis;
