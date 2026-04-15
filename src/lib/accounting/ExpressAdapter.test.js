import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Prisma
// ─────────────────────────────────────────────────────────────────────────────

const mockOrders = [
  {
    orderId: 'ORD-20260409-001',
    date: new Date('2026-04-09T10:00:00+07:00'),
    customer: { name: 'สมหมาย' },
    items: [
      { name: 'คอร์สซูชิ', qty: 1, unitPrice: 3000, discount: 0 },
    ],
    subtotalAmount: 3000,
    vatAmount: 210,
    discountAmount: 0,
    totalAmount: 3210,
    paymentMethod: 'QR',
    notes: null,
  },
]

const mockPOs = [
  {
    poId: 'PO-20260409-001',
    createdAt: new Date('2026-04-09T09:00:00+07:00'),
    supplier: { name: 'บริษัท ABC จำกัด' },
    totalAmount: 5000,
    vatAmount: 350,
    notes: 'ซื้อวัตถุดิบ',
    category: 'raw_material',
  },
]

const mockPrisma = {
  order: { findMany: vi.fn().mockResolvedValue(mockOrders) },
  purchaseOrderV2: { findMany: vi.fn().mockResolvedValue(mockPOs) },
}

vi.mock('@/lib/db', () => ({ getPrisma: () => mockPrisma }))

// ─────────────────────────────────────────────────────────────────────────────
// generateXImportFile
// ─────────────────────────────────────────────────────────────────────────────

describe('generateXImportFile', () => {
  afterEach(() => vi.clearAllMocks())

  const config = {
    accountMappingJson: { raw_material: 'ต้นทุนสินค้า' },
  }

  it('returns a Buffer (XLSX content)', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const { buffer } = await generateXImportFile('tenant-1', new Date('2026-04-09'), config)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('XLSX has 2 sheets: ใบกำกับภาษี and รายจ่าย', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const { buffer } = await generateXImportFile('tenant-1', new Date('2026-04-09'), config)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    expect(wb.SheetNames).toContain('ใบกำกับภาษี')
    expect(wb.SheetNames).toContain('รายจ่าย')
  })

  it('invoice sheet has header row + 1 data row', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const { buffer } = await generateXImportFile('tenant-1', new Date('2026-04-09'), config)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets['ใบกำกับภาษี']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // Row 0 = header, Row 1 = first order
    expect(data.length).toBe(2)
    expect(data[0][0]).toBe('เลขที่อ้างอิง') // first column header
    expect(data[1][0]).toBe('ZRI-ORD-20260409-001')
    expect(data[1][7]).toBe(3210) // totalAmount column
  })

  it('expense sheet reflects purchase orders with account mapping', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const { buffer } = await generateXImportFile('tenant-1', new Date('2026-04-09'), config)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets['รายจ่าย']
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 })

    expect(data[1][0]).toBe('ZRI-PO-PO-20260409-001')
    expect(data[1][2]).toBe('บริษัท ABC จำกัด')
    expect(data[1][3]).toBe('ต้นทุนสินค้า') // mapped category
  })

  it('returns correct counts', async () => {
    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const result = await generateXImportFile('tenant-1', new Date('2026-04-09'), config)
    expect(result.ordersCount).toBe(1)
    expect(result.expensesCount).toBe(1)
  })

  it('handles empty orders/expenses gracefully', async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([])
    mockPrisma.purchaseOrderV2.findMany.mockResolvedValueOnce([])

    const { generateXImportFile } = await import('./ExpressAdapter.js')
    const { buffer, ordersCount, expensesCount } = await generateXImportFile(
      'tenant-1', new Date('2026-04-09'), config
    )

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const invoiceData = XLSX.utils.sheet_to_json(wb.Sheets['ใบกำกับภาษี'], { header: 1 })
    expect(invoiceData.length).toBe(1) // header only
    expect(ordersCount).toBe(0)
    expect(expensesCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// sendToAccountant
// ─────────────────────────────────────────────────────────────────────────────

describe('sendToAccountant', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns sent: false when RESEND_API_KEY is not set', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const { sendToAccountant } = await import('./ExpressAdapter.js')
    const result = await sendToAccountant(Buffer.from('test'), { accountantEmail: 'acc@example.com' }, '2026-04-09')
    expect(result.sent).toBe(false)
    vi.unstubAllEnvs()
  })

  it('returns sent: false when accountantEmail is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    const { sendToAccountant } = await import('./ExpressAdapter.js')
    const result = await sendToAccountant(Buffer.from('test'), {}, '2026-04-09')
    expect(result.sent).toBe(false)
    vi.unstubAllEnvs()
  })

  it('calls Resend API and returns emailId on success', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('EMAIL_FROM', 'Zuri <noreply@zuri.app>')

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'email-123' }),
    })

    const { sendToAccountant } = await import('./ExpressAdapter.js')
    const result = await sendToAccountant(
      Buffer.from('xlsx-content'),
      { accountantEmail: 'accountant@company.com' },
      '2026-04-09'
    )

    expect(result.sent).toBe(true)
    expect(result.emailId).toBe('email-123')

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(options.body)
    expect(body.to).toEqual(['accountant@company.com'])
    expect(body.subject).toContain('2026-04-09')
    expect(body.attachments[0].filename).toBe('zuri-export-2026-04-09.xlsx')

    vi.unstubAllEnvs()
  })

  it('throws when Resend API returns error', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ name: 'validation_error' }),
    })

    const { sendToAccountant } = await import('./ExpressAdapter.js')
    await expect(
      sendToAccountant(Buffer.from('x'), { accountantEmail: 'a@b.com' }, '2026-04-09')
    ).rejects.toThrow(/Resend email failed/)

    vi.unstubAllEnvs()
  })
})
