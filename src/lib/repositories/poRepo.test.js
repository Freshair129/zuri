import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('poRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('findMany', () => {
    it('should return paginated POs for tenant', async () => {
      const { findMany } = await import('./poRepo.js')
      mockPrisma.purchaseOrderV2.findMany.mockResolvedValue([])
      mockPrisma.purchaseOrderV2.count.mockResolvedValue(0)

      const result = await findMany(TENANT, { page: 1, limit: 10 })
      expect(mockPrisma.purchaseOrderV2.findMany).toHaveBeenCalled()
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('total')
    })
  })

  describe('create', () => {
    it('should create PO with items in transaction', async () => {
      const { create } = await import('./poRepo.js')
      const mockPO = { id: 'po1', poId: 'PO-20260330-001', items: [] }

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          purchaseOrderV2: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue(mockPO),
          },
        }
        return fn(tx)
      })

      const result = await create(TENANT, {
        supplierId: 's1',
        requestedById: 'emp1',
        items: [{ productId: 'p1', productType: 'INGREDIENT', productName: 'Salt', unit: 'kg', qtyOrdered: 10, unitCost: 50 }],
      })

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual(mockPO)
    })
  })

  describe('updateStatus', () => {
    it('should reject invalid status transitions', async () => {
      const { updateStatus } = await import('./poRepo.js')
      mockPrisma.purchaseOrderV2.findFirst.mockResolvedValue({ id: 'po1', status: 'CLOSED' })

      await expect(updateStatus(TENANT, 'po1', 'DRAFT')).rejects.toThrow()
    })
  })

  describe('approve', () => {
    it('should create approval and update status', async () => {
      const { approve } = await import('./poRepo.js')

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          pOApproval: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
          purchaseOrderV2: {
            findFirst: vi.fn().mockResolvedValue({ id: 'po1', status: 'DRAFT' }),
            update: vi.fn().mockResolvedValue({ id: 'po1', status: 'APPROVED' }),
          },
        }
        return fn(tx)
      })

      const result = await approve(TENANT, 'po1', 'emp1', 'APPROVE', 'Looks good')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })
  })
})
