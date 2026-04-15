// Created At: 2026-04-10 05:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:30:00 +07:00 (v1.0.0)

/**
 * One-time setup: create a Postgres trigger that blocks any UPDATE or DELETE
 * on the audit_logs table, enforcing immutability at the DB layer.
 *
 * Run: doppler run -- node scripts/add-audit-trigger.mjs
 *
 * This script is idempotent — safe to re-run (uses CREATE OR REPLACE).
 * The application-layer immutability contract (auditRepo has no mutators)
 * remains the first line of defense; this trigger is defense-in-depth.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔒 Installing audit_logs immutability trigger…\n')

  // 1. Create the trigger function
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION block_audit_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs is append-only — UPDATE and DELETE are forbidden';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `)
  console.log('  ✅ Trigger function block_audit_mutation() created')

  // 2. Drop existing triggers (idempotent re-run)
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS no_audit_update ON audit_logs;
  `)
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS no_audit_delete ON audit_logs;
  `)

  // 3. Create triggers for UPDATE and DELETE
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER no_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();
  `)
  console.log('  ✅ Trigger no_audit_update installed on audit_logs')

  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER no_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION block_audit_mutation();
  `)
  console.log('  ✅ Trigger no_audit_delete installed on audit_logs')

  // 4. Verify
  const triggers = await prisma.$queryRaw`
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'audit_logs'
    ORDER BY trigger_name
  `
  console.log('\n📋 Active triggers on audit_logs:')
  for (const t of triggers) {
    console.log(`   ${t.trigger_name} — ${t.action_timing} ${t.event_manipulation}`)
  }

  console.log('\nDone. audit_logs is now protected at the DB level.')
}

main()
  .catch((err) => { console.error('Failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
