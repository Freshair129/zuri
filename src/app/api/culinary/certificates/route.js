import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as certificateRepo from '@/lib/repositories/certificateRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/culinary/certificates
 * Query: page, limit, customerId
 * Returns issued certificates for the tenant
 * Roles: OWNER, MANAGER, SALES, KITCHEN, FINANCE (enrollment:R)
 */
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit      = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
    const customerId = searchParams.get('customerId') ?? undefined
    const skip       = (page - 1) * limit

    const certificates = await certificateRepo.findMany(tenantId, { limit, skip, customerId })

    return NextResponse.json({ data: certificates, page, limit })
  } catch (error) {
    console.error('[certificates/GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, ['enrollment:R'])
