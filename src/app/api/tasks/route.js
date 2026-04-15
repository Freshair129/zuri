import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { listTasks, createTask } from '@/lib/repositories/taskRepo'

// GET /api/tasks - List tasks
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const skip = (page - 1) * limit
    
    const filters = {
      status: searchParams.get('status'),
      assigneeId: searchParams.get('assigneeId'),
      type: searchParams.get('type'),
      priority: searchParams.get('priority'),
      search: searchParams.get('search'),
    }

    const result = await listTasks(tenantId, filters, { limit, skip })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Tasks_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'tasks', action: 'R' })

// POST /api/tasks - Create a new task
export const POST = withAuth(async (request, { session }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, type, priority, status, taskType, dueDate, startDate, timeStart, timeEnd, assigneeId, customerId, notionId } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const createdById = session.user?.id || null 

    const task = await createTask(tenantId, {
      title,
      description,
      type: type || 'FOLLOW_UP',
      priority: priority || 'L3',
      status: status || 'PENDING',
      taskType: taskType || 'SINGLE',
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      timeStart,
      timeEnd,
      assigneeId,
      customerId,
      createdById,
      notionId,
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    console.error('[Tasks_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'tasks', action: 'W' })
