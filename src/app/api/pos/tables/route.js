/**
 * GET  /api/pos/tables — list tables for a tenant (filtered by floor/zone)
 * POST /api/pos/tables — create new table or perform table operations (merge, unmerge, create-extra)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as tableRepo from '@/lib/repositories/tableRepo'

export const dynamic = 'force-dynamic'

// GET /api/pos/tables?floor=&zoneId=&includeExtra=
export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)

      const floor  = searchParams.get('floor')  || undefined
      const zoneId = searchParams.get('zoneId') || undefined
      const includeExtra = searchParams.get('includeExtra') === 'true'
      const monitor = searchParams.get('monitor') === 'true'

      const result = monitor 
        ? await tableRepo.listTablesWithOrders(tenantId, { floor, zoneId })
        : await tableRepo.listTables(tenantId, { floor, zoneId, includeExtra })
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Tables.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'R' }
)

// POST /api/pos/tables — create table or perform table operations
export const POST = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const body = await request.json()

      const { 
        action, 
        name, capacity, shape, floor, zoneId, positionX, positionY, 
        mainTableId, secondaryTableIds, parentTableId 
      } = body

      // Default action: create new table
      if (!action || action === 'create') {
        if (!name) {
          return NextResponse.json({ error: 'Table name is required' }, { status: 400 })
        }

        const table = await tableRepo.createTable(tenantId, {
          name,
          capacity: capacity ?? 4,
          shape: shape ?? 'rect',
          floor: floor ?? 1,
          zoneId: zoneId ?? null,
          positionX: positionX ?? 0,
          positionY: positionY ?? 0,
        })

        return NextResponse.json({ data: table }, { status: 201 })
      }

      // Update/Delete actions for management
      if (action === 'delete') {
        const result = await tableRepo.deleteTable(tenantId, body.id)
        return NextResponse.json({ data: result })
      }

      const { id, ...updateData } = body
      if (id && (!action || action === 'update')) {
        const result = await tableRepo.updateTable(tenantId, id, updateData)
        return NextResponse.json({ data: result })
      }

      // Merge tables (รวมโต๊ะ)
      if (action === 'merge') {
        if (!mainTableId || !secondaryTableIds || secondaryTableIds.length === 0) {
          return NextResponse.json({ error: 'mainTableId and secondaryTableIds are required' }, { status: 400 })
        }

        const result = await tableRepo.mergeTables(tenantId, mainTableId, secondaryTableIds)
        return NextResponse.json({ data: result }, { status: 200 })
      }

      // Unmerge tables
      if (action === 'unmerge') {
        if (!secondaryTableIds || secondaryTableIds.length === 0) {
          return NextResponse.json({ error: 'tableIds are required' }, { status: 400 })
        }

        const result = await tableRepo.unmergeTables(tenantId, secondaryTableIds)
        return NextResponse.json({ data: result }, { status: 200 })
      }

      // Create extra/temporary table (เสริมโต๊ะ)
      if (action === 'create-extra') {
        if (!parentTableId || !name) {
          return NextResponse.json({ error: 'parentTableId and name are required' }, { status: 400 })
        }

        const extraTable = await tableRepo.createExtraTable(tenantId, parentTableId, {
          name,
          capacity: capacity ?? 2,
          shape: shape ?? 'rect',
          floor: floor ?? 1,
          zoneId: zoneId ?? null,
          positionX: positionX ?? 0,
          positionY: positionY ?? 0,
        })

        return NextResponse.json({ data: extraTable }, { status: 201 })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
      console.error('[Tables.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'pos', action: 'W' }
)
