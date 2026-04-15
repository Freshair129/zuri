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

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('orderRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('processPayment', () => {
    it('should update status to PAID and trigger inventory deduction', async () => {
      const { processPayment } = await import('./orderRepo.js')
      const orderId = 'order-1'
      const mockOrder = {
        id: orderId,
        tenantId: TENANT,
        status: 'PENDING',
        totalAmount: 100,
        items: [
          { productId: 'prod-1', name: 'Product 1', qty: 2, unitPrice: 50, totalPrice: 100 }
        ]
      }

      // Mock finding product and ingredients
      const mockProduct = {
        id: 'prod-1',
        recipes: [
          {
            recipe: {
              ingredients: [
                { id: 'ri-1', ingredientId: 'ing-1', qty: 100 } // 100g per item
              ]
            }
          }
        ]
      }

      const mockIngredient = {
        id: 'ing-1',
        lots: [
          { id: 'lot-1', remainingQty: 1000, expiresAt: new Date() }
        ]
      }

      mockPrisma.order.findFirst.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' })
      mockPrisma.transaction.create.mockResolvedValue({})
      
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct)
      mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient)
      mockPrisma.ingredientLot.update.mockResolvedValue({})
      mockPrisma.ingredient.update.mockResolvedValue({})

      const result = await processPayment(TENANT, orderId, { method: 'CASH', cashReceived: 100 })

      expect(result.status).toBe('PAID')
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ method: 'CASH', amount: 100 })
      }))

      // Verify inventory was deducted (2 qty * 100g = 200g)
      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'lot-1' },
        data: expect.objectContaining({ remainingQty: { decrement: 200 } })
      }))
    })

    it('should skip inventory deduction for custom items (no productId)', async () => {
      const { processPayment } = await import('./orderRepo.js')
      const orderId = 'order-2'
      const mockOrder = {
        id: orderId,
        tenantId: TENANT,
        status: 'PENDING',
        totalAmount: 50,
        items: [
          { productId: null, name: 'Quick Sale', qty: 1, unitPrice: 50, totalPrice: 50 }
        ]
      }

      mockPrisma.order.findFirst.mockResolvedValue(mockOrder)
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'PAID' })
      mockPrisma.transaction.create.mockResolvedValue({})

      await processPayment(TENANT, orderId, { method: 'CASH', cashReceived: 50 })

      // Deduction logic should not be triggered as there is no productId
      expect(mockPrisma.product.findFirst).not.toHaveBeenCalled()
    })
  })
})
