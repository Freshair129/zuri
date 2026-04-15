import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import * as poRepo from '@/lib/repositories/poRepo'
import * as inventoryRepo from '@/lib/repositories/inventoryRepo'

// POST /api/procurement/po/[id]/grn - Record goods received note (GRN) for a PO
// This triggers stock-in movements for each received item.
export async function POST(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { receivedItems, warehouseId, receivedAt, note } = body
    // receivedItems: [{ productId, qtyReceived, unitCost }]

    if (!receivedItems?.length || !warehouseId) {
      return NextResponse.json({ error: 'receivedItems and warehouseId are required' }, { status: 400 })
    }

    const po = await poRepo.findById(tenantId, id)
    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const { receivedById } = body

    const grn = await poRepo.recordGRN(tenantId, id, {
      warehouseId,
      receivedById,
      items: receivedItems,
      note,
    })

    // Create stock-in movements for each received item
    for (const item of receivedItems) {
      await inventoryRepo.createMovement(tenantId, {
        warehouseId,
        productId: item.productId,
        productType: item.productType ?? 'PRODUCT',
        type: 'RECEIVE',
        qty: item.qtyReceived,
        unitCost: item.unitCost,
        referenceId: id,
        referenceType: 'po',
      })
    }

    return NextResponse.json({ success: true, poId: id, data: grn })
  } catch (error) {
    console.error('[Procurement/PO/GRN]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
