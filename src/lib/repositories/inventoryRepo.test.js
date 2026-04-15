import { describe, it, expect, beforeEach } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('inventoryRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('getStockLevels', () => {
    it('should return stock levels filtered by tenant', async () => {
      const { getStockLevels } = await import('./inventoryRepo.js')
      mockPrisma.warehouseStock.findMany.mockResolvedValue([
        { id: '1', productId: 'P1', qty: 100, reorderPoint: 20 },
      ])

      const result = await getStockLevels(TENANT, {})
      expect(mockPrisma.warehouseStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) })
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('createMovement', () => {
    it('should create movement and upsert stock in transaction', async () => {
      const { createMovement } = await import('./inventoryRepo.js')
      const movement = { id: 'm1', movementId: 'mv-1', qty: 50 }

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          stockMovement: { create: vi.fn().mockResolvedValue(movement) },
          warehouseStock: { upsert: vi.fn().mockResolvedValue({ qty: 150 }) },
        }
        return fn(tx)
      })

      const result = await createMovement(TENANT, {
        warehouseId: 'w1', productId: 'p1', productType: 'PRODUCT',
        type: 'RECEIVE', qty: 50,
      })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual(movement)
    })
  })

  describe('findWarehouses', () => {
    it('should filter by tenant and isActive', async () => {
      const { findWarehouses } = await import('./inventoryRepo.js')
      mockPrisma.warehouse.findMany.mockResolvedValue([])

      await findWarehouses(TENANT, { isActive: true })
      expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, isActive: true })
        })
      )
    })
  })
})
