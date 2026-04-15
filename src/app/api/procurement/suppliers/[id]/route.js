import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import * as poRepo from '@/lib/repositories/poRepo'

// GET /api/procurement/suppliers/[id] - Get supplier by ID
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supplier = await poRepo.findSupplierById(tenantId, id)
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('[Procurement/Suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/procurement/suppliers/[id] - Update supplier
export async function PATCH(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, contactName, phone, email, address, taxId, paymentTerms, currency, notes } = body

    const result = await poRepo.updateSupplier(tenantId, id, {
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

    if (result.count === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[Procurement/Suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/procurement/suppliers/[id] - Deactivate supplier (soft delete)
export async function DELETE(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const result = await poRepo.deactivateSupplier(tenantId, id)

    if (result.count === 0) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[Procurement/Suppliers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
