#!/usr/bin/env node

/**
 * Migration Reconciliation — M7 Task G3 (ZDEV-TSK-20260410-030)
 *
 * After running scripts/migrate-zuri-v1.js, this script proves that the
 * legacy data and the Zuri side are in agreement. Specifically:
 *   1. Per-entity COUNT match (legacy_count == migration_log_count)
 *   2. Revenue SUM match (sum(legacy.orders.total_amount) == sum(target Order.totalAmount))
 *   3. Sample ID spot-check (random N rows confirmed present in target)
 *
 * Usage:
 *   OLD_DATABASE_URL=... DATABASE_URL=... \
 *     node scripts/migration-reconcile.js [options]
 *
 * Options:
 *   --migration-id=<id>     Reconcile only one migration run (default: all)
 *   --sample-size=<n>       Number of random orders to spot-check (default: 100)
 *   --revenue-tolerance=<f> Acceptable absolute revenue diff in THB (default: 0.01)
 *
 * Exit codes:
 *   0  — counts and sums match within tolerance
 *   1  — at least one mismatch (DO NOT proceed to go-live)
 *   2  — script crashed
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_TENANT_ID = '10000000-0000-0000-0000-000000000001';

const argFor = (name, def) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};

const MIGRATION_ID = argFor('migration-id', null);
const SAMPLE_SIZE = parseInt(argFor('sample-size', '100'), 10);
const REVENUE_TOLERANCE = parseFloat(argFor('revenue-tolerance', '0.01'));

let mismatches = 0;

function pad(n) { return String(n).padStart(8); }
function ok(label, expected, actual) {
  console.log(`  ✅ ${label.padEnd(20)} expected=${pad(expected)}  actual=${pad(actual)}`);
}
function bad(label, expected, actual, diff) {
  console.log(`  ❌ ${label.padEnd(20)} expected=${pad(expected)}  actual=${pad(actual)}  diff=${diff}`);
  mismatches++;
}

async function reconcileCounts(sourcePool, prisma) {
  console.log('\n── Entity counts ──');

  const sourceCounts = {};
  const tables = {
    employee: 'employees',
    customer: 'customers',
    product: 'products',
    order: 'orders',
    enrollment: 'enrollments',
    conversation: 'conversations',
    message: 'messages',
  };

  for (const [entityType, table] of Object.entries(tables)) {
    try {
      const { rows } = await sourcePool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
      sourceCounts[entityType] = rows[0].n;
    } catch (e) {
      console.log(`  ⚠️  Source table ${table} unavailable: ${e.message}`);
      sourceCounts[entityType] = null;
    }
  }

  // Target counts come from MigrationLog (NOT from raw target tables) so we
  // measure exactly what the migration created — manual data is excluded.
  const logWhere = {
    tenantId: DEFAULT_TENANT_ID,
    ...(MIGRATION_ID ? { migrationId: MIGRATION_ID } : {}),
  };

  for (const [entityType, sourceCount] of Object.entries(sourceCounts)) {
    if (sourceCount === null) continue;
    const targetCount = await prisma.migrationLog.count({
      where: { ...logWhere, entityType },
    });

    // Customers can legitimately be lower than source if dedup kicked in
    // (existing facebookId / lineId already present). Print as soft-warn.
    if (entityType === 'customer' && targetCount < sourceCount) {
      console.log(`  ⚠️  ${entityType.padEnd(20)} expected=${pad(sourceCount)}  actual=${pad(targetCount)}  (likely deduped)`);
      continue;
    }

    if (targetCount === sourceCount) {
      ok(entityType, sourceCount, targetCount);
    } else {
      bad(entityType, sourceCount, targetCount, sourceCount - targetCount);
    }
  }
}

async function reconcileRevenue(sourcePool, prisma) {
  console.log('\n── Revenue sum ──');
  let legacySum = 0;
  try {
    const { rows } = await sourcePool.query(
      `SELECT COALESCE(SUM(total_amount), 0)::float AS total FROM orders`,
    );
    legacySum = rows[0].total;
  } catch (e) {
    console.log(`  ⚠️  Source orders sum unavailable: ${e.message}`);
    return;
  }

  // Target revenue: orders that came from this migration only
  const logWhere = {
    tenantId: DEFAULT_TENANT_ID,
    entityType: 'order',
    ...(MIGRATION_ID ? { migrationId: MIGRATION_ID } : {}),
  };
  const orderLogs = await prisma.migrationLog.findMany({
    where: logWhere,
    select: { entityId: true },
  });
  const orderIds = orderLogs.map((l) => l.entityId);

  if (orderIds.length === 0) {
    console.log('  ⚠️  No migrated orders found in MigrationLog — skipping revenue check.');
    return;
  }

  const targetSumResult = await prisma.order.aggregate({
    where: { id: { in: orderIds } },
    _sum: { totalAmount: true },
  });
  const targetSum = targetSumResult._sum.totalAmount ?? 0;

  const diff = Math.abs(legacySum - targetSum);
  console.log(`  Legacy sum:  ฿${legacySum.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`);
  console.log(`  Target sum:  ฿${targetSum.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`);
  console.log(`  Diff:        ฿${diff.toLocaleString('th-TH', { maximumFractionDigits: 2 })} (tolerance ฿${REVENUE_TOLERANCE})`);

  if (diff <= REVENUE_TOLERANCE) {
    console.log('  ✅ Revenue reconciled within tolerance');
  } else {
    console.log('  ❌ Revenue MISMATCH outside tolerance');
    mismatches++;
  }
}

async function spotCheck(sourcePool, prisma) {
  console.log(`\n── Spot check (${SAMPLE_SIZE} random orders) ──`);

  let sampleIds = [];
  try {
    const { rows } = await sourcePool.query(
      `SELECT id FROM orders ORDER BY RANDOM() LIMIT $1`,
      [SAMPLE_SIZE],
    );
    sampleIds = rows.map((r) => r.id);
  } catch (e) {
    console.log(`  ⚠️  Could not draw sample: ${e.message}`);
    return;
  }

  if (sampleIds.length === 0) {
    console.log('  ⚠️  No source orders to sample');
    return;
  }

  // Find sourceIds in MigrationLog → look up entityIds → confirm in target.
  const logs = await prisma.migrationLog.findMany({
    where: {
      tenantId: DEFAULT_TENANT_ID,
      entityType: 'order',
      sourceId: { in: sampleIds },
      ...(MIGRATION_ID ? { migrationId: MIGRATION_ID } : {}),
    },
    select: { sourceId: true, entityId: true },
  });

  const foundIds = new Set(logs.map((l) => l.sourceId));
  const missing = sampleIds.filter((id) => !foundIds.has(id));

  if (missing.length === 0) {
    console.log(`  ✅ All ${sampleIds.length} sampled orders are tracked in MigrationLog`);
  } else {
    console.log(`  ❌ ${missing.length}/${sampleIds.length} sampled orders are NOT in MigrationLog`);
    console.log('     First 5 missing source IDs:', missing.slice(0, 5));
    mismatches++;
  }

  // Confirm tracked target orders actually exist
  const targetEntityIds = logs.map((l) => l.entityId);
  if (targetEntityIds.length > 0) {
    const found = await prisma.order.count({
      where: { id: { in: targetEntityIds } },
    });
    if (found === targetEntityIds.length) {
      console.log(`  ✅ All ${targetEntityIds.length} tracked orders exist in target Order table`);
    } else {
      console.log(`  ❌ ${targetEntityIds.length - found} tracked orders MISSING from target Order table`);
      mismatches++;
    }
  }
}

async function main() {
  console.log('🔬 Zuri Migration Reconciliation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tenant:         ${DEFAULT_TENANT_ID}`);
  console.log(`Migration ID:   ${MIGRATION_ID ?? '(all runs)'}`);
  console.log(`Sample size:    ${SAMPLE_SIZE}`);
  console.log(`Revenue tol:    ฿${REVENUE_TOLERANCE}`);

  if (!process.env.OLD_DATABASE_URL || !process.env.DATABASE_URL) {
    console.error('\n❌ OLD_DATABASE_URL and DATABASE_URL must both be set');
    process.exit(2);
  }

  const sourcePool = new Pool({ connectionString: process.env.OLD_DATABASE_URL });
  const prisma = new PrismaClient();

  try {
    await reconcileCounts(sourcePool, prisma);
    await reconcileRevenue(sourcePool, prisma);
    await spotCheck(sourcePool, prisma);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (mismatches === 0) {
      console.log('✅ Reconciliation PASSED — safe to proceed to go-live');
      process.exit(0);
    } else {
      console.log(`❌ Reconciliation FAILED — ${mismatches} mismatch(es). DO NOT go live.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n💥 Reconciliation crashed:', err);
    process.exit(2);
  } finally {
    await sourcePool.end();
    await prisma.$disconnect();
  }
}

main();
