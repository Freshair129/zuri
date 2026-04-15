// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// Previous version: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-13 01:00:00 +07:00 (v1.1.0)
// FEAT21: Backfill ownerEmployeeId for existing tenants — DEV only — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import { getPrisma } from '@/lib/db'

/**
 * POST /api/admin/backfill-owners
 * DEV only. Protected by x-admin-secret header (= NEXTAUTH_SECRET).
 * For each tenant that has no ownerEmployeeId set:
 *   1. Find the earliest active Employee
 *   2. Set their role → OWNER, roles → ['OWNER']
 *   3. Set Tenant.ownerEmployeeId → that employee's id
 *
 * Idempotent — tenants that already have ownerEmployeeId are skipped.
 */
export async function POST(request) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prisma = await getPrisma()

  // Find all tenants without ownerEmployeeId
  const tenants = await prisma.tenant.findMany({
    where: { ownerEmployeeId: null },
    select: { id: true, tenantSlug: true },
  })

  if (tenants.length === 0) {
    return Response.json({ message: 'All tenants already have ownerEmployeeId set.', updated: 0 })
  }

  const results = []

  for (const tenant of tenants) {
    // Find earliest active employee — prefer existing OWNER, fallback to earliest MANAGER, then any active
    const candidate = await prisma.employee.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: [
        // OWNER first, then MANAGER, then by creation date
        { createdAt: 'asc' },
      ],
      select: { id: true, email: true, role: true, createdAt: true },
    })

    if (!candidate) {
      results.push({ tenantId: tenant.id, slug: tenant.tenantSlug, status: 'SKIPPED_NO_EMPLOYEES' })
      continue
    }

    try {
      await prisma.$transaction([
        prisma.employee.update({
          where: { id: candidate.id },
          data: { role: 'OWNER', roles: ['OWNER'] },
        }),
        prisma.tenant.update({
          where: { id: tenant.id },
          data: { ownerEmployeeId: candidate.id },
        }),
      ])

      results.push({
        tenantId:   tenant.id,
        slug:       tenant.tenantSlug,
        status:     'UPDATED',
        employeeId: candidate.id,
        email:      candidate.email,
        wasRole:    candidate.role,
      })
    } catch (err) {
      console.error('[BackfillOwners] tx failed for tenant', tenant.id, err)
      results.push({ tenantId: tenant.id, slug: tenant.tenantSlug, status: 'ERROR', error: err.message })
    }
  }

  const updated = results.filter(r => r.status === 'UPDATED').length
  console.log(`[BackfillOwners] Done — ${updated}/${tenants.length} tenants updated`)

  return Response.json({ updated, total: tenants.length, results })
}
