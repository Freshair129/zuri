/**
 * POST /api/ai/sales-closer/approve
 * Human Approval Gate for AI-created orders
 * M4 Feature A3 (ZDEV-TSK-20260410-013)
 *
 * RBAC: Requires Approve permission on 'orders' domain
 *       → OWNER (now A), MANAGER (F≥A), DEV (F≥A)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { can } from '@/lib/permissionMatrix'
import { approveOrder, voidOrder, listPendingApprovalOrders } from '@/lib/repositories/orderRepo'

export async function POST(request) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRoles = Array.isArray(session.user.roles)
      ? session.user.roles
      : [session.user.role].filter(Boolean)

    // 2. RBAC — must have Approve on orders (A or F)
    if (!can(userRoles, 'orders', 'A')) {
      return NextResponse.json(
        { error: 'Forbidden — requires Approve permission on orders (OWNER, MANAGER, or DEV)' },
        { status: 403 }
      )
    }

    const tenantId = session.user.tenantId
    const employeeId = session.user.id

    // 3. Parse body
    const body = await request.json()
    const { orderId, action } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId and action are required' }, { status: 400 })
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'action must be APPROVE or REJECT' }, { status: 400 })
    }

    // 4. Execute
    if (action === 'APPROVE') {
      const order = await approveOrder(tenantId, orderId, employeeId)
      return NextResponse.json({
        success: true,
        action: 'APPROVED',
        order: {
          id: order.id,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          requiresApproval: order.requiresApproval,
          approvedAt: order.approvedAt,
          status: order.status,
        },
      })
    }

    if (action === 'REJECT') {
      await voidOrder(tenantId, orderId, { voidedBy: employeeId })
      return NextResponse.json({
        success: true,
        action: 'REJECTED',
        orderId,
      })
    }
  } catch (err) {
    console.error('[api/ai/sales-closer/approve] POST', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/ai/sales-closer/approve
 * List all AI orders pending human approval
 * RBAC: same as POST — Approve on orders
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRoles = Array.isArray(session.user.roles)
      ? session.user.roles
      : [session.user.role].filter(Boolean)

    if (!can(userRoles, 'orders', 'A')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await listPendingApprovalOrders(tenantId, { page, limit })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/ai/sales-closer/approve] GET', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
