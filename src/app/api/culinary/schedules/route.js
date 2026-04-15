import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as scheduleRepo from '@/lib/repositories/scheduleRepo'

export const dynamic = 'force-dynamic'

// GET /api/culinary/schedules - List course schedules
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || new Date().toISOString()
    const to = searchParams.get('to')
    const productId = searchParams.get('productId')
    const status = searchParams.get('status')

    const schedules = await scheduleRepo.findSchedules(tenantId, {
      productId,
      from,
      to,
      status
    })

    return NextResponse.json({ data: schedules })
  } catch (error) {
    console.error('[Culinary_Schedules_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'R' })

// POST /api/culinary/schedules - Create a new schedule
export const POST = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, scheduledDate, startTime, endTime } = body

    if (!productId || !scheduledDate) {
      return NextResponse.json({ error: 'productId and scheduledDate are required' }, { status: 400 })
    }

    const schedule = await scheduleRepo.createSchedule(tenantId, body)

    return NextResponse.json({ data: schedule }, { status: 201 })
  } catch (error) {
    console.error('[Culinary_Schedules_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'W' })
