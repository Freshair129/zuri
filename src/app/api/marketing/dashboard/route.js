import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as marketingRepo from '@/lib/repositories/marketingRepo'

/**
 * GET /api/marketing/dashboard?range=30d
 * Returns KPI summary + period-over-period comparison for Marketing overview.
 * Scoped by tenantId from session. Redis cached 5 min.
 *
 * Query params:
 *   range  — '7d' | '30d' | '90d'  (default: '30d')
 *
 * Response: { range, current: KPI, previous: KPI, changes: { spend%, ... } }
 */
export const GET = withAuth(
  async (req, { session }) => {
    try {
      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || '30d'

      const tenantId = session.user.tenantId
      const data = await marketingRepo.getDashboardSummary(tenantId, range)
      return NextResponse.json(data)
    } catch (error) {
      console.error('[marketing/dashboard]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
