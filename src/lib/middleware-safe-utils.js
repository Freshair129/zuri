/**
 * ZDEV-IMP-2662: Nuclear Isolation Middleware Utilities
 * 
 * This file is a "Firewall" for the Next.js Middleware.
 * It strictly avoids importing any other file from @/lib to prevent
 * transitive dependency poisoning from Node.js-only modules.
 */

import { Redis } from '@upstash/redis'

// --- Isolated Rate Limiting (from rateLimit.js) ---

export const RATE_LIMIT_TIERS = {
  FREE: 100,
  PRO:  10_000,
}

const WINDOW_SECONDS = 3600 
let _redis = null

function getEdgeRedis() {
  if (_redis) return _redis
  
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  // Stricter environment and runtime feature guarding
  if (!url || !token || typeof fetch === 'undefined') {
    return null
  }
  
  try {
    _redis = new Redis({ url, token })
    return _redis
  } catch (e) {
    console.error('[RateLimit-Safe] Redis instantiation failed:', e.message)
    return null
  }
}

export async function checkRateLimit({ tenantId, userId, plan = 'FREE' }) {
  const limit      = RATE_LIMIT_TIERS[plan] ?? RATE_LIMIT_TIERS.FREE
  const windowKey  = Math.floor(Date.now() / (WINDOW_SECONDS * 1000))
  const reset      = (windowKey + 1) * WINDOW_SECONDS
  const key        = `rl:${tenantId}:${userId ?? 'anon'}:${windowKey}`

  const r = getEdgeRedis()
  if (!r) {
    console.warn('[RateLimit-Safe] Redis unavailable — fail-open')
    return { allowed: true, limit, remaining: limit, reset }
  }

  try {
    const count = await r.incr(key)
    if (count === 1) await r.expire(key, WINDOW_SECONDS)
    const remaining = Math.max(0, limit - count)
    return { allowed: count <= limit, limit, remaining, reset }
  } catch (err) {
    console.error('[RateLimit-Safe] Redis error — fail-open:', err.message)
    return { allowed: true, limit, remaining: limit, reset }
  }
}

// --- Isolated RBAC (from permissionMatrix.js) ---

const F = 'F'  // Full CRUD
const A = 'A'  // Approve
const R = 'R'  // Read
const N = 'N'  // None

export const permissionMatrix = {
  DEV:     { dashboard: F, customers: F, inbox: F, marketing: F, kitchen: F, orders: F, employees: F, accounting: F, audit: F, system: F },
  OWNER:   { dashboard: F, customers: F, inbox: F, marketing: F, kitchen: F, orders: A, employees: F, accounting: F, audit: R, system: N },
  MANAGER: { dashboard: F, customers: F, inbox: F, marketing: F, kitchen: F, orders: F, employees: F, accounting: R, audit: R, system: N },
  SALES:   { dashboard: R, customers: F, inbox: F, marketing: F, kitchen: N, orders: F, employees: N, accounting: N, audit: N, system: N },
  KITCHEN: { dashboard: R, customers: N, inbox: N, marketing: N, kitchen: F, orders: N, employees: N, accounting: N, audit: N, system: N },
  FINANCE: { dashboard: R, customers: R, inbox: N, marketing: N, kitchen: N, orders: R, employees: N, accounting: F, audit: N, system: N },
  STAFF:   { dashboard: R, customers: R, inbox: R, marketing: N, kitchen: R, orders: R, employees: N, accounting: N, audit: N, system: N },
}

export function can(roles, domain, action = 'R') {
  const roleList = Array.isArray(roles) ? roles : [roles]
  const levels = { N: 0, R: 1, A: 2, F: 3 }

  return roleList.some(role => {
    const perm = permissionMatrix[role]?.[domain]
    return perm && levels[perm] >= levels[action]
  })
}
