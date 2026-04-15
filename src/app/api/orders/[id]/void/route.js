/**
 * POST /api/orders/[id]/void — void a PENDING order
 * Requires MANAGER or above
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { voidOrder } from '@/lib/repositories/orderRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params

      await voidOrder(tenantId, id, { voidedBy: session.user.employeeId ?? null })

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'ORDER_VOID',
        id,
        {}
      )

      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('[Orders/Void.POST]', error)
      if (error.message === 'Order not found or already closed') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }  // MANAGER+ only
)
