import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTenantId, getTenantSlug, resolveTenantBySlug } from './tenant'

// Mock dependencies
vi.mock('@/lib/redis', () => ({
  getOrSet: vi.fn((key, cb) => cb())
}))

describe('tenant utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.__mockPrisma = {
      tenant: {
        findUnique: vi.fn()
      }
    }
  })

  it('getTenantId should extract tenant ID from headers', () => {
    const req = {
      headers: {
        get: (name) => (name === 'x-tenant-id' ? 'tenant-123' : null)
      }
    }
    expect(getTenantId(req)).toBe('tenant-123')
  })

  it('getTenantId should fallback to V School tenant ID if header is missing', () => {
    const req = { headers: { get: () => null } }
    expect(getTenantId(req)).toBe('10000000-0000-0000-0000-000000000001')
  })

  it('getTenantSlug should extract tenant slug from headers', () => {
    const req = {
      headers: {
        get: (name) => (name === 'x-tenant-slug' ? 'my-slug' : null)
      }
    }
    expect(getTenantSlug(req)).toBe('my-slug')
  })

  it('getTenantSlug should fallback to vschool if header is missing', () => {
    const req = { headers: { get: () => null } }
    expect(getTenantSlug(req)).toBe('vschool')
  })

  describe('resolveTenantBySlug', () => {
    it('should query prisma and return tenant if found', async () => {
      const mockTenant = { id: 't1', tenantSlug: 'vschool' }
      globalThis.__mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant)

      const result = await resolveTenantBySlug('vschool')
      expect(result).toEqual(mockTenant)
      expect(globalThis.__mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { tenantSlug: 'vschool' }
      })
    })

    it('should return null if tenant not found', async () => {
      globalThis.__mockPrisma.tenant.findUnique.mockResolvedValue(null)
      const result = await resolveTenantBySlug('ghost')
      expect(result).toBeNull()
    })
  })
})
