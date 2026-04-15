/**
 * GET  /api/pos/zones — list zones for a tenant
 * POST /api/pos/zones — create new zone
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as tableRepo from '@/lib/repositories/tableRepo'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const result = await tableRepo.listZones(tenantId)
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Zones.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'R' }
)

export const POST = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const body = await request.json()
      const { id, action, ...data } = body

      if (action === 'delete') {
        const result = await tableRepo.deleteZone(tenantId, id)
        return NextResponse.json({ data: result })
      }

      if (id) {
        const result = await tableRepo.updateZone(tenantId, id, data)
        return NextResponse.json({ data: result })
      }

      const result = await tableRepo.createZone(tenantId, data)
      return NextResponse.json({ data: result }, { status: 201 })
    } catch (error) {
      console.error('[Zones.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'W' }
)
