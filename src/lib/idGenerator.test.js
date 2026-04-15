import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  customer: { findFirst: vi.fn() },
  employee: { findFirst: vi.fn() },
  order: { findFirst: vi.fn() },
  product: { findFirst: vi.fn() },
  transaction: { findFirst: vi.fn() },
  enrollment: { findFirst: vi.fn() },
  task: { findFirst: vi.fn() },
  courseSchedule: { findFirst: vi.fn() },
  ingredientLot: { findFirst: vi.fn() },
  purchaseOrderV2: { findFirst: vi.fn() },
  recipe: { findFirst: vi.fn() },
}

vi.mock('@/lib/db', () => ({
  getPrisma: () => mockPrisma,
}))

vi.mock('@/lib/systemConfig', () => ({
  getEmploymentTypes: () => ({ FT: 'FTE', PT: 'PTE', CN: 'CNT' }),
  getDepartmentCodes: () => ({ kitchen: 'KIT', sales: 'SLS', management: 'MGT' }),
}))

const {
  generateCustomerId,
  generateEmployeeId,
  generateOrderId,
  generateProductId,
  generateTransactionId,
  generateEnrollmentId,
  generateTaskId,
  generateScheduleId,
  generateLotId,
  generatePurchaseOrderId,
  generateRecipeId,
} = await import('@/lib/idGenerator')

// ── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks())

/** Returns today's YYYYMMDD string */
function todayStr() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

/** Returns today's YYMM string */
function todayYYMM() {
  const d = new Date()
  return d.toISOString().slice(2, 4) + String(d.getMonth() + 1).padStart(2, '0')
}

// ─────────────────────────────────────────────────────────────────────────────
// generateCustomerId
// ─────────────────────────────────────────────────────────────────────────────
describe('generateCustomerId', () => {
  it('should generate first customer ID with serial 0001', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null)

    const id = await generateCustomerId('LINE')

    expect(id).toMatch(/^TVS-CUS-LINE-\d{4}-0001$/)
  })

  it('should increment serial from last existing ID', async () => {
    const yymm = todayYYMM()
    mockPrisma.customer.findFirst.mockResolvedValue({
      customerId: `TVS-CUS-FB-${yymm}-0005`,
    })

    const id = await generateCustomerId('FB')
    expect(id).toMatch(/-0006$/)
  })

  it('should include channel in the ID', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null)

    const id = await generateCustomerId('WEB')
    expect(id).toContain('CUS-WEB')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generateEmployeeId
// ─────────────────────────────────────────────────────────────────────────────
describe('generateEmployeeId', () => {
  it('should generate first employee ID as 001', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(null)

    const id = await generateEmployeeId('kitchen', 'FT')
    expect(id).toBe('TVS-FTE-KIT-001')
  })

  it('should increment from last existing ID', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue({
      employeeId: 'TVS-FTE-KIT-003',
    })

    const id = await generateEmployeeId('kitchen', 'FT')
    expect(id).toBe('TVS-FTE-KIT-004')
  })

  it('should fall back to EMP/GEN for unknown type/department', async () => {
    mockPrisma.employee.findFirst.mockResolvedValue(null)

    const id = await generateEmployeeId('unknown-dept', 'UNKNOWN')
    expect(id).toBe('TVS-EMP-GEN-001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generateOrderId  (daily ID)
// ─────────────────────────────────────────────────────────────────────────────
describe('generateOrderId', () => {
  it('should generate ORD-YYYYMMDD-001 for first order of the day', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null)

    const id = await generateOrderId()
    expect(id).toBe(`ORD-${todayStr()}-001`)
  })

  it('should increment serial for subsequent orders', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      orderId: `ORD-${todayStr()}-007`,
    })

    const id = await generateOrderId()
    expect(id).toBe(`ORD-${todayStr()}-008`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generateProductId
// ─────────────────────────────────────────────────────────────────────────────
describe('generateProductId', () => {
  describe('Standard course format', () => {
    it('should generate TVS-[GROUP]-[FC]-[PROP]-XX for first product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null)

      const id = await generateProductId({ group: 'JP', fc: '2FC', prop: 'HO' })
      expect(id).toBe('TVS-JP-2FC-HO-01')
    })

    it('should increment serial from last product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        productId: 'TVS-JP-2FC-HO-04',
      })

      const id = await generateProductId({ group: 'JP', fc: '2FC', prop: 'HO' })
      expect(id).toBe('TVS-JP-2FC-HO-05')
    })

    it('should use default values when data is empty', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null)

      const id = await generateProductId({})
      expect(id).toBe('TVS-JP-2FC-HO-01') // defaults: group=JP, fc=2FC, prop=HO
    })
  })

  describe('Package format', () => {
    it('should generate TVS-PKGxx for package category', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null)

      const id = await generateProductId({ category: 'package' })
      expect(id).toBe('TVS-PKG01')
    })

    it('should generate TVS-PKGxx when group is PKG', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null)

      const id = await generateProductId({ group: 'PKG' })
      expect(id).toBe('TVS-PKG01')
    })

    it('should increment package serial from last', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        productId: 'TVS-PKG03',
      })

      const id = await generateProductId({ category: 'package' })
      expect(id).toBe('TVS-PKG04')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Other daily ID generators
// ─────────────────────────────────────────────────────────────────────────────
describe('generateTransactionId', () => {
  it('should generate PAY-YYYYMMDD-001 pattern', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue(null)
    const id = await generateTransactionId()
    expect(id).toBe(`PAY-${todayStr()}-001`)
  })
})

describe('generateEnrollmentId', () => {
  it('should generate ENR-YYYYMMDD-001 pattern', async () => {
    mockPrisma.enrollment.findFirst.mockResolvedValue(null)
    const id = await generateEnrollmentId()
    expect(id).toBe(`ENR-${todayStr()}-001`)
  })
})

describe('generateTaskId', () => {
  it('should generate TSK-YYYYMMDD-001 pattern', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null)
    const id = await generateTaskId()
    expect(id).toBe(`TSK-${todayStr()}-001`)
  })
})

describe('generateScheduleId', () => {
  it('should generate SCH-YYYYMMDD-001 pattern', async () => {
    mockPrisma.courseSchedule.findFirst.mockResolvedValue(null)
    const id = await generateScheduleId()
    expect(id).toBe(`SCH-${todayStr()}-001`)
  })
})

describe('generateLotId', () => {
  it('should generate LOT-YYYYMMDD-001 pattern', async () => {
    mockPrisma.ingredientLot.findFirst.mockResolvedValue(null)
    const id = await generateLotId()
    expect(id).toBe(`LOT-${todayStr()}-001`)
  })
})

describe('generatePurchaseOrderId', () => {
  it('should generate PO-YYYYMMDD-001 pattern', async () => {
    mockPrisma.purchaseOrderV2.findFirst.mockResolvedValue(null)
    const id = await generatePurchaseOrderId()
    expect(id).toBe(`PO-${todayStr()}-001`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generateRecipeId (global sequential, 4-digit padding)
// ─────────────────────────────────────────────────────────────────────────────
describe('generateRecipeId', () => {
  it('should generate RCP-0001 for first recipe', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null)
    const id = await generateRecipeId()
    expect(id).toBe('RCP-0001')
  })

  it('should increment from last recipe ID', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue({ recipeId: 'RCP-0042' })
    const id = await generateRecipeId()
    expect(id).toBe('RCP-0043')
  })
})
