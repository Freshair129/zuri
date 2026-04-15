// Created At: 2026-04-10 05:20:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:20:00 +07:00 (v1.0.0)

/**
 * Provisioner tests — M5 MT-4 Tenant Onboarding (ZDEV-TSK-20260410-020)
 *
 * Covers:
 * - Input validation (email, password, tenantName, slug, reserved slugs, industry)
 * - Slug derivation
 * - Successful culinary provisioning with all side effects
 * - Transaction rollback safety (uniqueness check inside tx)
 * - P2002 unique-constraint handling
 * - Non-culinary industry skips seed
 * - setupTenantCrons failure is swallowed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

// bcrypt is deterministic for our purposes — mock it for speed
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (pw) => `hashed-${pw}`),
  },
}))

// Mock QStash so setupTenantCrons tests don't need network
const mockSchedulesCreate = vi.fn()
vi.mock('@/lib/qstash', () => ({
  getQStash: () => ({
    schedules: { create: mockSchedulesCreate },
  }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function validInput(overrides = {}) {
  return {
    email: 'owner@grandschool.com',
    password: 'secret12345',
    firstName: 'Jane',
    lastName: 'Doe',
    tenantName: 'The Grand Culinary School',
    tenantSlug: 'grand-culinary',
    industry: 'culinary',
    ...overrides,
  }
}

// ─── Suite: pure helpers ──────────────────────────────────────────────────────
describe('slugifyTenantName', () => {
  it('lowercases, trims and replaces whitespace with hyphens', async () => {
    const { slugifyTenantName } = await import('./provisioner.js')
    expect(slugifyTenantName('  The Grand Culinary School  ')).toBe('the-grand-culinary-school')
  })

  it('strips special characters (accented and symbols)', async () => {
    const { slugifyTenantName } = await import('./provisioner.js')
    // Note: JS \w is ASCII-only so accented chars are stripped entirely
    expect(slugifyTenantName('Café&Co!!')).toBe('cafco')
    expect(slugifyTenantName("Mom's Kitchen")).toBe('moms-kitchen')
  })

  it('caps length at 32 chars', async () => {
    const { slugifyTenantName } = await import('./provisioner.js')
    const s = slugifyTenantName('a'.repeat(50))
    expect(s.length).toBeLessThanOrEqual(32)
  })

  it('handles undefined/null gracefully', async () => {
    const { slugifyTenantName } = await import('./provisioner.js')
    expect(slugifyTenantName(undefined)).toBe('')
    expect(slugifyTenantName(null)).toBe('')
  })
})

describe('validateOnboardingInput', () => {
  it('accepts a fully valid payload', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput())).not.toThrow()
  })

  it('rejects invalid email format', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ email: 'not-an-email' })))
      .toThrow(/Invalid email/)
  })

  it('rejects short password', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ password: 'short' })))
      .toThrow(/at least 8 characters/)
  })

  it('rejects business name under 2 chars', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ tenantName: 'A' })))
      .toThrow(/Business name/)
  })

  it('rejects business name over 64 chars', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ tenantName: 'x'.repeat(80) })))
      .toThrow(/64 characters or less/)
  })

  it('rejects invalid slug format', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ tenantSlug: '-bad' })))
      .toThrow(/Invalid subdomain/)
    expect(() => validateOnboardingInput(validInput({ tenantSlug: 'UPPER' })))
      .toThrow(/Invalid subdomain/)
    expect(() => validateOnboardingInput(validInput({ tenantSlug: 'a' })))
      .toThrow(/Invalid subdomain/)
  })

  it('rejects reserved slugs (RESERVED_SLUGS set)', async () => {
    const { validateOnboardingInput, RESERVED_SLUGS } = await import('./provisioner.js')
    expect(RESERVED_SLUGS.has('app')).toBe(true)
    expect(RESERVED_SLUGS.has('admin')).toBe(true)
    expect(() => validateOnboardingInput(validInput({ tenantSlug: 'app' })))
      .toThrow(/reserved/)
    expect(() => validateOnboardingInput(validInput({ tenantSlug: 'api' })))
      .toThrow(/reserved/)
  })

  it('rejects unsupported industry', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    expect(() => validateOnboardingInput(validInput({ industry: 'crypto' })))
      .toThrow(/Unsupported industry/)
  })

  it('collects multiple errors into error.errors array', async () => {
    const { validateOnboardingInput } = await import('./provisioner.js')
    try {
      validateOnboardingInput({ email: 'bad', password: 'x', firstName: '', lastName: '', tenantName: 'a', tenantSlug: 'UP' })
      expect.fail('should have thrown')
    } catch (e) {
      expect(e.code).toBe('VALIDATION_ERROR')
      expect(Array.isArray(e.errors)).toBe(true)
      expect(e.errors.length).toBeGreaterThan(1)
    }
  })
})

// ─── Suite: Provisioner.provisionTenant ───────────────────────────────────────
describe('Provisioner.provisionTenant', () => {
  let mockPrisma
  let Provisioner

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma

    // $transaction forwards the proxy as the tx handle
    mockPrisma.$transaction = vi.fn(async (fn) => fn(mockPrisma))

    // Default: no conflicts
    mockPrisma.tenant.findUnique.mockResolvedValue(null)
    mockPrisma.employee.findUnique.mockResolvedValue(null)

    // Default create responses
    mockPrisma.tenant.create.mockImplementation(async ({ data }) => ({
      id: 'tenant-uuid',
      ...data,
    }))
    mockPrisma.employee.create.mockImplementation(async ({ data }) => ({
      id: 'emp-uuid',
      ...data,
    }))
    mockPrisma.posReceiptConfig.create.mockResolvedValue({})
    mockPrisma.posZone.create.mockResolvedValue({})
    mockPrisma.product.create.mockResolvedValue({})

    // Fresh module import so mocks apply
    const mod = await import('./provisioner.js')
    Provisioner = mod.Provisioner
  })

  it('creates tenant, owner, POS config, zone, and seeds culinary sample', async () => {
    const result = await Provisioner.provisionTenant(validInput())

    expect(result.tenant).toBeDefined()
    expect(result.owner).toBeDefined()

    // Tenant created with normalized data
    const tenantArg = mockPrisma.tenant.create.mock.calls[0][0]
    expect(tenantArg.data.tenantSlug).toBe('grand-culinary')
    expect(tenantArg.data.plan).toBe('STARTER')
    expect(tenantArg.data.isActive).toBe(true)
    expect(tenantArg.data.config.industry).toBe('culinary')
    expect(tenantArg.data.config.timezone).toBe('Asia/Bangkok')
    expect(tenantArg.data.config.vatRate).toBe(7)

    // Owner employee has OWNER role + extra roles
    const empArg = mockPrisma.employee.create.mock.calls[0][0]
    expect(empArg.data.role).toBe('OWNER')
    expect(empArg.data.roles).toEqual(['OWNER', 'MANAGER', 'SALES', 'FINANCE'])
    expect(empArg.data.passwordHash).toBe('hashed-secret12345')
    expect(empArg.data.email).toBe('owner@grandschool.com')
    expect(empArg.data.employeeId).toMatch(/^TVS-ADM-OWN-/)

    // POS bootstrap: 1 main zone + 2 industry zones (Kitchen 1, Dining Hall)
    expect(mockPrisma.posReceiptConfig.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.posZone.create).toHaveBeenCalledTimes(3)

    // Culinary seed: 1 sample product from INDUSTRIES.culinary.products
    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1)
    const productArg = mockPrisma.product.create.mock.calls[0][0]
    expect(productArg.data.name).toBe('Basic Thai Cooking (Sample)')
    expect(productArg.data.category).toBe('Cooking Courses')
  })

  it('rejects when slug is already taken (checked inside tx)', async () => {
    mockPrisma.tenant.findUnique.mockImplementation(async ({ where }) => {
      if (where.tenantSlug) return { id: 'other', tenantSlug: where.tenantSlug }
      return null
    })

    await expect(Provisioner.provisionTenant(validInput()))
      .rejects.toThrow(/Subdomain already taken/)

    // Should not have created anything
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled()
    expect(mockPrisma.employee.create).not.toHaveBeenCalled()
  })

  it('rejects when email is already registered', async () => {
    mockPrisma.employee.findUnique.mockImplementation(async ({ where }) => {
      if (where.email) return { id: 'other', email: where.email }
      return null
    })

    await expect(Provisioner.provisionTenant(validInput()))
      .rejects.toThrow(/Email already registered/)
    expect(mockPrisma.tenant.create).not.toHaveBeenCalled()
  })

  it('normalizes P2002 Prisma error on tenant_slug into friendly message', async () => {
    mockPrisma.tenant.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
        meta: { target: ['tenant_slug'] },
      }),
    )

    try {
      await Provisioner.provisionTenant(validInput())
      expect.fail('should have thrown')
    } catch (e) {
      expect(e.code).toBe('SLUG_TAKEN')
      expect(e.message).toMatch(/Subdomain already taken/)
    }
  })

  it('normalizes P2002 on email into EMAIL_TAKEN', async () => {
    mockPrisma.employee.create.mockRejectedValue(
      Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
        meta: { target: ['email'] },
      }),
    )

    try {
      await Provisioner.provisionTenant(validInput())
      expect.fail('should have thrown')
    } catch (e) {
      expect(e.code).toBe('EMAIL_TAKEN')
    }
  })

  it('seeds industry defaults for non-culinary industries', async () => {
    await Provisioner.provisionTenant(validInput({ industry: 'beauty' }))
    // Beauty industry seeds 1 sample product (Signature Haircut)
    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1)
    const productArg = mockPrisma.product.create.mock.calls[0][0]
    expect(productArg.data.name).toBe('Signature Haircut (Sample)')
    // Tenant + POS bootstrap still happen: 1 main zone + 2 beauty zones
    expect(mockPrisma.tenant.create).toHaveBeenCalled()
    expect(mockPrisma.posZone.create).toHaveBeenCalledTimes(3)
  })

  it('derives slug from tenantName when slug is omitted', async () => {
    const result = await Provisioner.provisionTenant(validInput({
      tenantName: 'My New School',
      tenantSlug: undefined,
    }))
    const tenantArg = mockPrisma.tenant.create.mock.calls[0][0]
    expect(tenantArg.data.tenantSlug).toBe('my-new-school')
    expect(result.tenant.tenantSlug).toBe('my-new-school')
  })

  it('normalizes email to lowercase before persisting', async () => {
    await Provisioner.provisionTenant(validInput({ email: 'OWNER@GRANDSCHOOL.COM' }))
    const empArg = mockPrisma.employee.create.mock.calls[0][0]
    expect(empArg.data.email).toBe('owner@grandschool.com')
  })
})

// ─── Suite: Provisioner.setupTenantCrons ──────────────────────────────────────
describe('Provisioner.setupTenantCrons', () => {
  let Provisioner

  beforeEach(async () => {
    mockSchedulesCreate.mockReset()
    const mod = await import('./provisioner.js')
    Provisioner = mod.Provisioner
  })

  it('schedules daily-brief cron when base URL is set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://zuri.app'
    mockSchedulesCreate.mockResolvedValue({ scheduleId: 'sch-1' })

    const result = await Provisioner.setupTenantCrons('tenant-uuid')

    expect(result).toEqual({ scheduled: true })
    expect(mockSchedulesCreate).toHaveBeenCalledTimes(1)
    const arg = mockSchedulesCreate.mock.calls[0][0]
    expect(arg.destination).toContain('/api/workers/daily-brief/process')
    expect(arg.cron).toBe('0 1 * * *') // 08:00 ICT in UTC
    expect(JSON.parse(arg.body).tenantId).toBe('tenant-uuid')
  })

  it('swallows QStash errors and returns reason', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://zuri.app'
    mockSchedulesCreate.mockRejectedValue(new Error('QStash down'))

    const result = await Provisioner.setupTenantCrons('tenant-uuid')
    expect(result.scheduled).toBe(false)
    expect(result.reason).toBe('qstash_error')
    // Does NOT throw — onboarding should not fail on cron setup
  })

  it('skips when no base URL configured', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.VERCEL_URL

    const result = await Provisioner.setupTenantCrons('tenant-uuid')
    expect(result.scheduled).toBe(false)
    expect(result.reason).toBe('missing_base_url')
    expect(mockSchedulesCreate).not.toHaveBeenCalled()
  })
})
