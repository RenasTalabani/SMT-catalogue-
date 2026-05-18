/**
 * Cache utility — uses Redis when REDIS_URL is set, falls back to in-memory Map.
 * All functions are async so callers work identically regardless of backend.
 */
let redis = null;
try {
  if (process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect:   true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 1,
    });
    redis.on('connect', () => console.log('[cache] Redis connected'));
    redis.on('error',   (e) => console.warn('[cache] Redis error — using memory fallback:', e.message));
  }
} catch {
  redis = null;
}

const memStore = new Map();

const get = async (key) => {
  try {
    if (redis) {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    }
  } catch { redis = null; }

  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.data;
};

const set = async (key, data, ttlSec) => {
  try {
    if (redis) { await redis.set(key, JSON.stringify(data), 'EX', ttlSec); return; }
  } catch { redis = null; }
  memStore.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
};

const invalidate = async (prefix) => {
  try {
    if (redis) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
      return;
    }
  } catch { redis = null; }
  for (const key of memStore.keys()) {
    if (key.startsWith(prefix)) memStore.delete(key);
  }
};

module.exports = { get, set, invalidate };
