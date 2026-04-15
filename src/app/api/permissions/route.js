import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getTenantId } from '@/lib/tenant'
import { permissionMatrix } from '@/lib/permissionMatrix'

// GET /api/permissions - Return the full permission matrix for the tenant
export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Optionally filter by the requesting user's role to return only relevant permissions
    // TODO: Support tenant-level permission overrides stored in DB

    return NextResponse.json({ data: permissionMatrix })
  } catch (error) {
    console.error('[Permissions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
