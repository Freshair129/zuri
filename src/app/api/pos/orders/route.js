/**
 * POST /api/pos/orders — Create a POS order and occupy the table atomically
 * GET  /api/pos/orders — List orders for the tenant
 *
 * ZRI-IMP-0104 v2 (ref: FEAT--pos-onsite, SAFETY--tenant-isolation, ADR-056)
 * Created: 2026-04-15
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as orderRepo from '@/lib/repositories/orderRepo'
import * as tableRepo from '@/lib/repositories/tableRepo'
import { getPrisma } from '@/lib/db'
import { triggerEvent } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/pos/orders?status=&orderType=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)

      const status    = searchParams.get('status')    || undefined
      const orderType = searchParams.get('orderType') || undefined
      const page      = parseInt(searchParams.get('page')  || '1', 10)
      const limit     = parseInt(searchParams.get('limit') || '20', 10)

      const result = await orderRepo.listOrders(tenantId, { status, orderType, page, limit })
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[PosOrders.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'R' }
)

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pos/orders — Create order + occupy table (atomic)
//
// Body:
//   tableId?       — UUID of the table (required for ONSITE)
//   items          — [{ productId, name, qty, unitPrice, discount?, note? }]
//   guestCount?    — number of guests (default 1)
//   extraSeats?    — extra chairs added (default 0)
//   customerId?    — link to customer profile
//   notes?         — order-level notes
//   discountAmount? — order-level discount
//   vatRate?        — default 7
//   vatIncluded?    — default true
//   serviceChargeRate? — default 0
// ─────────────────────────────────────────────────────────────────────────────
export const POST = withAuth(
  async (request, { session }) => {
    const tenantId = session.user.tenantId

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const {
      tableId,
      items,
      guestCount = 1,
      extraSeats = 0,
      customerId,
      notes,
      discountAmount = 0,
      vatRate = 7,
      vatIncluded = true,
      serviceChargeRate = 0,
    } = body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.name || item.qty == null || item.unitPrice == null) {
        return NextResponse.json(
          { error: 'Each item must have name, qty, and unitPrice' },
          { status: 400 }
        )
      }
      if (item.qty <= 0 || item.unitPrice < 0) {
        return NextResponse.json(
          { error: 'item qty must be > 0 and unitPrice must be >= 0' },
          { status: 400 }
        )
      }
    }

    // ── Table availability check (if ONSITE) ────────────────────────────────
    if (tableId) {
      const table = await tableRepo.getTableById(tenantId, tableId)

      if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 })
      }

      // If the table is part of a merge group and the caller is trying to order
      // directly for a secondary table, redirect them to the main table's order
      if (table.mergeGroupId) {
        const prisma = await getPrisma()
        const mainTableOrder = await prisma.order.findFirst({
          where: {
            tenantId,
            mergeGroupId: table.mergeGroupId,
            status: 'PENDING',
            isMerged: true,
          },
          include: { table: { select: { id: true, name: true } } },
        })

        return NextResponse.json(
          {
            error: 'TABLE_IN_MERGE_GROUP',
            message: `This table is currently part of a merged group. Please order via the main table.`,
            mainTable: mainTableOrder?.table ?? null,
          },
          { status: 409 }
        )
      }

      if (table.status === 'OCCUPIED') {
        return NextResponse.json(
          { error: 'Table is already occupied. Use the existing order to add items.' },
          { status: 409 }
        )
      }

      if (!['AVAILABLE', 'RESERVED'].includes(table.status)) {
        return NextResponse.json(
          { error: `Table status is "${table.status}" and cannot accept a new order.` },
          { status: 409 }
        )
      }
    }

    // ── Atomic: Create order + occupy table ─────────────────────────────────
    try {
      const prisma = await getPrisma()

      const order = await prisma.$transaction(async (tx) => {
        // 1. Set table to OCCUPIED first to prevent race conditions
        if (tableId) {
          await tx.posTable.updateMany({
            where: { id: tableId, tenantId, status: { in: ['AVAILABLE', 'RESERVED'] } },
            data: { status: 'OCCUPIED' },
          })
        }

        // 2. Create the order (always ONSITE when tableId provided)
        const orderId = await (await import('@/lib/idGenerator')).generateOrderId()
        const { calculateTotals } = orderRepo

        const totals = calculateTotals(items, {
          discountAmount,
          vatRate,
          vatIncluded,
          serviceChargeRate,
        })

        const orderItems = items.map((item) => ({
          tenantId,
          productId:  item.productId ?? null,
          name:       item.name,
          qty:        item.qty,
          unitPrice:  item.unitPrice,
          discount:   item.discount ?? 0,
          totalPrice: Math.round(((item.unitPrice * item.qty) - (item.discount ?? 0)) * 100) / 100,
          note:       item.note ?? null,
        }))

        return tx.order.create({
          data: {
            orderId,
            tenantId,
            tableId:    tableId ?? null,
            customerId: customerId ?? null,
            orderType:  tableId ? 'ONSITE' : 'TAKEAWAY',
            guestCount: Math.max(1, guestCount),
            extraSeats: Math.max(0, extraSeats),
            notes,
            ...totals,
            items: { create: orderItems },
          },
          include: { items: true, table: { select: { id: true, name: true, status: true } } },
        })
      })

      // ── Pusher: notify floor plan clients of occupancy change ──────────────
      if (tableId) {
        triggerEvent(`private-tenant-${tenantId}`, 'pos.table.occupied', {
          tableId,
          orderId: order.id,
          guestCount: order.guestCount,
        }).catch((err) => console.error('[PosOrders.POST] Pusher pos.table.occupied failed', err))
      }

      return NextResponse.json({ data: order }, { status: 201 })
    } catch (error) {
      console.error('[PosOrders.POST]', error)

      if (error.message?.startsWith('[STRICT_INVENTORY]')) {
        return NextResponse.json({ error: error.message }, { status: 422 })
      }

      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'C' }
)
