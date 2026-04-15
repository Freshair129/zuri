import { vi } from 'vitest'

/**
 * Creates a mock Redis client for Upstash.
 */
export function createMockRedis() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
  }
}

/**
 * Mock for getOrSet utility
 */
export const getOrSetMock = vi.fn(async (key, fn, ttl) => {
  return fn()
})
