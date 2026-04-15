import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as inventoryRepo from '@/lib/repositories/inventoryRepo'

export const dynamic = 'force-dynamic'

// GET /api/inventory/stock - Get current stock levels
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')
    const productId = searchParams.get('productId')
    const productType = searchParams.get('productType')
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true'

    const stock = await inventoryRepo.getStockLevels(tenantId, { 
      warehouseId, 
      productId, 
      productType,
      lowStockOnly 
    })

    return NextResponse.json({ data: stock })
  } catch (error) {
    console.error('[Inventory_Stock_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inventory', action: 'R' })
