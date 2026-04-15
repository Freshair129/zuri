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

const TENANT_A = '10000000-0000-0000-0000-000000000001'
const TENANT_B = '20000000-0000-0000-0000-000000000002'

describe('Multi-tenant isolation', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  it('inventoryRepo.getStockLevels should filter by tenantId', async () => {
    const { getStockLevels } = await import('@/lib/repositories/inventoryRepo.js')
    mockPrisma.warehouseStock.findMany.mockResolvedValue([])

    await getStockLevels(TENANT_A, {})
    const call = mockPrisma.warehouseStock.findMany.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_A)
  })

  it('poRepo.findMany should filter by tenantId', async () => {
    const { findMany } = await import('@/lib/repositories/poRepo.js')
    mockPrisma.purchaseOrderV2.findMany.mockResolvedValue([])
    mockPrisma.purchaseOrderV2.count.mockResolvedValue(0)

    await findMany(TENANT_B, {})
    const call = mockPrisma.purchaseOrderV2.findMany.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_B)
  })

  it('supplierRepo.findMany should filter by tenantId', async () => {
    const { findMany } = await import('@/lib/repositories/supplierRepo.js')
    mockPrisma.supplier.findMany.mockResolvedValue([])

    await findMany(TENANT_A, {})
    const call = mockPrisma.supplier.findMany.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_A)
  })

  it('auditRepo.findByTenant should scope to tenant', async () => {
    const { findByTenant } = await import('@/lib/repositories/auditRepo.js')
    mockPrisma.auditLog.findMany.mockResolvedValue([])

    await findByTenant(TENANT_A, { action: 'CREATE' })
    const call = mockPrisma.auditLog.findMany.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_A)
    expect(call.where.action).toBe('CREATE')
  })

  it('customerRepo.findById should scope to tenant', async () => {
    const { findById } = await import('@/lib/repositories/customerRepo.js')
    mockPrisma.customer.findFirst.mockResolvedValue(null)

    await findById(TENANT_B, 'some-id')
    const call = mockPrisma.customer.findFirst.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_B)
    expect(call.where.id).toBe('some-id')
  })

  it('customerRepo.updateCustomer should scope to tenant', async () => {
    const { updateCustomer } = await import('@/lib/repositories/customerRepo.js')
    mockPrisma.customer.update.mockResolvedValue({})

    await updateCustomer(TENANT_A, 'cust-1', { facebookName: 'Isolated Name' })
    const call = mockPrisma.customer.update.mock.calls[0][0]
    expect(call.where.tenantId).toBe(TENANT_A)
    expect(call.where.id).toBe('cust-1')
  })

  it('auditRepo.create should save tenantId', async () => {
    const { create } = await import('@/lib/repositories/auditRepo.js')
    mockPrisma.auditLog.create.mockResolvedValue({})

    await create(TENANT_B, 'actor-1', 'ACTION', 'target-1')
    const call = mockPrisma.auditLog.create.mock.calls[0][0]
    expect(call.data.tenantId).toBe(TENANT_B)
  })
})

