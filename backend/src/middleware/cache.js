const cache = new Map();

const DEFAULT_TTL = 60000;

function cacheMiddleware(ttlMs = DEFAULT_TTL) {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = req.originalUrl || req.url;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data: body,
          expiresAt: Date.now() + ttlMs,
        });
        res.setHeader("X-Cache", "MISS");
      }
      return originalJson(body);
    };

    next();
  };
}

function clearCache(pattern) {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

function invalidateCache(path) {
  clearCache(path);
}

const CACHE_TTL = {
  SHORT: 10000,
  MEDIUM: 60000,
  LONG: 300000,
  ADMIN_SUMMARY: 30000,
  COMPLIANCE: 60000,
};

module.exports = { cacheMiddleware, clearCache, invalidateCache, CACHE_TTL };