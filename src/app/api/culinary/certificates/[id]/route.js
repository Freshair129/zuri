import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as certificateRepo from '@/lib/repositories/certificateRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/culinary/certificates/[id]
 * Accepts UUID or certificateId (e.g. CERT-20260406-001)
 * Roles: OWNER, MANAGER, SALES, KITCHEN, FINANCE (enrollment:R)
 */
export const GET = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cert = await certificateRepo.findById(tenantId, params.id)
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({ data: cert })
  } catch (error) {
    console.error('[certificates/[id]/GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, ['enrollment:R'])
