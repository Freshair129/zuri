#!/usr/bin/env node

/**
 * Migration Preflight Check — M7 Task G3 (ZDEV-TSK-20260410-030)
 *
 * Validates that everything is ready for the final production migration:
 *   - OLD_DATABASE_URL and DATABASE_URL are reachable
 *   - Required tables exist in target (incl. migration_logs from TSK-032)
 *   - Default tenant exists
 *   - Source schema looks sane (expected tables present)
 *   - Existing target counts (warn if non-empty so we don't double-migrate)
 *   - GEMINI_API_KEY is set (needed by relink-pdad later)
 *
 * Usage:
 *   OLD_DATABASE_URL=... DATABASE_URL=... GEMINI_API_KEY=... \
 *     node scripts/migration-preflight.js
 *
 * Exit codes:
 *   0  — all checks passed
 *   1  — at least one BLOCKING check failed
 *   2  — non-blocking warnings only (still safe to proceed)
 */

const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');

const DEFAULT_TENANT_ID = '10000000-0000-0000-0000-000000000001';
const REQUIRED_SOURCE_TABLES = ['employees', 'customers', 'products', 'orders', 'enrollments', 'conversations'];
const REQUIRED_TARGET_TABLES = [
  'tenants', 'employees', 'customers', 'products',
  'orders', 'enrollments', 'conversations', 'messages',
  'migration_logs',  // ZDEV-TSK-20260410-032
];

let blockers = 0;
let warnings = 0;

function ok(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); warnings++; }
function fail(msg) { console.log(`  ❌ ${msg}`); blockers++; }
function section(title) { console.log(`\n── ${title} ──`); }

async function checkEnv() {
  section('Environment variables');
  const required = {
    OLD_DATABASE_URL: 'Source DB connection string',
    DATABASE_URL: 'Target DB connection string',
  };
  const recommended = {
    GEMINI_API_KEY: 'Needed by migration-relink-pdad.mjs',
    MIGRATION_ID: 'Optional — auto-generated if absent',
  };

  for (const [k, desc] of Object.entries(required)) {
    if (process.env[k]) ok(`${k} set (${desc})`);
    else fail(`${k} missing — ${desc}`);
  }
  for (const [k, desc] of Object.entries(recommended)) {
    if (process.env[k]) ok(`${k} set (${desc})`);
    else warn(`${k} not set — ${desc}`);
  }
}

async function checkSourceDb() {
  section('Source database (legacy)');
  if (!process.env.OLD_DATABASE_URL) {
    fail('Cannot test connectivity — OLD_DATABASE_URL is not set');
    return;
  }

  const pool = new Pool({ connectionString: process.env.OLD_DATABASE_URL });
  try {
    const ping = await pool.query('SELECT 1 as ping');
    if (ping.rows[0].ping === 1) ok('Connected to source DB');

    const { rows: tables } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableSet = new Set(tables.map((r) => r.table_name));

    const counts = {};
    for (const tbl of REQUIRED_SOURCE_TABLES) {
      if (!tableSet.has(tbl)) {
        warn(`Table "${tbl}" not found in source — will be skipped during migration`);
        counts[tbl] = '—';
        continue;
      }
      try {
        const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${tbl}`);
        counts[tbl] = rows[0].n;
      } catch (e) {
        counts[tbl] = `ERR: ${e.message}`;
        warn(`Failed to count ${tbl}: ${e.message}`);
      }
    }
    console.log('\n  Source row counts:');
    console.table(counts);
  } catch (err) {
    fail(`Source DB error: ${err.message}`);
  } finally {
    await pool.end();
  }
}

async function checkTargetDb() {
  section('Target database (Zuri)');
  if (!process.env.DATABASE_URL) {
    fail('Cannot test connectivity — DATABASE_URL is not set');
    return;
  }

  const prisma = new PrismaClient();
  try {
    // Connectivity ping via raw query (works even before any model is touched)
    const ping = await prisma.$queryRawUnsafe('SELECT 1 as ping');
    if (ping[0].ping === 1) ok('Connected to target DB');

    // Required tables — query information_schema directly
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tableSet = new Set(tables.map((r) => r.table_name));

    for (const tbl of REQUIRED_TARGET_TABLES) {
      if (tableSet.has(tbl)) ok(`Table "${tbl}" present`);
      else fail(`Table "${tbl}" MISSING — run \`npx prisma db push\``);
    }

    // Default tenant must exist
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: DEFAULT_TENANT_ID } });
      if (tenant) ok(`Default tenant "${tenant.tenantName}" (${DEFAULT_TENANT_ID}) exists`);
      else warn(`Default tenant ${DEFAULT_TENANT_ID} does not exist yet — migrate-zuri-v1.js will create it`);
    } catch (e) {
      fail(`Tenant lookup failed: ${e.message}`);
    }

    // Existing counts (warn if non-empty so we don't blindly double-migrate)
    const existing = {
      tenants: await prisma.tenant.count(),
      employees: await prisma.employee.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      customers: await prisma.customer.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      products: await prisma.product.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      orders: await prisma.order.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      enrollments: await prisma.enrollment.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      conversations: await prisma.conversation.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
      migrationLogs: await prisma.migrationLog.count({ where: { tenantId: DEFAULT_TENANT_ID } }),
    };
    console.log('\n  Existing target counts (default tenant):');
    console.table(existing);

    const populated = ['employees', 'customers', 'products', 'orders', 'enrollments', 'conversations']
      .filter((k) => existing[k] > 0);
    if (populated.length > 0) {
      warn(`Target already has data in: ${populated.join(', ')}. Re-running migration is idempotent (upsert) but may produce surprising results.`);
    }
    if (existing.migrationLogs > 0) {
      warn(`MigrationLog has ${existing.migrationLogs} entries from prior runs. Use --migration-id on rollback to target a specific one.`);
    }
  } catch (err) {
    fail(`Target DB error: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🔍 Zuri Migration Preflight Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await checkEnv();
  await checkSourceDb();
  await checkTargetDb();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (blockers > 0) {
    console.log(`❌ ${blockers} blocker(s), ${warnings} warning(s) — DO NOT migrate yet`);
    process.exit(1);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} warning(s) — review carefully before proceeding`);
    process.exit(2);
  }
  console.log('✅ All checks passed — safe to run migrate-zuri-v1.js');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Preflight crashed:', err);
  process.exit(1);
});
