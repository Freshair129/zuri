import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getDailyBriefByDate } from '@/lib/repositories/dailyBriefRepo'

// GET /api/daily-brief/[date] - Get daily brief for a specific date (YYYY-MM-DD)
export const GET = withAuth(
  async (request, { params }) => {
    try {
      const tenantId = await getTenantId(request)
      if (!tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { date } = await params

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          { error: 'date must be in YYYY-MM-DD format' },
          { status: 400 }
        )
      }

      // Fetch daily brief by date
      const brief = await getDailyBriefByDate({ tenantId, date })
      if (!brief) {
        return NextResponse.json(
          { error: 'Brief not found for this date' },
          { status: 404 }
        )
      }

      return NextResponse.json({ data: brief })
    } catch (error) {
      console.error('[DailyBrief/Date]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
