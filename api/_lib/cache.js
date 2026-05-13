/* Optional Upstash Redis cache. Degrades gracefully if env vars not set. */
let redis = null;

function getRedis() {
  if (redis) return redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({ url, token });
  } catch { redis = null; }
  return redis;
}

async function cacheGet(key) {
  const r = getRedis();
  if (!r) return null;
  try { return await r.get(key); } catch { return null; }
}

async function cacheSet(key, value, ttlSeconds = 21600) {
  const r = getRedis();
  if (!r) return;
  try { await r.setex(key, ttlSeconds, value); } catch {}
}

module.exports = { cacheGet, cacheSet };
