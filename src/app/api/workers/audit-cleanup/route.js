// Created At: 2026-04-10 05:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:30:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getPrisma } from '@/lib/db'

/**
 * POST /api/workers/audit-cleanup
 * QStash cron worker — purge audit_logs older than per-tenant retention window.
 *
 * Schedule: daily at 02:00 ICT (19:00 UTC)
 * Retention: tenant.config.auditRetentionDays (default 365, minimum 30)
 *
 * IMMUTABILITY NOTE: auditRepo intentionally has no delete. This worker
 * bypasses the repo layer and issues direct SQL because retention cleanup
 * is a legitimate scheduled purge, not an in-place mutation of recent data.
 * Each deletion is logged to stdout for operator review.
 */

const DEFAULT_RETENTION_DAYS = 365
const MIN_RETENTION_DAYS     = 30

const prisma = getPrisma()

async function cleanupTenant(tenantId, retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  // COUNT first so we can report accurately
  const [{ count }] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM audit_logs
    WHERE tenant_id = ${tenantId}
      AND created_at < ${cutoff}
  `

  if (count === 0) return { deleted: 0, cutoff }

  // Hard delete — bypass trigger by using Prisma's direct client
  // (The DB trigger blocks UPDATE/DELETE from app code; this worker
  //  must be granted a Postgres role with superuser or trigger bypass
  //  in production, OR the trigger must have a SESSION variable guard.)
  await prisma.$executeRaw`
    DELETE FROM audit_logs
    WHERE tenant_id = ${tenantId}
      AND created_at < ${cutoff}
  `

  return { deleted: count, cutoff }
}

export async function POST(req) {
  const { isValid } = await verifyQStashSignature(req)
  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  try {
    const tenants = await prisma.tenant.findMany({
      where:  { isActive: true },
      select: { id: true, tenantSlug: true, config: true },
    })

    const results = []

    for (const tenant of tenants) {
      const configRetention = tenant.config?.auditRetentionDays
      const retentionDays = Math.max(
        MIN_RETENTION_DAYS,
        typeof configRetention === 'number' ? configRetention : DEFAULT_RETENTION_DAYS
      )

      try {
        const { deleted, cutoff } = await cleanupTenant(tenant.id, retentionDays)
        if (deleted > 0) {
          console.log('[audit-cleanup]', {
            tenantSlug: tenant.tenantSlug,
            retentionDays,
            cutoff: cutoff.toISOString(),
            deleted,
          })
        }
        results.push({ tenantSlug: tenant.tenantSlug, retentionDays, deleted })
      } catch (err) {
        console.error(`[audit-cleanup] tenant ${tenant.tenantSlug} failed:`, err.message)
        results.push({ tenantSlug: tenant.tenantSlug, error: err.message })
      }
    }

    const totalDeleted = results.reduce((s, r) => s + (r.deleted ?? 0), 0)
    console.log(`[audit-cleanup] complete — ${totalDeleted} records purged across ${tenants.length} tenants`)

    return NextResponse.json({ ok: true, totalDeleted, results })
  } catch (error) {
    console.error('[audit-cleanup]', error)
    throw error // QStash retry
  }
}
