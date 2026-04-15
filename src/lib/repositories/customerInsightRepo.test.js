import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

describe('customerInsightRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('getInsightByCustomerId', () => {
    it('should fetch AI insight for a customer with tenant isolation', async () => {
      const { getInsightByCustomerId } = await import('./customerInsightRepo.js')
      const tenantId = 't1'
      const customerId = 'c1'
      const mockInsight = { id: 'i1', customerId, tenantId, summary: 'High intent' }

      mockPrisma.customerInsight.findUnique.mockResolvedValue(mockInsight)

      const result = await getInsightByCustomerId(tenantId, customerId)

      expect(mockPrisma.customerInsight.findUnique).toHaveBeenCalledWith({
        where: { customerId, tenantId }
      })
      expect(result).toEqual(mockInsight)
    })
  })

  describe('upsertInsight', () => {
    it('should update customer scores and upsert insight data in a transaction', async () => {
      const { upsertInsight } = await import('./customerInsightRepo.js')
      const tenantId = 't1'
      const customerId = 'c1'
      const data = {
        intentScore: 85,
        churnScore: 10,
        summary: 'Ready to buy'
      }

      mockPrisma.customer.update.mockResolvedValue({ id: customerId })
      mockPrisma.customerInsight.upsert.mockResolvedValue({ id: 'i1', ...data })

      const result = await upsertInsight(tenantId, customerId, data)

      // Verify transaction behavior
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId, tenantId },
        data: { intentScore: 85, churnScore: 10 }
      })
      expect(mockPrisma.customerInsight.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { customerId, tenantId },
        create: expect.objectContaining({ summary: 'Ready to buy' })
      }))
      expect(result.summary).toBe('Ready to buy')
    })
  })

  describe('updateTenantPatterns', () => {
    it('should upsert aggregate patterns for the tenant', async () => {
      const { updateTenantPatterns } = await import('./customerInsightRepo.js')
      const tenantId = 't1'
      const patterns = { topObjections: ['price'], topInterests: ['course'] }

      mockPrisma.tenantCRMPattern.upsert.mockResolvedValue({ id: 'p1', ...patterns })

      const result = await updateTenantPatterns(tenantId, patterns)

      expect(mockPrisma.tenantCRMPattern.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { tenantId },
        create: expect.objectContaining({ topObjections: ['price'] })
      }))
      expect(result.topInterests).toContain('course')
    })
  })
})
