import type { Redis } from 'ioredis';
import { CacheEntry } from '../../types';

let _redis: Redis | null = null;
let _redisInitialized = false;

const getRedis = (): Redis | null => {
  if (_redisInitialized) return _redis;
  _redisInitialized = true;

  if (!process.env['REDIS_URL']) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IoRedis = require('ioredis') as unknown as new (url: string, options?: object) => Redis;
    _redis = new IoRedis(process.env['REDIS_URL'], {
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 1,
    });
    _redis.on('connect', () => console.log('[cache] Redis connected'));
    _redis.on('error', (e: Error) => {
      console.warn('[cache] Redis error — using memory fallback:', e.message);
      _redis = null;
    });
  } catch {
    _redis = null;
  }

  return _redis;
};

const memStore = new Map<string, CacheEntry<unknown>>();

export const get = async <T>(key: string): Promise<T | null> => {
  const redis = getRedis();
  try {
    if (redis) {
      const val = await redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    }
  } catch {
    _redis = null;
  }

  const entry = memStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
  return entry.data;
};

export const set = async <T>(key: string, data: T, ttlSec: number): Promise<void> => {
  const redis = getRedis();
  try {
    if (redis) {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSec);
      return;
    }
  } catch {
    _redis = null;
  }
  memStore.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
};

export const invalidate = async (prefix: string): Promise<void> => {
  const redis = getRedis();
  try {
    if (redis) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(...keys);
      return;
    }
  } catch {
    _redis = null;
  }
  for (const key of memStore.keys()) {
    if (key.startsWith(prefix)) memStore.delete(key);
  }
};
