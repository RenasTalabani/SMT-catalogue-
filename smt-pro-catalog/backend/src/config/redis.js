const logger = require('../shared/utils/logger.util');

let redis = null;

if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect:          true,
    retryStrategy:        (t) => Math.min(t * 100, 3000),
    maxRetriesPerRequest: 2,
  });
  redis.on('connect', () => logger.info('[redis] Connected'));
  redis.on('error',   (e) => logger.warn('[redis] ' + e.message));
} else {
  logger.info('[redis] REDIS_URL not set — using in-memory cache fallback');
}

module.exports = redis;
