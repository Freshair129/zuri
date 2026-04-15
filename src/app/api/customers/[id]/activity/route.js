import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import * as auditRepo from '@/lib/repositories/auditRepo'

// GET /api/customers/[id]/activity — Get customer audit logs
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    const { id } = await params

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const logs = await auditRepo.findByTarget(tenantId, id, { limit, skip })

    return NextResponse.json({ data: logs })
  } catch (error) {
    console.error('[Customers/Activity]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
