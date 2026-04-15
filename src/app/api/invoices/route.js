import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getOrderById } from '@/lib/repositories/orderRepo'

// POST /api/invoices - Create invoice for an order
export const POST = withAuth(async (request) => {
  try {
    const tenantId = getTenantId(request)

    const body = await request.json()
    const { orderId, dueDate, notes } = body

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // TODO: Fetch order to ensure it belongs to the tenant
    const order = await getOrderById({ tenantId, id: orderId })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // TODO: Generate invoice number (sequential per tenant)
    // TODO: Import invoiceRepo and call createInvoice({ tenantId, orderId, dueDate, notes })
    // TODO: Optionally generate PDF and store in Supabase Storage
    const invoice = {} // TODO: replace with real data

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error('[Invoices]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'orders', action: 'F' })
