import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getSalesKpis } from '@/lib/services/salesKpiService'

/**
 * ZDEV-IMP-2639: Sales KPI Dashboard API
 * Returns aggregated sales and AI efficiency metrics.
 * RBAC: dashboard R (OWNER, MANAGER, FINANCE, STAFF, DEV)
 */
export const GET = withAuth(
  async (request, { session }) => {
    try {
      const { searchParams } = new URL(request.url)
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const tenantId = session.user.tenantId

      const kpis = await getSalesKpis(tenantId, { startDate, endDate })

      return NextResponse.json(kpis)
    } catch (error) {
      console.error('[SalesKPI] API Error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
  },
  { domain: 'dashboard', action: 'R' }
)
