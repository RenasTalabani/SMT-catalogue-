const store = new Map();

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
};

const set = (key, data, ttlMs) => {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
};

const invalidate = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

module.exports = { get, set, invalidate };
