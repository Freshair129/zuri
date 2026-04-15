import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as inventoryRepo from '@/lib/repositories/inventoryRepo'

export const dynamic = 'force-dynamic'

// GET /api/inventory/movements - Get movement history
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const skip = (page - 1) * limit

    const movements = await inventoryRepo.getMovements(tenantId, {
      warehouseId,
      productId,
      limit,
      skip
    })

    return NextResponse.json({ data: movements, page, limit })
  } catch (error) {
    console.error('[Inventory_Movements_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inventory', action: 'R' })

// POST /api/inventory/movements - Record a stock movement
export const POST = withAuth(async (request, { session }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      productId,
      productType,
      warehouseId,
      type,   // 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
      qty,
      unitCost,
      referenceId,
      referenceType,
      note,
    } = body

    if (!productId || !warehouseId || !type || qty == null) {
      return NextResponse.json({ error: 'productId, warehouseId, type, and qty are required' }, { status: 400 })
    }

    const performedById = session.user?.id

    const movement = await inventoryRepo.createMovement(tenantId, {
      productId,
      productType: productType || 'INGREDIENT', // default for kitchen
      warehouseId,
      type: type.toUpperCase(),
      qty,
      unitCost,
      referenceId,
      referenceType,
      performedById,
      note,
    })

    return NextResponse.json({ data: movement }, { status: 201 })
  } catch (error) {
    console.error('[Inventory_Movements_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inventory', action: 'W' })
