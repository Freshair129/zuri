import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// GET /api/catalog - Return { courses, packages } for the tenant
export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Import and call catalogRepo or fetch from DB
    // const courses = await getCourses({ tenantId })
    // const packages = await getPackages({ tenantId })

    const courses = []  // TODO: replace with real data
    const packages = [] // TODO: replace with real data

    return NextResponse.json({ data: { courses, packages } })
  } catch (error) {
    console.error('[Catalog]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
