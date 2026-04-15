/**
 * POST /api/customers/merge
 * Merges a secondary customer into a primary customer.
 * Security: MGR/ADM only.
 * 
 * Body: { primaryId: string, secondaryId: string }
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (request, context) => {
    try {
      const { session } = context
      const tenantId = session.user.tenantId
      
      // M5: Security Gate (Manager/Admin Only)
      const isPrivileged = ['MGR', 'ADM'].includes(session.user.role)
      if (!isPrivileged) {
        return NextResponse.json({ error: 'Access denied: Manager approval required for merging' }, { status: 403 })
      }

      const body = await request.json()
      const { primaryId, secondaryId } = body

      if (!primaryId || !secondaryId) {
        return NextResponse.json({ error: 'primaryId and secondaryId are required' }, { status: 400 })
      }

      const { withTenantContext } = await import('@/lib/tenantContext')
      const { mergeCustomers } = await import('@/lib/repositories/customerRepo')
      const auditRepo = await import('@/lib/repositories/auditRepo')
      const { triggerEvent } = await import('@/lib/pusher')

      return await withTenantContext(tenantId, async () => {
        const merged = await mergeCustomers(tenantId, primaryId, secondaryId)

        await auditRepo.create(
          tenantId,
          session.user.employeeId ?? session.user.email,
          'CUSTOMER_MERGE',
          primaryId,
          { mergedFrom: secondaryId }
        )

        // Trigger real-time cleanup for dashboards
        triggerEvent(`tenant-${tenantId}`, 'customer-merged', {
          primaryId,
          secondaryId,
          displayName: merged.displayName
        }).catch(() => null)

        return NextResponse.json({ data: merged })
      })
    } catch (error) {
      console.error('[Customers/Merge.POST]', error)
      return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)
