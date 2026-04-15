import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

// Mock Redis (ADR-056)
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
  },
  getOrSet: vi.fn((key, fn) => fn()),
}))

describe('customerRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('getCustomerById', () => {
    it('should fetch a customer with profile and conversations for the given tenant', async () => {
      const { getCustomerById } = await import('./customerRepo.js')
      const tenantId = 'tenant-123'
      const customerId = 'cust-456'
      const mockCustomer = { id: customerId, tenantId, facebookName: 'John Doe' }

      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer)

      const result = await getCustomerById(tenantId, customerId)

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: customerId, tenantId, deletedAt: null },
        include: {
          profile: true,
          insight: true,
          enrollments: { 
            take: 5, 
            orderBy: { enrolledAt: 'desc' },
            include: { product: true }
          },
          _count: {
            select: { orders: true, enrollments: true, conversations: true }
          }
        }
      })
      expect(result).toEqual({ ...mockCustomer, displayName: 'John Doe' })
    })

    it('should return null if customer does not exist for the tenant', async () => {
      const { getCustomerById } = await import('./customerRepo.js')
      mockPrisma.customer.findFirst.mockResolvedValue(null)
      const result = await getCustomerById('t1', 'c1')
      expect(result).toBeNull()
    })
  })

  describe('updateCustomer', () => {
    it('should update customer fields and upsert profile data', async () => {
      const { updateCustomer } = await import('./customerRepo.js')
      const tenantId = 'tenant-123'
      const customerId = 'cust-456'
      const updates = {
        facebookName: 'John Updated',
        profile: { address: '123 New St' }
      }

      mockPrisma.customer.update.mockResolvedValue({ id: customerId, ...updates })

      const result = await updateCustomer(tenantId, customerId, updates)

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId, tenantId },
        data: {
          facebookName: 'John Updated',
          profile: {
            upsert: {
              create: { address: '123 New St' },
              update: { address: '123 New St' }
            }
          }
        },
        include: { profile: true }
      })
      expect(result.facebookName).toBe('John Updated')
    })
  })
})
