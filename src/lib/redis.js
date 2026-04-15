import { Redis } from '@upstash/redis'

// Internal instance singleton
let _redis = null

/**
 * Ensures the Redis instance is initialized and returns it.
 * Used internally by getOrSet and provided as a getter.
 */
export function getRedis() {
  if (_redis !== null) return _redis

  try {
    const rawUrl = process.env.UPSTASH_REDIS_REST_URL || ''
    const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN || ''

    // Aggressive sanitization: strip everything except alphanumeric, dots, hyphens, slashes, and colons
    const cleanUrl = rawUrl.replace(/[^\w\-.~:/?#[\]@!$&'()*+,;=]/g, '').trim()
    const cleanToken = rawToken.replace(/[^\w.\-]/g, '').trim()

    if (!cleanUrl || !cleanToken) {
      console.warn('[Redis] Missing credentials, bypassing cache.')
      return null
    }

    _redis = new Redis({
      url: cleanUrl,
      token: cleanToken,
    })
    return _redis
  } catch (error) {
    console.error('[Redis] Initialization failed:', error.message)
    return null
  }
}

/** 
 * Exported redis instance for direct usage (e.g. keys, del).
 * Uses a Proxy to ensure lazy initialization on first use and handle missing credentials gracefully.
 */
export const redis = new Proxy({}, {
  get(target, prop) {
    const r = getRedis()
    if (!r) {
      // Return dummy async functions to prevent crashes in repositories if Redis is unavailable
      return async () => {
        if (prop === 'keys') return []
        return null
      }
    }
    const value = r[prop]
    // Bind functions to the instance to maintain 'this' context
    return typeof value === 'function' ? value.bind(r) : value
  }
})

/** Reset singleton so next call re-initializes (used after connection errors) */
export function resetRedis() {
  _redis = null
}

/**
 * Cache-aside pattern: get from cache or compute + store
 * @param {string} key
 * @param {Function} fn - async function to compute value
 * @param {number} ttl - seconds (default 300 = 5 min)
 */
export async function getOrSet(key, fn, ttl = 300) {
  const r = getRedis()

  // FAIL-SAFE: If Redis is not initialized, bypass cache and run the function directly
  if (!r) {
    return await fn()
  }

  try {
    const cached = await r.get(key)
    if (cached !== null) return cached

    const value = await fn()
    if (value !== null && value !== undefined) {
      await r.set(key, JSON.stringify(value), { ex: ttl })
    }
    return value
  } catch (error) {
    console.error('[Redis] Cache operation failed, falling back to DB:', error.message)
    // Reset singleton so next request gets a fresh connection attempt
    // instead of reusing a broken instance indefinitely
    resetRedis()
    return await fn()
  }
}
