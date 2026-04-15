import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import * as poRepo from '@/lib/repositories/poRepo'

// GET /api/procurement/suppliers - List suppliers
export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isActiveParam = searchParams.get('isActive')
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const skip = parseInt(searchParams.get('skip') ?? '0')

    const suppliers = await poRepo.findSuppliers(tenantId, { isActive, limit, skip })

    return NextResponse.json({ data: suppliers })
  } catch (error) {
    console.error('[Procurement/Suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/procurement/suppliers - Create a supplier
export async function POST(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, contactName, phone, email, address, taxId, paymentTerms, currency, notes } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const supplier = await poRepo.createSupplier(tenantId, {
      name,
      contactName,
      phone,
      email,
      address,
      taxId,
      paymentTerms,
      currency,
      notes,
    })

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error) {
    console.error('[Procurement/Suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
