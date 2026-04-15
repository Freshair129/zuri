import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as marketingRepo from '@/lib/repositories/marketingRepo'

/**
 * GET /api/marketing/ad-timeline?range=7d
 * Returns Gantt-style timeline of ads delivering in the window.
 *
 * Response:
 *   {
 *     range: "7d",
 *     dates: ["2026-04-03", ..., "2026-04-10"],
 *     ads: [
 *       {
 *         adId, name, status,
 *         firstSpend, lastSpend, activeDays,
 *         totalSpend, totalImpressions, totalClicks, totalLeads,
 *         dailySpend: { "2026-04-03": 100.0, ... }
 *       }, ...
 *     ]
 *   }
 *
 * Cached 5 min via marketingRepo. Tenant scoped via session.
 */
export const GET = withAuth(
  async (req, { session }) => {
    try {
      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || '7d'
      const data = await marketingRepo.getAdTimeline(session.user.tenantId, range)
      return NextResponse.json(data)
    } catch (error) {
      console.error('[marketing/ad-timeline]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
