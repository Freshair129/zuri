import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import * as poRepo from '@/lib/repositories/poRepo'

// POST /api/procurement/po/[id]/approve - Approve or reject a purchase order
export async function POST(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, note } = body // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const { approverId } = body
    const poAction = action === 'approve' ? 'APPROVE' : 'REJECT'

    const updated = await poRepo.approve(tenantId, id, approverId, poAction, note)
    if (!updated) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, poId: id, action, data: updated })
  } catch (error) {
    console.error('[Procurement/PO/Approve]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
