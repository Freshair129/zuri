import { describe, it, expect, beforeEach } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'

describe('supplierRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('findMany', () => {
    it('should search suppliers by name', async () => {
      const { findMany } = await import('./supplierRepo.js')
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: '1', name: 'Makro', tenantId: TENANT },
      ])

      const result = await findMany(TENANT, { search: 'Makro' })
      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT })
        })
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by isActive', async () => {
      const { findMany } = await import('./supplierRepo.js')
      mockPrisma.supplier.findMany.mockResolvedValue([])

      await findMany(TENANT, { isActive: true })
      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      )
    })
  })

  describe('create', () => {
    it('should generate supplierId and create supplier', async () => {
      const { create } = await import('./supplierRepo.js')
      mockPrisma.supplier.create.mockResolvedValue({ id: '1', supplierId: 'SUP-ABC12345', name: 'Makro' })

      const result = await create(TENANT, { name: 'Makro', phone: '021234567' })
      expect(mockPrisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, name: 'Makro' })
        })
      )
      expect(result).toHaveProperty('supplierId')
    })
  })

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const { deactivate } = await import('./supplierRepo.js')
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: '1' })
      mockPrisma.supplier.update.mockResolvedValue({ id: '1', isActive: false })

      const result = await deactivate(TENANT, '1')
      expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false })
        })
      )
    })
  })
})
