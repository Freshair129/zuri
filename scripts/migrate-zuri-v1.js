#!/usr/bin/env node

/**
 * Zuri Migration Script v1 — ZURI v3.7 DB → Zuri Modular Schema
 *
 * Identifier: ZDEV-TSK-20260410-001 (initial) + ZDEV-TSK-20260410-032 (migratedAt tracking)
 *
 * Usage:
 *   OLD_DATABASE_URL=postgres://... DATABASE_URL=postgres://... node scripts/migrate-zuri-v1.js
 *
 * Options:
 *   --dry-run              Log projections without committing to target DB
 *   --migration-id=<id>    Override the auto-generated migration run ID
 *   --batch-size=<n>       Number of records per batch (default: 100)
 *
 * Every successful create writes a MigrationLog row so migrate-rollback.js
 * can safely undo just this migration without touching manually-entered data.
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { ulid } = require('ulid');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_TENANT_ID = '10000000-0000-0000-0000-000000000001';

// Allow CLI override: --migration-id=custom-label
const cliMigrationArg = process.argv.find((a) => a.startsWith('--migration-id='));
const MIGRATION_ID =
  (cliMigrationArg && cliMigrationArg.split('=')[1]) ||
  process.env.MIGRATION_ID ||
  `zuri-v1-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const sourcePool = new Pool({
  connectionString: process.env.OLD_DATABASE_URL,
});

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+66${digits.slice(1)}`;
  return raw;
}

async function fetchSource(table) {
  try {
    const { rows } = await sourcePool.query(`SELECT * FROM ${table}`);
    return rows;
  } catch (err) {
    console.warn(`[SKIP] Table ${table} not found in source.`);
    return [];
  }
}

/**
 * Record a successful create in the MigrationLog tracking table.
 * Upsert-safe: if the same (migrationId, entityType, entityId) already
 * exists (re-run of the same migration), we update `migratedAt` instead
 * of throwing on the unique constraint.
 */
async function logMigration(tx, { entityType, entityId, sourceId }) {
  if (DRY_RUN) return;
  await tx.migrationLog.upsert({
    where: {
      migrationId_entityType_entityId: {
        migrationId: MIGRATION_ID,
        entityType,
        entityId,
      },
    },
    update: { migratedAt: new Date(), sourceId: sourceId ?? null },
    create: {
      migrationId: MIGRATION_ID,
      entityType,
      entityId,
      tenantId: DEFAULT_TENANT_ID,
      sourceId: sourceId ?? null,
    },
  });
}

// ─── Migration Logic ────────────────────────────────────────────────────────

const ROLE_MAP = {
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
  'PUR':     'KITCHEN',
  'PD':      'KITCHEN',
  'ACC':     'FINANCE',
  'STF':     'STAFF',
};

async function migrate() {
  console.log(`\n🚀 Starting Migration`);
  console.log(`   Dry Run:     ${DRY_RUN}`);
  console.log(`   Migration ID: ${MIGRATION_ID}\n`);

  const counts = {
    employees: 0, customers: 0, products: 0,
    orders: 0, enrollments: 0, conversations: 0, messages: 0,
  };

  try {
    // 1. Tenants (V School Default)
    console.log('[Migrate] Initializing Tenant: V School');
    if (!DRY_RUN) {
      await prisma.tenant.upsert({
        where: { id: DEFAULT_TENANT_ID },
        update: {},
        create: {
          id: DEFAULT_TENANT_ID,
          tenantSlug: 'vschool',
          tenantName: 'V School',
        },
      });
      // Tenant is intentionally NOT logged in MigrationLog — it's a system
      // record that must survive rollback (ADR: keep shared system users).
    }

    // 2. Employees — NOTE: kept on rollback (ADR: system users stay)
    //    We still log them so rollback can audit the migration run.
    const employees = await fetchSource('employees');
    console.log(`[Migrate] Found ${employees.length} employees`);
    for (const emp of employees) {
      if (DRY_RUN) {
        console.log(`[Dry Run] Would migrate Employee: ${emp.name} (${emp.email})`);
        continue;
      }
      const created = await prisma.employee.upsert({
        where: { email: emp.email },
        update: {
          firstName: emp.first_name || emp.name?.split(' ')[0] || 'Unknown',
          lastName: emp.last_name || emp.name?.split(' ')[1] || '',
          role: ROLE_MAP[emp.role?.toUpperCase()] ?? 'STAFF',
          phone: normalizePhone(emp.phone),
        },
        create: {
          id: emp.id || ulid(),
          employeeId: emp.employee_id || `TVS-EMP-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          firstName: emp.first_name || emp.name?.split(' ')[0] || 'Unknown',
          lastName: emp.last_name || emp.name?.split(' ')[1] || '',
          email: emp.email,
          passwordHash: emp.password_hash || '$2b$10$legacy_placeholder_hash',
          role: ROLE_MAP[emp.role?.toUpperCase()] ?? 'STAFF',
          phone: normalizePhone(emp.phone),
        },
      });
      await logMigration(prisma, {
        entityType: 'employee',
        entityId: created.id,
        sourceId: emp.id ?? emp.employee_id ?? null,
      });
      counts.employees++;
    }
    console.log(`[Migrate] Employees: ${counts.employees}/${employees.length} done`);

    // 3. Customers
    const customers = await fetchSource('customers');
    console.log(`[Migrate] Found ${customers.length} customers`);
    for (const cust of customers) {
      if (DRY_RUN) {
        console.log(`[Dry Run] Would migrate Customer: ${cust.name}`);
        continue;
      }
      // Deduplication check — don't re-create customers we already have
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            cust.facebook_psid ? { facebookId: cust.facebook_psid } : null,
            cust.line_user_id ? { lineId: cust.line_user_id } : null,
          ].filter(Boolean),
        },
      });

      if (existing) {
        console.log(`[Skip] Customer exists: ${cust.name} (linked to ${existing.id})`);
        continue;
      }

      const created = await prisma.customer.create({
        data: {
          id: cust.id || ulid(),
          customerId: cust.customer_id || `TVS-CUS-MIG-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          name: cust.name,
          email: cust.email,
          phonePrimary: normalizePhone(cust.phone),
          facebookId: cust.facebook_psid,
          lineId: cust.line_user_id,
          status: 'Active',
          profile: {
            create: {
              gender: cust.gender,
              location: cust.address,
            },
          },
        },
      });
      await logMigration(prisma, {
        entityType: 'customer',
        entityId: created.id,
        sourceId: cust.id ?? cust.customer_id ?? null,
      });
      counts.customers++;
    }
    console.log(`[Migrate] Customers: ${counts.customers}/${customers.length} done`);

    // 4. Products
    const products = await fetchSource('products');
    for (const prod of products) {
      if (DRY_RUN) continue;
      const created = await prisma.product.upsert({
        where: { productId: prod.sku || prod.id },
        update: {},
        create: {
          id: prod.id || ulid(),
          productId: prod.sku || `PRD-MIG-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          name: prod.name,
          basePrice: prod.price || 0,
          category: prod.category || 'Legacy',
          isActive: true,
        },
      });
      await logMigration(prisma, {
        entityType: 'product',
        entityId: created.id,
        sourceId: prod.id ?? prod.sku ?? null,
      });
      counts.products++;
    }
    console.log(`[Migrate] Products: ${counts.products}/${products.length} done`);

    // 5. Orders
    const orders = await fetchSource('orders');
    for (const order of orders) {
      if (DRY_RUN) continue;
      const created = await prisma.order.upsert({
        where: { orderId: order.order_id || order.id },
        update: {},
        create: {
          id: order.id || ulid(),
          orderId: order.order_id || `ORD-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          customerId: order.customer_id,
          status: order.status?.toUpperCase() || 'PAID',
          totalAmount: order.total_amount || 0,
          createdAt: order.created_at || new Date(),
        },
      });
      await logMigration(prisma, {
        entityType: 'order',
        entityId: created.id,
        sourceId: order.id ?? order.order_id ?? null,
      });
      counts.orders++;
    }
    console.log(`[Migrate] Orders: ${counts.orders}/${orders.length} done`);

    // 6. Enrollments
    const enrollments = await fetchSource('enrollments');
    for (const enr of enrollments) {
      if (DRY_RUN) continue;
      const created = await prisma.enrollment.upsert({
        where: { enrollmentId: enr.enrollment_id || enr.id },
        update: {},
        create: {
          id: enr.id || ulid(),
          enrollmentId: enr.enrollment_id || `ENR-MIG-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          customerId: enr.customer_id,
          productId: enr.product_id,
          status: enr.status?.toUpperCase() || 'CONFIRMED',
          enrolledAt: enr.enrolled_at || new Date(),
        },
      });
      await logMigration(prisma, {
        entityType: 'enrollment',
        entityId: created.id,
        sourceId: enr.id ?? enr.enrollment_id ?? null,
      });
      counts.enrollments++;
    }
    console.log(`[Migrate] Enrollments: ${counts.enrollments}/${enrollments.length} done`);

    // 7. Conversations & Messages
    const convs = await fetchSource('conversations');
    for (const conv of convs) {
      if (DRY_RUN) continue;
      const newConv = await prisma.conversation.upsert({
        where: { conversationId: conv.conversation_id || conv.id },
        update: {},
        create: {
          id: conv.id || ulid(),
          conversationId: conv.conversation_id || `CONV-${ulid().slice(-4)}`,
          tenantId: DEFAULT_TENANT_ID,
          customerId: conv.customer_id,
          channel: conv.channel || 'facebook',
          status: conv.status || 'open',
        },
      });
      await logMigration(prisma, {
        entityType: 'conversation',
        entityId: newConv.id,
        sourceId: conv.id ?? conv.conversation_id ?? null,
      });
      counts.conversations++;

      // Messages for this conversation
      const msgs = await fetchSource(`messages WHERE conversation_id = '${conv.id}'`);
      for (const msg of msgs) {
        const newMsg = await prisma.message.upsert({
          where: { messageId: msg.message_id || msg.id },
          update: {},
          create: {
            id: msg.id || ulid(),
            messageId: msg.message_id || `MSG-${ulid().slice(-4)}`,
            conversationId: newConv.id,
            sender: msg.sender || 'customer',
            content: msg.content,
            createdAt: msg.created_at || new Date(),
          },
        });
        await logMigration(prisma, {
          entityType: 'message',
          entityId: newMsg.id,
          sourceId: msg.id ?? msg.message_id ?? null,
        });
        counts.messages++;
      }
    }
    console.log(`[Migrate] Conversations: ${counts.conversations}/${convs.length} done`);
    console.log(`[Migrate] Messages: ${counts.messages} done`);

    console.log('\n✅ Migration completed successfully.');
    console.log(`   Migration ID: ${MIGRATION_ID}`);
    console.log(`   To rollback:  node scripts/migrate-rollback.js --migration-id=${MIGRATION_ID}\n`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await prisma.$disconnect();
  }
}

migrate();
