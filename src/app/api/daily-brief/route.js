import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getDailyBriefs } from '@/lib/repositories/dailyBriefRepo'

export const dynamic = 'force-dynamic'

// GET /api/daily-brief - List daily brief summaries (most recent first)
export const GET = withAuth(
  async (request) => {
    try {
      const tenantId = await getTenantId(request)
      if (!tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') ?? '1')
      const limit = parseInt(searchParams.get('limit') ?? '10')

      // Fetch daily briefs with pagination
      const briefs = await getDailyBriefs({ tenantId, page, limit })

      return NextResponse.json({ data: briefs, page, limit })
    } catch (error) {
      console.error('[DailyBrief/List]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
