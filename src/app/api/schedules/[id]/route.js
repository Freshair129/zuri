import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

// GET /api/schedules/[id] - Get a production/service schedule
export async function GET(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // TODO: Import scheduleRepo and call getScheduleById({ tenantId, id })
    const schedule = null // TODO: replace with real data
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json({ data: schedule })
  } catch (error) {
    console.error('[Schedules/Detail]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/schedules/[id] - Mark schedule as complete (triggers stock deduction)
export async function POST(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { completedAt, actualQty, notes } = body

    // TODO: Import scheduleRepo and call getScheduleById({ tenantId, id })
    const schedule = null // TODO: replace with real data
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // TODO: Load recipe for this schedule to determine ingredient consumption
    // TODO: Deduct stock for each ingredient via inventoryRepo.deductStock(...)
    //   - Create stock movements (type: 'production_consumption') for each ingredient
    //   - Add finished goods to stock if applicable
    // TODO: Mark schedule as completed via scheduleRepo.completeSchedule(...)

    return NextResponse.json({ success: true, scheduleId: id })
  } catch (error) {
    console.error('[Schedules/Complete]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
