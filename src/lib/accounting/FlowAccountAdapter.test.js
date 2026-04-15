import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mock dependencies
// ─────────────────────────────────────────────────────────────────────────────

const TEST_KEY = 'a'.repeat(64)
const FUTURE = new Date(Date.now() + 3_600_000) // 1h from now

const mockConfig = {
  id: 'cfg-1',
  tenantId: 'tenant-1',
  provider: 'flowaccount',
  oauthAccessTokenEnc: null, // set per test
  oauthRefreshTokenEnc: null,
  oauthExpiresAt: FUTURE,
  accountMappingJson: {},
  syncOptionsJson: {},
}

const mockPrisma = {
  integrationConfig: {
    update: vi.fn().mockResolvedValue({}),
  },
}

vi.mock('@/lib/db', () => ({ getPrisma: () => mockPrisma }))

vi.stubEnv('ACCOUNTING_ENCRYPTION_KEY', TEST_KEY)
vi.stubEnv('FLOWACCOUNT_CLIENT_ID', 'test-client-id')
vi.stubEnv('FLOWACCOUNT_CLIENT_SECRET', 'test-client-secret')

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function makeConfig(overrides = {}) {
  const { encrypt } = await import('@/lib/crypto')
  return {
    ...mockConfig,
    oauthAccessTokenEnc: encrypt('access-token-abc'),
    oauthRefreshTokenEnc: encrypt('refresh-token-xyz'),
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getAccessToken
// ─────────────────────────────────────────────────────────────────────────────

describe('getAccessToken', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns decrypted access token when not expired', async () => {
    const { getAccessToken } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig({ oauthExpiresAt: FUTURE })
    const token = await getAccessToken(config)
    expect(token).toBe('access-token-abc')
  })

  it('refreshes token when expired and updates DB', async () => {
    const { getAccessToken } = await import('./FlowAccountAdapter.js')
    const expiredAt = new Date(Date.now() - 1000) // already expired

    const config = await makeConfig({ oauthExpiresAt: expiredAt })

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      }),
    })

    const token = await getAccessToken(config)

    expect(token).toBe('new-access-token')
    expect(mockPrisma.integrationConfig.update).toHaveBeenCalledOnce()
    const updateCall = mockPrisma.integrationConfig.update.mock.calls[0][0]
    expect(updateCall.where.id).toBe('cfg-1')
    expect(updateCall.data.oauthExpiresAt).toBeInstanceOf(Date)
  })

  it('throws when token refresh API returns error', async () => {
    const { getAccessToken } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig({ oauthExpiresAt: new Date(Date.now() - 1000) })

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error_description: 'invalid_grant' }),
    })

    await expect(getAccessToken(config)).rejects.toThrow(/token refresh failed/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// syncInvoice
// ─────────────────────────────────────────────────────────────────────────────

describe('syncInvoice', () => {
  afterEach(() => vi.clearAllMocks())

  const mockOrder = {
    orderId: 'ORD-20260410-001',
    date: new Date('2026-04-10'),
    customer: { name: 'ลูกค้าทดสอบ' },
    items: [{ name: 'คอร์สซูชิ', qty: 2, unitPrice: 1500, discount: 0 }],
    discountAmount: 0,
    vatAmount: 210,
    totalAmount: 3210,
    orderType: 'ONSITE',
  }

  it('POSTs to /cash-invoices with ZRI- reference', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig()

    // dedup check returns empty (not duplicate)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })   // checkDuplicate GET
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'fa-inv-001' } }) }) // POST

    const result = await syncInvoice(mockOrder, config)

    expect(result.synced).toBe(true)
    expect(result.referenceNumber).toBe('ZRI-ORD-20260410-001')
    expect(result.flowAccountId).toBe('fa-inv-001')

    // Verify the POST body
    const postCall = global.fetch.mock.calls[1]
    const body = JSON.parse(postCall[1].body)
    expect(body.referenceNumber).toBe('ZRI-ORD-20260410-001')
    expect(body.totalAmount).toBe(3210)
  })

  it('skips when ZRI- reference already exists (idempotency)', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig()

    // dedup check returns existing document
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'fa-inv-existing' }] }),
    })

    const result = await syncInvoice(mockOrder, config)

    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('duplicate')
    // Should only have called fetch once (GET dedup check — no POST)
    expect(global.fetch).toHaveBeenCalledOnce()
  })

  it('includes customer name in contactName', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig()

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'x' } }) })

    await syncInvoice(mockOrder, config)

    const body = JSON.parse(global.fetch.mock.calls[1][1].body)
    expect(body.contactName).toBe('ลูกค้าทดสอบ')
  })

  it('uses "Walk-in Customer" when no customer attached', async () => {
    const { syncInvoice } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig()
    const walkinOrder = { ...mockOrder, customer: null }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'x' } }) })

    await syncInvoice(walkinOrder, config)

    const body = JSON.parse(global.fetch.mock.calls[1][1].body)
    expect(body.contactName).toBe('Walk-in Customer')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// syncContact
// ─────────────────────────────────────────────────────────────────────────────

describe('syncContact', () => {
  afterEach(() => vi.clearAllMocks())

  it('POSTs customer to FlowAccount /contacts', async () => {
    const { syncContact } = await import('./FlowAccountAdapter.js')
    const config = await makeConfig()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'fa-contact-1' } }),
    })

    const customer = {
      name: 'สมชาย ใจดี',
      email: 'somchai@example.com',
      phonePrimary: '0812345678',
      customerId: 'TVS-CUS-LINE-2604-0001',
    }

    const result = await syncContact(customer, config)
    expect(result.synced).toBe(true)
    expect(result.flowAccountId).toBe('fa-contact-1')

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.name).toBe('สมชาย ใจดี')
    expect(body.email).toBe('somchai@example.com')
  })
})
