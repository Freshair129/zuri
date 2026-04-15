import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findByTenant, countByTenant } from '@/lib/repositories/auditRepo'

export const dynamic = 'force-dynamic'

// GET /api/audit - Get audit logs for the tenant
//
// Query params:
//   action      filter by action verb (e.g. EMPLOYEE_ROLE_CHANGE)
//   actor       filter by actor label (e.g. EMP-12)
//   actorId     filter by canonical Employee.id
//   target      filter by target resource id
//   targetType  filter by target resource type
//   since,until ISO date range
//   page,limit  pagination (default 1 / 50, capped at 200)
//
// RBAC: audit:R (DEV F, OWNER R, MANAGER R; others 403)
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || undefined
    const actor = searchParams.get('actor') || undefined
    const actorId = searchParams.get('actorId') || undefined
    const target = searchParams.get('target') || undefined
    const targetType = searchParams.get('targetType') || undefined
    const since = searchParams.get('since') || undefined
    const until = searchParams.get('until') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
    const skip = (page - 1) * limit

    const filters = { action, actor, actorId, target, targetType, since, until }

    const [logs, total] = await Promise.all([
      findByTenant(tenantId, { ...filters, limit, skip }),
      countByTenant(tenantId, filters),
    ])

    return NextResponse.json({ data: logs, total, page, limit })
  } catch (error) {
    console.error('[Audit_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'audit', action: 'R' })
