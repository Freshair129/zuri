import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getCustomerById } from '@/lib/repositories/customerRepo'
import { getOrdersByCustomer } from '@/lib/repositories/orderRepo'

// GET /api/customers/[id]/profile - Get inferred customer profile (behaviour + order history)
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // TODO: Fetch base customer record
    const customer = await getCustomerById({ tenantId, id })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // TODO: Fetch orders to compute LTV, frequency, last purchase date
    const orders = await getOrdersByCustomer({ tenantId, customerId: id })

    // TODO: Infer profile segments (e.g. vip, at-risk, new) from order history
    // TODO: Optionally call Gemini to generate natural-language profile summary
    const profile = {
      customerId: id,
      orderCount: orders.length,
      // TODO: ltv, averageOrderValue, lastOrderDate, segment, aiSummary
    }

    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error('[Customers/Profile]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
