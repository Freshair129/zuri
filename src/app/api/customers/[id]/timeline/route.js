/**
 * GET /api/customers/[id]/timeline?type=&page=&limit=
 * Returns paginated activity timeline for a customer (real-time, no cache)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getTimeline } from '@/lib/repositories/customerRepo'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const { searchParams } = new URL(request.url)

      const type  = searchParams.get('type')  || undefined
      const page  = parseInt(searchParams.get('page')  ?? '1')
      const limit = parseInt(searchParams.get('limit') ?? '20')

      const result = await getTimeline(tenantId, id, { type, page, limit })
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Customers/Timeline.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'R' }
)
