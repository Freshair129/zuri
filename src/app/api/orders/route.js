/**
 * GET  /api/orders — list orders (with filters)
 * POST /api/orders — create new order (POS quick sale)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listOrders, createOrder, getDailySummary } from '@/lib/repositories/orderRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'
import { triggerEvent as triggerPusher } from '@/lib/pusher'
import { deductOrderIngredients } from '@/lib/kitchenOps'

export const dynamic = 'force-dynamic'

// GET /api/orders?status=&orderType=&customerId=&from=&to=&page=&limit=&summary=1
export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)

      // Daily summary shortcut
      if (searchParams.get('summary') === '1') {
        const dateParam = searchParams.get('date')
        const summary = await getDailySummary(tenantId, dateParam ? new Date(dateParam) : new Date())
        return NextResponse.json({ data: summary })
      }

      const page      = parseInt(searchParams.get('page')  ?? '1')
      const limit     = parseInt(searchParams.get('limit') ?? '20')
      const status    = searchParams.get('status')    || undefined
      const orderType = searchParams.get('orderType') || undefined
      const customerId = searchParams.get('customerId') || undefined
      const from      = searchParams.get('from')      || undefined
      const to        = searchParams.get('to')        || undefined

      const result = await listOrders(tenantId, { status, orderType, customerId, from, to, page, limit })
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Orders.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'R', maskPii: true }
)

// POST /api/orders — create order (POS checkout)
export const POST = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const body = await request.json()

      const {
        customerId, tableId, orderType, items,
        discountAmount, notes,
        vatRate, vatIncluded, serviceChargeRate,
      } = body

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'items cannot be empty' }, { status: 400 })
      }
      for (const item of items) {
        if (!item.name || item.unitPrice == null || !item.qty) {
          return NextResponse.json({ error: 'Each item requires name, unitPrice, qty' }, { status: 400 })
        }
      }

      const order = await createOrder(tenantId, {
        customerId, tableId, orderType, items,
        discountAmount: discountAmount ?? 0,
        notes,
        closedById: session.user.employeeId ?? null,
        vatRate, vatIncluded, serviceChargeRate,
      })

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'ORDER_CREATE',
        order.id,
        { orderId: order.orderId, total: order.totalAmount }
      )

      // Notify POS clients of new order
      await triggerPusher(`tenant-${tenantId}`, 'new-order', {
        orderId: order.orderId,
        tableId,
        orderType: order.orderType,
        total: order.totalAmount,
      })

      // FEAT08: Kitchen Ops — Deduct ingredients
      try {
        // We use order.items (normalized) for deduction
        await deductOrderIngredients(tenantId, order.items)
      } catch (deductErr) {
        console.error('[Orders.POST] Stock deduction failed', deductErr)
        // We don't fail the order creation if deduction fails, but we log it
      }

      return NextResponse.json({ data: order }, { status: 201 })
    } catch (error) {
      console.error('[Orders.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'W' }
)
