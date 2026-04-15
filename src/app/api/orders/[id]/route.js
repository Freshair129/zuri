/**
 * GET   /api/orders/[id] — order detail with items + transactions
 * PATCH /api/orders/[id] — update items/discount (PENDING orders only)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getOrderById, updateOrderItems } from '@/lib/repositories/orderRepo'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params

      const order = await getOrderById(tenantId, id)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      return NextResponse.json({ data: order })
    } catch (error) {
      console.error('[Orders/Detail.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'R' }
)

export const PATCH = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const body = await request.json()

      const { items, discountAmount, notes, vatRate, vatIncluded, serviceChargeRate } = body

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'items cannot be empty' }, { status: 400 })
      }

      const order = await updateOrderItems(tenantId, id, {
        items, discountAmount, notes, vatRate, vatIncluded, serviceChargeRate,
      })

      return NextResponse.json({ data: order })
    } catch (error) {
      console.error('[Orders/Detail.PATCH]', error)
      if (error.message === 'Order not found or already closed') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'W' }
)
