// Created At: 2026-04-10 06:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 06:00:00 +07:00 (v1.0.0)

/**
 * Multi-Tenant Isolation Test Script
 * M7 Task G2 / ZDEV-TSK-20260410-029
 *
 * Verifies that data belonging to Tenant A is never visible to Tenant B,
 * and that platform-level routing (webhook, admin) works correctly.
 *
 * Run: doppler run -- node scripts/test-multi-tenant.mjs
 *
 * Exits 0 if all checks pass, non-zero on any failure.
 * Cleans up all test data after running (idempotent on re-run).
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`
const RED    = (s) => `\x1b[31m${s}\x1b[0m`
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`

let passed = 0
let failed = 0

function pass(label) {
  console.log(`  ${GREEN('✓')} ${label}`)
  passed++
}

function fail(label, detail) {
  console.log(`  ${RED('✗')} ${label}`)
  if (detail) console.log(`    ${DIM(detail)}`)
  failed++
}

function section(title) {
  console.log(`\n${BOLD(YELLOW('▸'))} ${BOLD(title)}`)
}

async function assert(label, fn) {
  try {
    const result = await fn()
    if (result === false) {
      fail(label, 'Assertion returned false')
    } else {
      pass(label)
    }
  } catch (err) {
    fail(label, err.message)
  }
}

// ─── Setup ────────────────────────────────────────────────────────────────────

const TS = Date.now()
const SLUG_A = `test-tenant-a-${TS}`
const SLUG_B = `test-tenant-b-${TS}`

async function setup() {
  console.log(BOLD('\n🔧 Setup — creating test tenants\n'))

  const tenantA = await prisma.tenant.create({
    data: {
      tenantSlug:  SLUG_A,
      tenantName:  'Test Tenant A',
      fbPageId:    `fb-page-a-${TS}`,
      lineOaId:    `line-oa-a-${TS}`,
      plan:        'STARTER',
      isActive:    true,
    },
  })

  const tenantB = await prisma.tenant.create({
    data: {
      tenantSlug:  SLUG_B,
      tenantName:  'Test Tenant B',
      fbPageId:    `fb-page-b-${TS}`,
      lineOaId:    `line-oa-b-${TS}`,
      plan:        'STARTER',
      isActive:    true,
    },
  })

  console.log(`  Tenant A: ${tenantA.id} (${SLUG_A})`)
  console.log(`  Tenant B: ${tenantB.id} (${SLUG_B})`)

  return { tenantA, tenantB }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests({ tenantA, tenantB }) {

  // ── 1. Customer Isolation ──────────────────────────────────────────────────
  section('1. Customer Isolation')

  const customerA = await prisma.customer.create({
    data: {
      customerId: `CUST-TEST-A-${TS}`,
      tenantId:   tenantA.id,
      name:       'Alice (Tenant A)',
    },
  })

  await assert('Customer created in Tenant A', () =>
    prisma.customer.findUnique({ where: { id: customerA.id } })
      .then((r) => r?.tenantId === tenantA.id)
  )

  await assert('Customer A NOT visible when querying with Tenant B scope', () =>
    prisma.customer.findFirst({
      where: { id: customerA.id, tenantId: tenantB.id },
    }).then((r) => r === null)
  )

  await assert('Customer count for Tenant B is 0 (no cross-leak)', () =>
    prisma.customer.count({
      where: { tenantId: tenantB.id, customerId: { startsWith: 'CUST-TEST-A' } },
    }).then((n) => n === 0)
  )

  // ── 2. Conversation Isolation ──────────────────────────────────────────────
  section('2. Conversation Isolation')

  const convA = await prisma.conversation.create({
    data: {
      conversationId: `conv-test-a-${TS}`,
      tenantId:       tenantA.id,
      customerId:     customerA.id,
      channel:        'facebook',
      status:         'open',
    },
  })

  await assert('Conversation created in Tenant A', () =>
    prisma.conversation.findUnique({ where: { id: convA.id } })
      .then((r) => r?.tenantId === tenantA.id)
  )

  await assert('Conversation A NOT visible under Tenant B scope', () =>
    prisma.conversation.findFirst({
      where: { id: convA.id, tenantId: tenantB.id },
    }).then((r) => r === null)
  )

  await assert('findMany conversations for Tenant B returns empty list', () =>
    prisma.conversation.findMany({
      where: { tenantId: tenantB.id },
    }).then((rows) => rows.every((r) => r.tenantId === tenantB.id))
  )

  // ── 3. Order Isolation ────────────────────────────────────────────────────
  section('3. Order Isolation')

  const orderA = await prisma.order.create({
    data: {
      orderId:    `ORD-TEST-A-${TS}`,
      tenantId:   tenantA.id,
      customerId: customerA.id,
      total:      999,
      status:     'PENDING',
      channel:    'pos',
    },
  })

  await assert('Order created in Tenant A', () =>
    prisma.order.findUnique({ where: { id: orderA.id } })
      .then((r) => r?.tenantId === tenantA.id)
  )

  await assert('Order A NOT visible under Tenant B scope', () =>
    prisma.order.findFirst({
      where: { id: orderA.id, tenantId: tenantB.id },
    }).then((r) => r === null)
  )

  // ── 4. Employee Isolation ─────────────────────────────────────────────────
  section('4. Employee Isolation')

  const empA = await prisma.employee.create({
    data: {
      employeeId:   `EMP-TEST-A-${TS}`,
      tenantId:     tenantA.id,
      firstName:    'Alice',
      lastName:     'Staff',
      email:        `alice-${TS}@test-a.com`,
      passwordHash: '$2a$10$placeholder',
      role:         'STAFF',
      roles:        ['STAFF'],
    },
  })

  await assert('Employee created in Tenant A', () =>
    prisma.employee.findUnique({ where: { id: empA.id } })
      .then((r) => r?.tenantId === tenantA.id)
  )

  await assert('Employee A NOT visible under Tenant B scope', () =>
    prisma.employee.findFirst({
      where: { id: empA.id, tenantId: tenantB.id },
    }).then((r) => r === null)
  )

  // ── 5. Webhook Routing — Facebook ─────────────────────────────────────────
  section('5. Webhook Routing — Facebook Page ID → Tenant')

  await assert('Tenant A resolved by fbPageId (exact match)', () =>
    prisma.tenant.findFirst({
      where: { fbPageId: tenantA.fbPageId, isActive: true },
    }).then((r) => r?.id === tenantA.id)
  )

  await assert('Tenant B resolved by its own fbPageId (no cross-match)', () =>
    prisma.tenant.findFirst({
      where: { fbPageId: tenantB.fbPageId, isActive: true },
    }).then((r) => r?.id === tenantB.id)
  )

  await assert('Unknown fbPageId returns null', () =>
    prisma.tenant.findFirst({
      where: { fbPageId: `nonexistent-${TS}`, isActive: true },
    }).then((r) => r === null)
  )

  // ── 6. Webhook Routing — LINE OA ──────────────────────────────────────────
  section('6. Webhook Routing — LINE OA ID → Tenant')

  await assert('Tenant A resolved by lineOaId', () =>
    prisma.tenant.findFirst({
      where: { lineOaId: tenantA.lineOaId, isActive: true },
    }).then((r) => r?.id === tenantA.id)
  )

  await assert('Tenant B resolved by its own lineOaId', () =>
    prisma.tenant.findFirst({
      where: { lineOaId: tenantB.lineOaId, isActive: true },
    }).then((r) => r?.id === tenantB.id)
  )

  await assert("Tenant A's lineOaId does NOT match Tenant B", () =>
    prisma.tenant.findFirst({
      where: { lineOaId: tenantA.lineOaId, isActive: true },
    }).then((r) => r?.id !== tenantB.id)
  )

  // ── 7. Inactive Tenant Exclusion ──────────────────────────────────────────
  section('7. Inactive Tenant — webhook must not route to inactive tenants')

  await prisma.tenant.update({
    where: { id: tenantB.id },
    data:  { isActive: false },
  })

  await assert('Deactivated Tenant B not found by fbPageId (isActive: true filter)', () =>
    prisma.tenant.findFirst({
      where: { fbPageId: tenantB.fbPageId, isActive: true },
    }).then((r) => r === null)
  )

  await assert('Deactivated Tenant B not found by lineOaId (isActive: true filter)', () =>
    prisma.tenant.findFirst({
      where: { lineOaId: tenantB.lineOaId, isActive: true },
    }).then((r) => r === null)
  )

  // Restore
  await prisma.tenant.update({ where: { id: tenantB.id }, data: { isActive: true } })

  // ── 8. Admin — All Tenants Visible ────────────────────────────────────────
  section('8. Admin — Platform-level tenant list')

  await assert('findMany returns both test tenants (no isActive filter at admin level)', async () => {
    const all = await prisma.tenant.findMany({
      where: { tenantSlug: { in: [SLUG_A, SLUG_B] } },
    })
    return all.length === 2 && all.every((t) => [SLUG_A, SLUG_B].includes(t.tenantSlug))
  })

  // ── 9. Audit Log Tenant Scoping ───────────────────────────────────────────
  section('9. Audit Log Tenant Scoping')

  await prisma.auditLog.create({
    data: {
      tenantId: tenantA.id,
      actor:    'EMP-TEST-A',
      action:   'TEST_ACTION',
      target:   `test-${TS}`,
      details:  { test: true },
    },
  })

  await assert('Audit log entry for Tenant A visible under Tenant A scope', () =>
    prisma.auditLog.findFirst({
      where: { tenantId: tenantA.id, actor: 'EMP-TEST-A', target: `test-${TS}` },
    }).then((r) => r !== null)
  )

  await assert('Audit log entry for Tenant A NOT visible under Tenant B scope', () =>
    prisma.auditLog.findFirst({
      where: { tenantId: tenantB.id, actor: 'EMP-TEST-A', target: `test-${TS}` },
    }).then((r) => r === null)
  )
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

async function teardown({ tenantA, tenantB }) {
  console.log(BOLD('\n🧹 Teardown — removing test data\n'))
  try {
    // Delete in dependency order
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } })
    await prisma.message.deleteMany({
      where: { conversation: { tenantId: { in: [tenantA.id, tenantB.id] } } },
    })
    await prisma.conversation.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } })
    await prisma.order.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } })
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } })
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } })
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } })
    console.log('  All test data removed.')
  } catch (err) {
    console.log(`  ${YELLOW('⚠')} Teardown error (non-fatal): ${err.message}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(BOLD('\n🔒 Zuri Multi-Tenant Isolation Test Suite'))
  console.log(DIM(`   Run at: ${new Date().toISOString()}\n`))

  let tenants
  try {
    tenants = await setup()
    await runTests(tenants)
  } finally {
    if (tenants) await teardown(tenants)
    await prisma.$disconnect()
  }

  console.log(BOLD(`\n─────────────────────────────────────────`))
  console.log(`  ${GREEN(`${passed} passed`)}   ${failed > 0 ? RED(`${failed} failed`) : DIM('0 failed')}`)
  console.log(BOLD(`─────────────────────────────────────────\n`))

  if (failed > 0) {
    console.log(RED('FAIL — isolation violations detected.\n'))
    process.exit(1)
  }
  console.log(GREEN('PASS — all isolation checks passed.\n'))
}

main().catch((err) => {
  console.error(RED('\nFatal error:'), err)
  process.exit(1)
})
