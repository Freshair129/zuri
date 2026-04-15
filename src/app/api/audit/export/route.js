// Created At: 2026-04-10 05:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:30:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findByTenant } from '@/lib/repositories/auditRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/audit/export
 * Download audit logs as CSV or JSON.
 *
 * Query params (same filters as /api/audit):
 *   format      'csv' (default) | 'json'
 *   action, actor, actorId, target, targetType, since, until
 *   limit       max 5000 (for export — higher than viewer)
 *
 * RBAC: audit:R (DEV F, OWNER R, MANAGER R)
 */
export const GET = withAuth(async (request) => {
  const tenantId = await getTenantId(request)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format     = searchParams.get('format') ?? 'csv'
  const action     = searchParams.get('action')     || undefined
  const actor      = searchParams.get('actor')      || undefined
  const actorId    = searchParams.get('actorId')    || undefined
  const target     = searchParams.get('target')     || undefined
  const targetType = searchParams.get('targetType') || undefined
  const since      = searchParams.get('since')      || undefined
  const until      = searchParams.get('until')      || undefined
  const limit      = Math.min(5000, parseInt(searchParams.get('limit') ?? '5000', 10))

  try {
    const logs = await findByTenant(tenantId, {
      action, actor, actorId, target, targetType, since, until,
      limit, skip: 0,
    })

    const ts = new Date().toISOString().slice(0, 10)

    if (format === 'json') {
      const body = JSON.stringify({ exportedAt: new Date().toISOString(), total: logs.length, data: logs }, null, 2)
      return new Response(body, {
        headers: {
          'Content-Type':        'application/json',
          'Content-Disposition': `attachment; filename="audit-log-${ts}.json"`,
        },
      })
    }

    // CSV
    const CSV_COLS = ['id', 'createdAt', 'action', 'actor', 'actorRole', 'actorId', 'targetType', 'target', 'ipAddress', 'before', 'after', 'details', 'userAgent']

    function escapeCsv(val) {
      if (val == null) return ''
      const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const header = CSV_COLS.join(',')
    const rows   = logs.map((log) =>
      CSV_COLS.map((col) => escapeCsv(log[col])).join(',')
    )
    const csv = [header, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${ts}.csv"`,
      },
    })
  } catch (error) {
    console.error('[Audit_Export_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'audit', action: 'R' })
