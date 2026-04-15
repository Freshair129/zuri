/**
 * POST /api/ai/sales-closer
 * AI Sales Closer endpoint — handles objections, produces order drafts
 * M4 Feature A3 (ZDEV-TSK-20260410-013)
 *
 * RBAC: SALES, MANAGER, DEV only (explicit role check — OWNER/STAFF should not compose replies)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { closeSale } from '@/lib/ai/salesCloser'
import { createOrder } from '@/lib/repositories/orderRepo'

const ALLOWED_ROLES = ['SALES', 'MANAGER', 'DEV', 'OWNER']

export async function POST(request) {
  try {
    // 1. Auth & RBAC
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRoles = Array.isArray(session.user.roles)
      ? session.user.roles
      : [session.user.role].filter(Boolean)

    const hasAccess = userRoles.some((r) => ALLOWED_ROLES.includes(r))
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden — Sales Closer requires SALES, MANAGER, OWNER or DEV role' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 })
    }

    // 2. Parse body
    const body = await request.json()
    const { conversationId, customerMessage } = body

    if (!conversationId || !customerMessage?.trim()) {
      return NextResponse.json({ error: 'conversationId and customerMessage are required' }, { status: 400 })
    }

    // 3. Run AI Sales Closer
    const result = await closeSale(tenantId, conversationId, customerMessage)

    // 4. Handle CREATE_ORDER action with Human Gate
    if (result.action === 'CREATE_ORDER' && result.orderDraft) {
      const draft = result.orderDraft

      const order = await createOrder(tenantId, {
        conversationId,
        orderType: 'ONLINE',
        createdBy: 'AI',
        requiresApproval: true, // Always require approval for AI orders
        items: [{
          productId: draft.productId ?? null,
          name: draft.productName,
          unitPrice: draft.unitPrice,
          qty: draft.qty ?? 1,
        }],
      })

      // Notify OWNER via Pusher if high value (M4-A3 Human Gate)
      if (order.totalAmount > (result.HIGH_VALUE_THRESHOLD || 5000)) {
        const { triggerEvent } = await import('@/lib/pusher')
        await triggerEvent(`tenant-${tenantId}`, 'ai-order-requires-approval', {
          orderId: order.id,
          orderNumber: order.orderId,
          totalAmount: order.totalAmount,
          customerName: order.customer?.name || 'Customer',
          conversationId,
          message: `AI created a high-value order (฿${order.totalAmount}) that requires your approval.`
        })
        console.log(`[api/ai/sales-closer] HIGH-VALUE ALERT: Order ${order.orderId} notified to OWNER`)
      }

      return NextResponse.json({
        reply: result.reply,
        action: result.action,
        reasoning: result.reasoning,
        objectionsMatched: result.objectionsMatched,
        order: {
          id: order.id,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          requiresApproval: order.requiresApproval,
          status: order.status,
          createdBy: order.createdBy,
        },
      })
    }

    // 5. Return non-order response
    return NextResponse.json({
      reply: result.reply,
      action: result.action,
      reasoning: result.reasoning,
      objectionsMatched: result.objectionsMatched,
    })
  } catch (err) {
    console.error('[api/ai/sales-closer] POST', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
