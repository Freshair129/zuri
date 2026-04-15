import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('ingredientRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('deductFEFO', () => {
    it('should deduct from the earliest lot first (FEFO)', async () => {
      const { deductFEFO } = await import('./ingredientRepo.js')
      const ingredientId = 'ing-1'
      
      // Mock ingredient with two lots
      const mockIngredient = {
        id: ingredientId,
        tenantId: TENANT,
        lots: [
          { id: 'lot-old', remainingQty: 10, expiresAt: new Date('2026-05-01') },
          { id: 'lot-new', remainingQty: 10, expiresAt: new Date('2026-06-01') },
        ]
      }

      mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient)
      mockPrisma.ingredientLot.update.mockResolvedValue({})
      mockPrisma.ingredient.update.mockResolvedValue({})

      // Deduct 15 (10 from lot-old, 5 from lot-new)
      const result = await deductFEFO(TENANT, ingredientId, 15)

      expect(result.deducted).toBe(15)
      expect(result.lotsAffected).toHaveLength(2)
      
      // Check lot-old deduction
      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'lot-old' },
        data: expect.objectContaining({ remainingQty: { decrement: 10 }, status: 'EXHAUSTED' })
      }))
      
      // Check lot-new deduction
      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'lot-new' },
        data: expect.objectContaining({ remainingQty: { decrement: 5 }, status: 'ACTIVE' })
      }))

      // Check denormalized stock update
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: ingredientId },
        data: { currentStock: { decrement: 15 } }
      }))
    })

    it('should throw error if ingredient not found', async () => {
      const { deductFEFO } = await import('./ingredientRepo.js')
      mockPrisma.ingredient.findFirst.mockResolvedValue(null)

      await expect(deductFEFO(TENANT, 'missing', 10)).rejects.toThrow('Ingredient not found')
    })
  })
})
