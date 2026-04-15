/**
 * GET /api/marketing/ads?range=30d
 * Returns flat ad-level list with window metrics for the Campaign Tracker page.
 * RBAC: marketing:R (read for everyone in marketing).
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getAdsForToggleTable } from '@/lib/repositories/marketingRepo'

export const GET = withAuth(
  async (req, { session }) => {
    try {
      const { searchParams } = new URL(req.url)
      const range = searchParams.get('range') || '30d'
      const ads = await getAdsForToggleTable(session.user.tenantId, range)
      return NextResponse.json({ range, ads })
    } catch (error) {
      console.error('[marketing/ads]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
