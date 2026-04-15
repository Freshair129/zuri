import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mock dependencies
// ─────────────────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001'

// Active FlowAccount config
const faConfig = {
  id: 'cfg-fa',
  tenantId: TENANT,
  provider: 'flowaccount',
  isActive: true,
  oauthAccessTokenEnc: 'enc-token',
  oauthRefreshTokenEnc: 'enc-refresh',
  oauthExpiresAt: new Date(Date.now() + 3_600_000),
  syncMode: 'daily',
  accountMappingJson: {},
  syncOptionsJson: {},
}

// Active Express config
const expressConfig = {
  id: 'cfg-ex',
  tenantId: TENANT,
  provider: 'express',
  isActive: true,
  syncMode: 'auto',
  accountantEmail: 'acc@test.com',
  accountMappingJson: {},
}

const mockOrder = {
  id: 'order-uuid-1',
  orderId: 'ORD-20260409-001',
  tenantId: TENANT,
  status: 'PAID',
  date: new Date('2026-04-09'),
  customer: { name: 'Test Customer' },
  items: [{ name: 'Item', qty: 1, unitPrice: 1000, discount: 0 }],
  discountAmount: 0,
  vatAmount: 70,
  totalAmount: 1070,
  orderType: 'TAKEAWAY',
}

const mockPrisma = {
  integrationConfig: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  integrationSyncLog: {
    create: vi.fn().mockResolvedValue({}),
  },
  integrationDocumentRef: {
    findFirst: vi.fn(),
    upsert: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  order: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({ getPrisma: () => mockPrisma }))

vi.mock('./FlowAccountAdapter.js', () => ({
  syncInvoice: vi.fn(),
  syncContact: vi.fn(),
  syncExpense: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
}))

vi.mock('./ExpressAdapter.js', () => ({
  generateXImportFile: vi.fn(),
  sendToAccountant: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// getActiveConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('getActiveConfig', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns config from DB when active', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(faConfig)
    const { getActiveConfig } = await import('./AccountingService.js')
    const config = await getActiveConfig(TENANT)
    expect(config.provider).toBe('flowaccount')
  })

  it('returns null when no active config', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(null)
    const { getActiveConfig } = await import('./AccountingService.js')
    const config = await getActiveConfig(TENANT)
    expect(config).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// syncOrderToFlowAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('syncOrderToFlowAccount', () => {
  afterEach(() => vi.clearAllMocks())

  it('skips when no active config', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(null)
    const { syncOrderToFlowAccount } = await import('./AccountingService.js')
    const result = await syncOrderToFlowAccount(TENANT, 'order-id-1')
    expect(result.skipped).toBe(true)
  })

  it('skips when provider is not flowaccount', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(expressConfig)
    const { syncOrderToFlowAccount } = await import('./AccountingService.js')
    const result = await syncOrderToFlowAccount(TENANT, 'order-id-1')
    expect(result.skipped).toBe(true)
  })

  it('skips when order is already synced (idempotency)', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(faConfig)
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue({ status: 'synced' })

    const { syncOrderToFlowAccount } = await import('./AccountingService.js')
    const result = await syncOrderToFlowAccount(TENANT, 'order-id-1')

    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('already_synced')
  })

  it('skips when order status is not PAID', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(faConfig)
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue(null)
    mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: 'PENDING' })

    const { syncOrderToFlowAccount } = await import('./AccountingService.js')
    const result = await syncOrderToFlowAccount(TENANT, mockOrder.id)

    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('not_paid')
  })

  it('calls FlowAccount.syncInvoice and upserts document ref on success', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(faConfig)
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue(null)
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder)
    syncInvoice.mockResolvedValue({ synced: true, flowAccountId: 'fa-001', referenceNumber: 'ZRI-ORD-001' })

    const { syncOrderToFlowAccount } = await import('./AccountingService.js')
    const result = await syncOrderToFlowAccount(TENANT, mockOrder.id)

    expect(syncInvoice).toHaveBeenCalledOnce()
    expect(mockPrisma.integrationDocumentRef.upsert).toHaveBeenCalledOnce()
    expect(result.synced).toBe(true)
    expect(result.flowAccountId).toBe('fa-001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// syncDailyOrdersToFlowAccount
// ─────────────────────────────────────────────────────────────────────────────

describe('syncDailyOrdersToFlowAccount', () => {
  afterEach(() => vi.clearAllMocks())

  it('syncs all non-duplicate paid orders and returns counts', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    mockPrisma.order.findMany.mockResolvedValue([mockOrder])
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue(null)
    syncInvoice.mockResolvedValue({ synced: true, flowAccountId: 'fa-001' })

    const { syncDailyOrdersToFlowAccount } = await import('./AccountingService.js')
    const result = await syncDailyOrdersToFlowAccount(TENANT, faConfig)

    expect(result.total).toBe(1)
    expect(result.success).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('counts already-synced orders as success (skipped, not re-synced)', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    mockPrisma.order.findMany.mockResolvedValue([mockOrder])
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue({ status: 'synced' })

    const { syncDailyOrdersToFlowAccount } = await import('./AccountingService.js')
    await syncDailyOrdersToFlowAccount(TENANT, faConfig)

    expect(syncInvoice).not.toHaveBeenCalled()
  })

  it('records failed count and error details on FlowAccount API error', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    mockPrisma.order.findMany.mockResolvedValue([mockOrder])
    mockPrisma.integrationDocumentRef.findFirst.mockResolvedValue(null)
    syncInvoice.mockRejectedValue(new Error('Rate limit exceeded'))

    const { syncDailyOrdersToFlowAccount } = await import('./AccountingService.js')
    const result = await syncDailyOrdersToFlowAccount(TENANT, faConfig)

    expect(result.failed).toBe(1)
    expect(result.errorDetails[0].error).toContain('Rate limit')
  })

  it('returns zero counts when no orders found', async () => {
    mockPrisma.order.findMany.mockResolvedValue([])
    const { syncDailyOrdersToFlowAccount } = await import('./AccountingService.js')
    const result = await syncDailyOrdersToFlowAccount(TENANT, faConfig)
    expect(result.total).toBe(0)
    expect(result.success).toBe(0)
    expect(result.failed).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// runExpressExport
// ─────────────────────────────────────────────────────────────────────────────

describe('runExpressExport', () => {
  afterEach(() => vi.clearAllMocks())

  it('skips when no express config found', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(null)
    const { runExpressExport } = await import('./AccountingService.js')
    const result = await runExpressExport(TENANT, null)
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('no_express_config')
  })

  it('skips when provider is not express', async () => {
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(faConfig)
    const { runExpressExport } = await import('./AccountingService.js')
    const result = await runExpressExport(TENANT, null)
    expect(result.skipped).toBe(true)
  })

  it('generates XLSX and sends email for auto mode', async () => {
    const { generateXImportFile, sendToAccountant } = await import('./ExpressAdapter.js')
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(expressConfig)

    generateXImportFile.mockResolvedValue({
      buffer: Buffer.from('fake-xlsx'),
      ordersCount: 3,
      expensesCount: 2,
    })
    sendToAccountant.mockResolvedValue({ sent: true, emailId: 'em-001' })

    const { runExpressExport } = await import('./AccountingService.js')
    const result = await runExpressExport(TENANT, '2026-04-09')

    expect(generateXImportFile).toHaveBeenCalledOnce()
    expect(sendToAccountant).toHaveBeenCalledOnce()
    expect(result.ok).toBe(true)
    expect(result.ordersCount).toBe(3)
    expect(result.expensesCount).toBe(2)
    expect(result.emailSent).toBe(true)
    expect(result.buffer).toBeDefined() // base64
  })

  it('does NOT send email for manual mode', async () => {
    const { generateXImportFile, sendToAccountant } = await import('./ExpressAdapter.js')
    mockPrisma.integrationConfig.findFirst.mockResolvedValue({
      ...expressConfig,
      syncMode: 'manual',
    })

    generateXImportFile.mockResolvedValue({
      buffer: Buffer.from('fake-xlsx'),
      ordersCount: 1,
      expensesCount: 0,
    })

    const { runExpressExport } = await import('./AccountingService.js')
    await runExpressExport(TENANT, '2026-04-09')

    expect(sendToAccountant).not.toHaveBeenCalled()
  })

  it('writes sync log on success', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    mockPrisma.integrationConfig.findFirst.mockResolvedValue(expressConfig)
    generateXImportFile.mockResolvedValue({ buffer: Buffer.from('x'), ordersCount: 2, expensesCount: 1 })

    const { runExpressExport } = await import('./AccountingService.js')
    await runExpressExport(TENANT, '2026-04-09')

    expect(mockPrisma.integrationSyncLog.create).toHaveBeenCalledOnce()
    const logArgs = mockPrisma.integrationSyncLog.create.mock.calls[0][0].data
    expect(logArgs.provider).toBe('express')
    expect(logArgs.total).toBe(3)
    expect(logArgs.failed).toBe(0)
  })
})
