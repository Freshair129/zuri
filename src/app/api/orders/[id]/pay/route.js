/**
 * POST /api/orders/[id]/pay — process payment, close order
 * Body: { method: 'CASH'|'QR'|'CARD'|'CREDIT', cashReceived? }
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { processPayment } from '@/lib/repositories/orderRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'
import { triggerEvent as triggerPusher } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

const VALID_METHODS = ['CASH', 'QR', 'CARD', 'CREDIT']

export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const { method, cashReceived } = await request.json()

      if (!method || !VALID_METHODS.includes(method)) {
        return NextResponse.json(
          { error: `method must be one of: ${VALID_METHODS.join(', ')}` },
          { status: 400 }
        )
      }

      const order = await processPayment(tenantId, id, { method, cashReceived })

      try {
        await auditRepo.create(
          tenantId,
          session.user.employeeId ?? session.user.email ?? 'unknown',
          'ORDER_PAID',
          id,
          { method, total: order.totalAmount }
        )
      } catch (auditErr) {
        console.error('[Orders/Pay.POST] audit log failed (non-fatal)', auditErr)
      }

      try {
        await triggerPusher(`tenant-${tenantId}`, 'order-paid', {
          orderId: order.orderId,
          tableId: order.tableId,
          total:   order.totalAmount,
        })
      } catch (pusherErr) {
        console.error('[Orders/Pay.POST] pusher event failed (non-fatal)', pusherErr)
      }

      return NextResponse.json({ data: order })
    } catch (error) {
      console.error('[Orders/Pay.POST]', error)
      if (error.message === 'Order not found or already paid') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'W' }
)
