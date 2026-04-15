#!/usr/bin/env node

/**
 * Zuri Migration Rollback Script
 *
 * Identifier: ZDEV-TSK-20260410-001 (initial) + ZDEV-TSK-20260410-032 (targeted rollback)
 *
 * Usage:
 *   DATABASE_URL=postgres://... node scripts/migrate-rollback.js [options]
 *
 * Options:
 *   --dry-run                    Log projections without committing to target DB
 *   --migration-id=<id>          Delete only rows from this migration run
 *                                (default: delete ALL MigrationLog entries for the tenant)
 *   --legacy                     Fall back to the v1 behaviour: delete all
 *                                migrated-domain records by tenantId regardless of
 *                                MigrationLog. DANGEROUS — use only for environments
 *                                where the log is empty or corrupt.
 *
 * Design (ZDEV-TSK-20260410-032):
 *   - Default path uses MigrationLog to delete ONLY migration-created rows.
 *   - Employees are NEVER deleted (ADR: keep system users — they are shared
 *     auth state that survives across migration runs).
 *   - The Tenant record is NEVER deleted (it may be referenced by data created
 *     outside the migration).
 *   - The MigrationLog rows for the rolled-back run are deleted at the end.
 */

const { PrismaClient } = require('@prisma/client');

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY = process.argv.includes('--legacy');
const DEFAULT_TENANT_ID = '10000000-0000-0000-0000-000000000001';

const cliMigrationArg = process.argv.find((a) => a.startsWith('--migration-id='));
const MIGRATION_ID = (cliMigrationArg && cliMigrationArg.split('=')[1]) || null;

const prisma = new PrismaClient();

// Deletion order (children → parents) so foreign keys stay happy.
// Employees and Tenant are intentionally excluded.
const DELETE_ORDER = [
  'message',        // Message → Conversation
  'conversation',   // Conversation → Customer / Tenant
  'enrollment',     // Enrollment → Customer / Product
  'order',          // Order → Customer
  'product',        // Product → Tenant
  'customer',       // Customer → Tenant
];

// Prisma delegate lookup — keeps the delete block data-driven.
function delegateFor(prismaClient, entityType) {
  const map = {
    message: prismaClient.message,
    conversation: prismaClient.conversation,
    enrollment: prismaClient.enrollment,
    order: prismaClient.order,
    product: prismaClient.product,
    customer: prismaClient.customer,
  };
  return map[entityType];
}

async function rollbackByMigrationLog() {
  console.log(`\n🧹 Starting Targeted Rollback (Dry Run: ${DRY_RUN})`);
  console.log(`   Tenant: ${DEFAULT_TENANT_ID}`);
  console.log(`   Migration ID filter: ${MIGRATION_ID ?? '(all migrations for this tenant)'}\n`);

  // 1. Gather IDs per entity type from MigrationLog
  const logWhere = {
    tenantId: DEFAULT_TENANT_ID,
    ...(MIGRATION_ID ? { migrationId: MIGRATION_ID } : {}),
  };

  const logs = await prisma.migrationLog.findMany({
    where: logWhere,
    select: { entityType: true, entityId: true },
  });

  if (logs.length === 0) {
    console.log('ℹ️  No MigrationLog entries match the given criteria.');
    console.log('   Nothing to roll back. (Pass --legacy to force per-tenant delete.)');
    return;
  }

  // Group by entityType
  const idsByType = new Map();
  for (const { entityType, entityId } of logs) {
    if (!idsByType.has(entityType)) idsByType.set(entityType, new Set());
    idsByType.get(entityType).add(entityId);
  }

  // Preview counts in deletion order
  const preview = DELETE_ORDER.map((t) => ({
    entityType: t,
    count: (idsByType.get(t) ?? new Set()).size,
  }));
  const employeeCount = (idsByType.get('employee') ?? new Set()).size;

  console.log('Rollback plan (deletion order):');
  console.table(preview);
  if (employeeCount > 0) {
    console.log(`ℹ️  ${employeeCount} Employee record(s) are tracked in MigrationLog but will be KEPT (ADR: system users).`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes committed.');
    return;
  }

  // 2. Execute rollback in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const entityType of DELETE_ORDER) {
      const ids = Array.from(idsByType.get(entityType) ?? []);
      if (ids.length === 0) continue;

      const delegate = delegateFor(tx, entityType);
      if (!delegate) {
        console.warn(`[Skip] Unknown entityType: ${entityType}`);
        continue;
      }

      console.log(`Deleting ${ids.length} ${entityType}(s)...`);
      // Scope by tenantId too as a belt-and-braces safety check.
      const tenantScopedWhere =
        entityType === 'message'
          ? { id: { in: ids }, conversation: { tenantId: DEFAULT_TENANT_ID } }
          : { id: { in: ids }, tenantId: DEFAULT_TENANT_ID };

      await delegate.deleteMany({ where: tenantScopedWhere });
    }

    // 3. Clean up the MigrationLog entries we just honoured
    console.log('Deleting MigrationLog entries for this run...');
    await tx.migrationLog.deleteMany({
      where: {
        ...logWhere,
        // Don't nuke employee log rows if we're doing a --migration-id rollback
        // — keep the audit trail that the migration ran against the employee.
        // Actually: drop them too since the run is being rolled back.
      },
    });
  });

  console.log('\n✅ Rollback completed successfully.');
  console.log(`   Deleted ${logs.length - employeeCount} domain record(s), kept ${employeeCount} employee(s).\n`);
}

async function rollbackLegacyByTenant() {
  console.log(`\n🧹 Starting LEGACY Rollback (Dry Run: ${DRY_RUN})`);
  console.log('   ⚠️  This deletes ALL domain records for the tenant,');
  console.log('       not just migration-created ones. Use with care.\n');
  console.log(`   Tenant: ${DEFAULT_TENANT_ID}\n`);

  const counts = {
    orderItems: await prisma.orderItem.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    transactions: await prisma.transaction.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    orders: await prisma.order.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    attendances: await prisma.classAttendance.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    enrollmentItems: await prisma.enrollmentItem.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    enrollments: await prisma.enrollment.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    messages: await prisma.message.count({
      where: { conversation: { tenantId: DEFAULT_TENANT_ID } },
    }),
    conversations: await prisma.conversation.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    customerInsights: await prisma.customerInsight.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    customerProfiles: await prisma.customerProfile.count({
      where: { customer: { tenantId: DEFAULT_TENANT_ID } },
    }),
    customers: await prisma.customer.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    products: await prisma.product.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
  };

  console.log('Records found for deletion:');
  console.table(counts);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes committed.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    console.log('Deleting OrderItems...');
    await tx.orderItem.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Transactions...');
    await tx.transaction.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Orders...');
    await tx.order.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting ClassAttendances...');
    await tx.classAttendance.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting EnrollmentItems...');
    await tx.enrollmentItem.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Enrollments...');
    await tx.enrollment.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Messages...');
    await tx.message.deleteMany({
      where: { conversation: { tenantId: DEFAULT_TENANT_ID } },
    });

    console.log('Deleting Conversations...');
    await tx.conversation.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Insights & Profiles...');
    await tx.customerInsight.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
    await tx.customerProfile.deleteMany({
      where: { customer: { tenantId: DEFAULT_TENANT_ID } },
    });

    console.log('Deleting Customers...');
    await tx.customer.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    console.log('Deleting Products...');
    await tx.product.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

    // Employees are intentionally kept.

    console.log('\n✅ Legacy rollback completed successfully.');
  });
}

async function main() {
  try {
    if (LEGACY) {
      await rollbackLegacyByTenant();
    } else {
      await rollbackByMigrationLog();
    }
  } catch (err) {
    console.error('Rollback failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
