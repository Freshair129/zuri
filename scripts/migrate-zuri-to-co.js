#!/usr/bin/env node

/**
 * Zuri Migration Script — ZURI-v1 DB → Zuri v2 DB
 *
 * Usage:
 *   doppler run --project vschool-crm --config dev -- \
 *     node scripts/migrate-zuri-to-co.js
 *
 * Required env vars:
 *   SOURCE_DATABASE_URL  — ZURI-v1 PostgreSQL connection string
 *   DATABASE_URL         — Zuri v2 (Supabase) connection string (from Doppler)
 *
 * Optional:
 *   DRY_RUN=true         — Print counts without writing to target
 *   BATCH_SIZE=100       — Records per batch (default 100)
 *
 * Design:
 *   - Source: raw pg.Pool queries (ZURI-v1 schema unknown to Prisma)
 *   - Target: Prisma upsert (idempotent — safe to re-run)
 *   - Phone normalization: Thai E.164 (0812345678 → +66812345678)
 *   - Role mapping: legacy strings → RBAC uppercase roles
 *   - Graceful: source tables that don't exist → skipped, not fatal
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '100', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'
const VSCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001'

let source   // pg.Pool — ZURI-v1 source DB
let prisma   // PrismaClient — Zuri v2 target DB

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Normalize Thai phone number to E.164
 * e.g. "0812345678" → "+66812345678"
 *      "+66812345678" → "+66812345678"
 *      null/undefined → null
 */
function normalizePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('66') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+66${digits.slice(1)}`
  if (digits.length === 9) return `+66${digits}` // landline without leading 0
  return raw // return as-is if unrecognized
}

/**
 * Map ZURI-v1 lifecycle stage → Zuri v2 lifecycle stage
 */
function mapStage(stage) {
  if (!stage) return 'LEAD'
  const s = stage.toLowerCase().trim()
  const map = {
    'lead':        'LEAD',
    'new lead':    'LEAD',
    'inprogress':  'CONTACTED',
    'in_progress': 'CONTACTED',
    'in progress': 'CONTACTED',
    'interested':  'INTERESTED',
    'qualified':   'INTERESTED',
    'new':         'CONTACTED',
    'contacted':   'CONTACTED',
    'customer':    'PAID',
    'paid':        'PAID',
    'won':         'PAID',
    'closed':      'PAID',
    'churned':     'CHURNED',
    'inactive':    'CHURNED',
    'lost':        'CHURNED',
  }
  return map[s] ?? 'LEAD'
}

/**
 * Map ZURI-v1 role string → Zuri v2 RBAC role
 */
function normalizeRole(role) {
  if (!role) return 'STAFF'
  const r = role.toUpperCase().trim()
  const map = {
    'DEV':     'DEV',
    'OWNER':   'OWNER',
    'ADMIN':   'MANAGER',
    'ADM':     'MANAGER',
    'MGR':     'MANAGER',
    'MANAGER': 'MANAGER',
    'HR':      'MANAGER',
    'SLS':     'SALES',
    'SALES':   'SALES',
    'AGT':     'SALES',
    'MKT':     'SALES',
    'TEC':     'KITCHEN',
    'KITCHEN': 'KITCHEN',
    'PUR':     'KITCHEN',
    'PD':      'KITCHEN',
    'ACC':     'FINANCE',
    'FINANCE': 'FINANCE',
    'STF':     'STAFF',
    'STAFF':   'STAFF',
  }
  return map[r] ?? 'STAFF'
}

/**
 * Map ZURI-v1 enrollment status → Zuri v2 enrollment status
 */
function mapEnrollStatus(status) {
  if (!status) return 'PENDING'
  const s = status.toUpperCase().trim()
  const map = {
    'PENDING':     'PENDING',
    'CONFIRMED':   'CONFIRMED',
    'ACTIVE':      'IN_PROGRESS',
    'IN_PROGRESS': 'IN_PROGRESS',
    'INPROGRESS':  'IN_PROGRESS',
    'COMPLETED':   'COMPLETED',
    'DONE':        'COMPLETED',
    'CANCELLED':   'CANCELLED',
    'CANCELED':    'CANCELLED',
  }
  return map[s] ?? 'PENDING'
}

/**
 * Query source DB — returns rows or [] if table doesn't exist
 */
async function sourceQuery(sql, params = []) {
  try {
    const { rows } = await source.query(sql, params)
    return rows
  } catch (err) {
    if (err.code === '42P01') {
      // undefined_table — table doesn't exist in v1, skip gracefully
      console.warn(`[migrate]   ⚠ Table not found in source — skipping: ${err.message.split('"')[1]}`)
      return []
    }
    throw err
  }
}

/**
 * Process rows in batches
 * @param {any[]} rows
 * @param {(batch: any[]) => Promise<number>} processFn — returns inserted count
 */
async function batchProcess(rows, processFn) {
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const count = await processFn(batch)
    total += count
    process.stdout.write(`\r[migrate]   ${total}/${rows.length} processed...`)
  }
  if (rows.length > 0) process.stdout.write('\n')
  return total
}

// ─────────────────────────────────────────────
// Phase 1 — Tenant
// ─────────────────────────────────────────────

async function migrateTenants() {
  const rows = await sourceQuery(`
    SELECT id, name, slug, logo_url, primary_color, line_oa_id, fb_page_id,
           created_at, updated_at
    FROM tenants
    LIMIT 10
  `)

  if (rows.length === 0) {
    // No tenant table in v1 — ensure default V School tenant exists in v2
    console.log('[migrate]   No tenant table in source — ensuring default tenant exists')
    if (!DRY_RUN) {
      await prisma.tenant.upsert({
        where: { id: VSCHOOL_TENANT_ID },
        update: {},
        create: {
          id:   VSCHOOL_TENANT_ID,
          name: 'V School',
          slug: 'vschool',
        },
      })
    }
    console.log('[migrate]   Default tenant ensured ✓')
    return
  }

  console.log(`[migrate]   Found ${rows.length} tenants in source`)
  if (DRY_RUN) return

  await batchProcess(rows, async (batch) => {
    let count = 0
    for (const row of batch) {
      await prisma.tenant.upsert({
        where: { id: row.id ?? VSCHOOL_TENANT_ID },
        update: {
          name:         row.name,
          slug:         row.slug,
          logoUrl:      row.logo_url,
          primaryColor: row.primary_color,
          lineOaId:     row.line_oa_id,
          fbPageId:     row.fb_page_id,
        },
        create: {
          id:           row.id ?? VSCHOOL_TENANT_ID,
          name:         row.name ?? 'V School',
          slug:         row.slug ?? 'vschool',
          logoUrl:      row.logo_url,
          primaryColor: row.primary_color,
          lineOaId:     row.line_oa_id,
          fbPageId:     row.fb_page_id,
          createdAt:    row.created_at,
        },
      })
      count++
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 2 — Employees
// ─────────────────────────────────────────────

async function migrateEmployees() {
  const rows = await sourceQuery(`
    SELECT id, name, email, phone, role, department, employee_id,
           is_active, tenant_id, created_at, updated_at
    FROM employees
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${rows.length} employees in source`)
  if (DRY_RUN || rows.length === 0) return

  await batchProcess(rows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.employee.upsert({
          where: { id: row.id },
          update: {
            name:       row.name,
            email:      row.email,
            phone:      normalizePhone(row.phone),
            role:       normalizeRole(row.role),
            department: row.department,
            employeeId: row.employee_id,
            isActive:   row.is_active ?? true,
            updatedAt:  row.updated_at,
          },
          create: {
            id:         row.id,
            tenantId:   row.tenant_id ?? VSCHOOL_TENANT_ID,
            name:       row.name,
            email:      row.email,
            phone:      normalizePhone(row.phone),
            role:       normalizeRole(row.role),
            department: row.department,
            employeeId: row.employee_id,
            isActive:   row.is_active ?? true,
            createdAt:  row.created_at,
          },
        })
        count++
      } catch (err) {
        console.error(`[migrate]   ✗ Employee ${row.id} (${row.email}): ${err.message}`)
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 3 — Customers + Profiles
// ─────────────────────────────────────────────

async function migrateCustomers() {
  const rows = await sourceQuery(`
    SELECT
      c.id, c.name, c.email, c.phone, c.line_user_id, c.fb_psid,
      c.lifecycle_stage, c.tags, c.notes, c.avatar_url,
      c.tenant_id, c.created_at, c.updated_at, c.deleted_at,
      cp.gender, cp.age_group, cp.cooking_level, cp.motivation,
      cp.budget_signal, cp.location, cp.occupation
    FROM customers c
    LEFT JOIN customer_profiles cp ON cp.customer_id = c.id
    ORDER BY c.created_at
  `)

  console.log(`[migrate]   Found ${rows.length} customers in source`)
  if (DRY_RUN || rows.length === 0) return

  await batchProcess(rows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.customer.upsert({
          where: { id: row.id },
          update: {
            name:           row.name,
            email:          row.email,
            phone:          normalizePhone(row.phone),
            lineUserId:     row.line_user_id,
            fbPsid:         row.fb_psid,
            lifecycleStage: mapStage(row.lifecycle_stage),
            tags:           row.tags ?? [],
            notes:          row.notes,
            avatarUrl:      row.avatar_url,
            deletedAt:      row.deleted_at,
            updatedAt:      row.updated_at,
          },
          create: {
            id:             row.id,
            tenantId:       row.tenant_id ?? VSCHOOL_TENANT_ID,
            name:           row.name,
            email:          row.email,
            phone:          normalizePhone(row.phone),
            lineUserId:     row.line_user_id,
            fbPsid:         row.fb_psid,
            lifecycleStage: mapStage(row.lifecycle_stage),
            tags:           row.tags ?? [],
            notes:          row.notes,
            avatarUrl:      row.avatar_url,
            deletedAt:      row.deleted_at,
            createdAt:      row.created_at,
          },
        })

        // Upsert profile if present
        if (row.gender || row.cooking_level || row.motivation) {
          await prisma.customerProfile.upsert({
            where:  { customerId: row.id },
            update: {
              gender:       row.gender,
              ageGroup:     row.age_group,
              cookingLevel: row.cooking_level,
              motivation:   row.motivation,
              budgetSignal: row.budget_signal,
              location:     row.location,
              occupation:   row.occupation,
            },
            create: {
              customerId:   row.id,
              tenantId:     row.tenant_id ?? VSCHOOL_TENANT_ID,
              gender:       row.gender,
              ageGroup:     row.age_group,
              cookingLevel: row.cooking_level,
              motivation:   row.motivation,
              budgetSignal: row.budget_signal,
              location:     row.location,
              occupation:   row.occupation,
            },
          })
        }

        count++
      } catch (err) {
        console.error(`[migrate]   ✗ Customer ${row.id} (${row.email}): ${err.message}`)
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 4 — Conversations + Messages
// ─────────────────────────────────────────────

async function migrateConversations() {
  const convRows = await sourceQuery(`
    SELECT id, customer_id, channel, status, assigned_to, last_message_at,
           tenant_id, created_at, updated_at
    FROM conversations
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${convRows.length} conversations in source`)
  if (!DRY_RUN && convRows.length > 0) {
    await batchProcess(convRows, async (batch) => {
      let count = 0
      for (const row of batch) {
        try {
          await prisma.conversation.upsert({
            where: { id: row.id },
            update: {
              status:        row.status ?? 'OPEN',
              assignedTo:    row.assigned_to,
              lastMessageAt: row.last_message_at,
              updatedAt:     row.updated_at,
            },
            create: {
              id:            row.id,
              tenantId:      row.tenant_id ?? VSCHOOL_TENANT_ID,
              customerId:    row.customer_id,
              channel:       (row.channel ?? 'LINE').toUpperCase(),
              status:        row.status ?? 'OPEN',
              assignedTo:    row.assigned_to,
              lastMessageAt: row.last_message_at,
              createdAt:     row.created_at,
            },
          })
          count++
        } catch (err) {
          console.error(`[migrate]   ✗ Conversation ${row.id}: ${err.message}`)
        }
      }
      return count
    })
  }

  // Messages
  const msgRows = await sourceQuery(`
    SELECT id, conversation_id, sender_type, sender_id, content,
           message_type, media_url, metadata, sent_at, created_at
    FROM messages
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${msgRows.length} messages in source`)
  if (DRY_RUN || msgRows.length === 0) return

  await batchProcess(msgRows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.message.upsert({
          where: { id: row.id },
          update: {},
          create: {
            id:             row.id,
            conversationId: row.conversation_id,
            senderType:     (row.sender_type ?? 'CUSTOMER').toUpperCase(),
            senderId:       row.sender_id,
            content:        row.content ?? '',
            messageType:    (row.message_type ?? 'TEXT').toUpperCase(),
            mediaUrl:       row.media_url,
            metadata:       row.metadata,
            sentAt:         row.sent_at ?? row.created_at,
            createdAt:      row.created_at,
          },
        })
        count++
      } catch (err) {
        // Skip duplicate messages silently (idempotent)
        if (!err.message.includes('Unique constraint')) {
          console.error(`[migrate]   ✗ Message ${row.id}: ${err.message}`)
        }
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 5 — Products + Packages
// ─────────────────────────────────────────────

async function migrateProducts() {
  const rows = await sourceQuery(`
    SELECT id, name, description, price, unit, category, sku,
           is_active, tenant_id, created_at, updated_at
    FROM products
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${rows.length} products in source`)
  if (DRY_RUN || rows.length === 0) return

  await batchProcess(rows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.product.upsert({
          where: { id: row.id },
          update: {
            name:        row.name,
            description: row.description,
            price:       row.price,
            unit:        row.unit,
            category:    row.category,
            sku:         row.sku,
            isActive:    row.is_active ?? true,
            updatedAt:   row.updated_at,
          },
          create: {
            id:          row.id,
            tenantId:    row.tenant_id ?? VSCHOOL_TENANT_ID,
            name:        row.name,
            description: row.description,
            price:       row.price ?? 0,
            unit:        row.unit ?? 'unit',
            category:    row.category,
            sku:         row.sku,
            isActive:    row.is_active ?? true,
            createdAt:   row.created_at,
          },
        })
        count++
      } catch (err) {
        console.error(`[migrate]   ✗ Product ${row.id} (${row.name}): ${err.message}`)
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 6 — Orders + Items + Transactions
// ─────────────────────────────────────────────

async function migrateOrders() {
  const orderRows = await sourceQuery(`
    SELECT id, customer_id, order_number, status, subtotal, discount_amount,
           vat_amount, total_amount, payment_method, payment_status, paid_at,
           notes, tenant_id, created_at, updated_at
    FROM orders
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${orderRows.length} orders in source`)
  if (!DRY_RUN && orderRows.length > 0) {
    await batchProcess(orderRows, async (batch) => {
      let count = 0
      for (const row of batch) {
        try {
          await prisma.order.upsert({
            where: { id: row.id },
            update: {
              status:          row.status ?? 'PENDING',
              paymentStatus:   row.payment_status ?? 'UNPAID',
              paidAt:          row.paid_at,
              discountAmount:  row.discount_amount ?? 0,
              vatAmount:       row.vat_amount ?? 0,
              totalAmount:     row.total_amount ?? 0,
              updatedAt:       row.updated_at,
            },
            create: {
              id:              row.id,
              tenantId:        row.tenant_id ?? VSCHOOL_TENANT_ID,
              customerId:      row.customer_id,
              orderNumber:     row.order_number,
              status:          row.status ?? 'PENDING',
              subtotal:        row.subtotal ?? 0,
              discountAmount:  row.discount_amount ?? 0,
              vatAmount:       row.vat_amount ?? 0,
              totalAmount:     row.total_amount ?? 0,
              paymentMethod:   row.payment_method,
              paymentStatus:   row.payment_status ?? 'UNPAID',
              paidAt:          row.paid_at,
              notes:           row.notes,
              createdAt:       row.created_at,
            },
          })
          count++
        } catch (err) {
          console.error(`[migrate]   ✗ Order ${row.id}: ${err.message}`)
        }
      }
      return count
    })
  }

  // Order items
  const itemRows = await sourceQuery(`
    SELECT id, order_id, product_id, quantity, unit_price, subtotal,
           discount_amount, notes, created_at
    FROM order_items
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${itemRows.length} order items in source`)
  if (!DRY_RUN && itemRows.length > 0) {
    await batchProcess(itemRows, async (batch) => {
      let count = 0
      for (const row of batch) {
        try {
          await prisma.orderItem.upsert({
            where: { id: row.id },
            update: {},
            create: {
              id:             row.id,
              orderId:        row.order_id,
              productId:      row.product_id,
              quantity:       row.quantity ?? 1,
              unitPrice:      row.unit_price ?? 0,
              subtotal:       row.subtotal ?? 0,
              discountAmount: row.discount_amount ?? 0,
              notes:          row.notes,
              createdAt:      row.created_at,
            },
          })
          count++
        } catch (err) {
          if (!err.message.includes('Unique constraint')) {
            console.error(`[migrate]   ✗ OrderItem ${row.id}: ${err.message}`)
          }
        }
      }
      return count
    })
  }

  // Transactions
  const txRows = await sourceQuery(`
    SELECT id, order_id, amount, method, status, reference, slip_url,
           verified_at, created_at
    FROM payment_transactions
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${txRows.length} payment transactions in source`)
  if (DRY_RUN || txRows.length === 0) return

  await batchProcess(txRows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.paymentTransaction.upsert({
          where: { id: row.id },
          update: {},
          create: {
            id:         row.id,
            orderId:    row.order_id,
            amount:     row.amount ?? 0,
            method:     row.method ?? 'CASH',
            status:     row.status ?? 'PENDING',
            reference:  row.reference,
            slipUrl:    row.slip_url,
            verifiedAt: row.verified_at,
            createdAt:  row.created_at,
          },
        })
        count++
      } catch (err) {
        if (!err.message.includes('Unique constraint')) {
          console.error(`[migrate]   ✗ PaymentTransaction ${row.id}: ${err.message}`)
        }
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 7 — Enrollments
// ─────────────────────────────────────────────

async function migrateEnrollments() {
  const enrollRows = await sourceQuery(`
    SELECT id, customer_id, package_id, order_id, status, hours_completed,
           completed_at, tenant_id, created_at, updated_at
    FROM enrollments
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${enrollRows.length} enrollments in source`)
  if (!DRY_RUN && enrollRows.length > 0) {
    await batchProcess(enrollRows, async (batch) => {
      let count = 0
      for (const row of batch) {
        try {
          await prisma.enrollment.upsert({
            where: { id: row.id },
            update: {
              status:         mapEnrollStatus(row.status),
              hoursCompleted: row.hours_completed ?? 0,
              completedAt:    row.completed_at,
              updatedAt:      row.updated_at,
            },
            create: {
              id:             row.id,
              tenantId:       row.tenant_id ?? VSCHOOL_TENANT_ID,
              customerId:     row.customer_id,
              packageId:      row.package_id,
              orderId:        row.order_id,
              status:         mapEnrollStatus(row.status),
              hoursCompleted: row.hours_completed ?? 0,
              completedAt:    row.completed_at,
              createdAt:      row.created_at,
            },
          })
          count++
        } catch (err) {
          console.error(`[migrate]   ✗ Enrollment ${row.id}: ${err.message}`)
        }
      }
      return count
    })
  }

  // Attendance records
  const attRows = await sourceQuery(`
    SELECT id, enrollment_id, schedule_id, status, checked_at, created_at
    FROM class_attendance
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${attRows.length} attendance records in source`)
  if (DRY_RUN || attRows.length === 0) return

  await batchProcess(attRows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        await prisma.classAttendance.upsert({
          where: {
            enrollmentId_scheduleId: {
              enrollmentId: row.enrollment_id,
              scheduleId:   row.schedule_id,
            },
          },
          update: {
            status:    row.status ?? 'PRESENT',
            checkedAt: row.checked_at,
          },
          create: {
            id:           row.id,
            enrollmentId: row.enrollment_id,
            scheduleId:   row.schedule_id,
            status:       row.status ?? 'PRESENT',
            checkedAt:    row.checked_at,
            createdAt:    row.created_at,
          },
        })
        count++
      } catch (err) {
        if (!err.message.includes('Unique constraint')) {
          console.error(`[migrate]   ✗ Attendance ${row.enrollment_id}/${row.schedule_id}: ${err.message}`)
        }
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 8 — Audit Logs
// ─────────────────────────────────────────────

async function migrateAuditLogs() {
  const rows = await sourceQuery(`
    SELECT id, action, entity, entity_id, actor_id, actor_role,
           before_data, after_data, ip_address, tenant_id, created_at
    FROM audit_logs
    ORDER BY created_at
  `)

  console.log(`[migrate]   Found ${rows.length} audit log entries in source`)
  if (DRY_RUN || rows.length === 0) return

  await batchProcess(rows, async (batch) => {
    let count = 0
    for (const row of batch) {
      try {
        // AuditLog typically append-only — skip if already exists
        const existing = await prisma.auditLog.findUnique({ where: { id: row.id } })
        if (existing) { count++; continue }

        await prisma.auditLog.create({
          data: {
            id:          row.id,
            tenantId:    row.tenant_id ?? VSCHOOL_TENANT_ID,
            action:      row.action,
            entity:      row.entity,
            entityId:    row.entity_id,
            actorId:     row.actor_id,
            actorRole:   normalizeRole(row.actor_role),
            beforeData:  row.before_data,
            afterData:   row.after_data,
            ipAddress:   row.ip_address,
            createdAt:   row.created_at,
          },
        })
        count++
      } catch (err) {
        if (!err.message.includes('Unique constraint')) {
          console.error(`[migrate]   ✗ AuditLog ${row.id}: ${err.message}`)
        }
      }
    }
    return count
  })
}

// ─────────────────────────────────────────────
// Phase 9 — Verify Row Counts
// ─────────────────────────────────────────────

async function verifyRowCounts() {
  const tables = [
    { source: 'tenants',              target: 'tenant' },
    { source: 'employees',            target: 'employee' },
    { source: 'customers',            target: 'customer' },
    { source: 'conversations',        target: 'conversation' },
    { source: 'messages',             target: 'message' },
    { source: 'products',             target: 'product' },
    { source: 'orders',               target: 'order' },
    { source: 'order_items',          target: 'orderItem' },
    { source: 'payment_transactions', target: 'paymentTransaction' },
    { source: 'enrollments',          target: 'enrollment' },
    { source: 'class_attendance',     target: 'classAttendance' },
    { source: 'audit_logs',           target: 'auditLog' },
  ]

  console.log('[migrate]   Row count verification:')
  console.log('[migrate]   ─────────────────────────────────────────────────')
  console.log('[migrate]   Table                      Source    Target  Status')
  console.log('[migrate]   ─────────────────────────────────────────────────')

  let hasError = false

  for (const { source: srcTable, target: tgtModel } of tables) {
    const srcRows = await sourceQuery(`SELECT COUNT(*) AS n FROM ${srcTable}`)
    const srcCount = srcRows.length > 0 ? parseInt(srcRows[0].n, 10) : 0

    const tgtCount = DRY_RUN ? 0 : await prisma[tgtModel].count()

    const status = srcCount === 0 ? '—'
                 : tgtCount >= srcCount ? '✓'
                 : '⚠ MISMATCH'

    if (status === '⚠ MISMATCH') hasError = true

    const padded = srcTable.padEnd(26)
    console.log(`[migrate]   ${padded} ${String(srcCount).padStart(6)}    ${String(tgtCount).padStart(6)}  ${status}`)
  }

  console.log('[migrate]   ─────────────────────────────────────────────────')

  if (hasError) {
    throw new Error('Row count mismatch detected — review logs above and re-run failed phases')
  }
}

// ─────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────

const phases = [
  { name: 'Tenants',                     fn: migrateTenants },
  { name: 'Employees',                   fn: migrateEmployees },
  { name: 'Customers + Profiles',        fn: migrateCustomers },
  { name: 'Conversations + Messages',    fn: migrateConversations },
  { name: 'Products + Packages',         fn: migrateProducts },
  { name: 'Orders + Items + Txns',       fn: migrateOrders },
  { name: 'Enrollments + Attendance',    fn: migrateEnrollments },
  { name: 'Audit Logs',                  fn: migrateAuditLogs },
  { name: 'Verify Row Counts',           fn: verifyRowCounts },
]

async function main() {
  if (!process.env.SOURCE_DATABASE_URL) {
    console.error('[migrate] ✗ SOURCE_DATABASE_URL is not set')
    console.error('[migrate]   Add it to Doppler (project vschool-crm, config dev) and re-run')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('[migrate] ✗ DATABASE_URL is not set — run via Doppler:')
    console.error('[migrate]   doppler run --project vschool-crm --config dev -- node scripts/migrate-zuri-to-co.js')
    process.exit(1)
  }

  console.log('[migrate] ════════════════════════════════════════════════')
  console.log('[migrate] ZURI-v1 → Zuri v2 Migration')
  console.log(`[migrate] Tenant:   ${VSCHOOL_TENANT_ID}`)
  console.log(`[migrate] DRY_RUN:  ${DRY_RUN}`)
  console.log(`[migrate] BATCH:    ${BATCH_SIZE}`)
  console.log('[migrate] ════════════════════════════════════════════════\n')

  // Connect to source DB
  source = new Pool({ connectionString: process.env.SOURCE_DATABASE_URL })
  await source.query('SELECT 1') // validate connection
  console.log('[migrate] Source DB connected ✓')

  // Connect to target DB
  prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: ['error'],
  })
  await prisma.$connect()
  console.log('[migrate] Target DB connected ✓\n')

  let failedPhase = null

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    console.log(`[migrate] ── Phase ${i + 1}/${phases.length}: ${phase.name}`)
    try {
      await phase.fn()
      console.log(`[migrate] Phase ${i + 1} complete ✓`)
    } catch (error) {
      console.error(`\n[migrate] ✗ Phase ${i + 1} FAILED: ${error.message}`)
      failedPhase = i + 1
      break
    }
  }

  // Cleanup
  await source.end()
  await prisma.$disconnect()

  if (failedPhase) {
    console.error(`\n[migrate] ✗ Migration stopped at phase ${failedPhase}`)
    console.error('[migrate]   Fix the error above and re-run — script is idempotent')
    process.exit(1)
  }

  console.log('\n[migrate] ════════════════════════════════════════════════')
  console.log('[migrate] Migration complete ✓')
  if (DRY_RUN) console.log('[migrate] (DRY RUN — no data was written)')
  console.log('[migrate] ════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('[migrate] Fatal:', err)
  process.exit(1)
})
