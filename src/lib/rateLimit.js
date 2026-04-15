// Created At: 2026-04-10 03:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:30:00 +07:00 (v1.0.0)

import { Redis } from '@upstash/redis'

/**
 * Per-tenant API call limits per hour.
 * Aligned with Zuri subscription tiers.
 */
export const RATE_LIMIT_TIERS = {
  FREE: 100,
  PRO:  10_000,
}

const WINDOW_SECONDS = 3600 // 1-hour fixed window

let _redis = null

/**
 * Minimal Redis client for Edge-compatible rate limiting.
 * Does not use the shared singleton from lib/redis.js to
 * avoid Node.js-only patterns in Next.js middleware (Edge Runtime).
 */
function getEdgeRedis() {
  if (_redis) return _redis
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  _redis = new Redis({ url, token })
  return _redis
}

/**
 * Fixed-window (per-hour) rate limiter using Redis INCR.
 *
 * Key format: rl:{tenantId}:{userId|anon}:{hourBucket}
 * Fail-open: if Redis is unavailable, the request is allowed.
 *
 * @param {object} opts
 * @param {string}           opts.tenantId
 * @param {string|undefined} opts.userId
 * @param {'FREE'|'PRO'}     [opts.plan='FREE']
 * @returns {Promise<{ allowed: boolean, limit: number, remaining: number, reset: number }>}
 */
export async function checkRateLimit({ tenantId, userId, plan = 'FREE' }) {
  const limit      = RATE_LIMIT_TIERS[plan] ?? RATE_LIMIT_TIERS.FREE
  const windowKey  = Math.floor(Date.now() / (WINDOW_SECONDS * 1000))
  const reset      = (windowKey + 1) * WINDOW_SECONDS           // Unix epoch seconds
  const key        = `rl:${tenantId}:${userId ?? 'anon'}:${windowKey}`

  const r = getEdgeRedis()
  if (!r) {
    console.warn('[RateLimit] Redis unavailable — fail-open')
    return { allowed: true, limit, remaining: limit, reset }
  }

  try {
    const count = await r.incr(key)
    if (count === 1) await r.expire(key, WINDOW_SECONDS)
    const remaining = Math.max(0, limit - count)
    return { allowed: count <= limit, limit, remaining, reset }
  } catch (err) {
    console.error('[RateLimit] Redis error — fail-open:', err.message)
    return { allowed: true, limit, remaining: limit, reset }
  }
}
