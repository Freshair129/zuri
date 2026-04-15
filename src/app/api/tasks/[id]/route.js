import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getTaskById, updateTask, deleteTask } from '@/lib/repositories/taskRepo'

// GET /api/tasks/[id] - Get single task detail
export const GET = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const task = await getTaskById(tenantId, id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error('[Task_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'tasks', action: 'R' })

// PATCH /api/tasks/[id] - Update task fields
export const PATCH = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // Parse dates if present
    if (body.dueDate) body.dueDate = new Date(body.dueDate)
    if (body.startDate) body.startDate = new Date(body.startDate)

    const task = await updateTask(tenantId, id, body)

    return NextResponse.json({ data: task })
  } catch (error) {
    console.error('[Task_PATCH]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.message.includes('not found') ? 404 : 500 })
  }
}, { domain: 'tasks', action: 'W' })

// DELETE /api/tasks/[id] - Delete a task
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await deleteTask(tenantId, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Task_DELETE]', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: error.message.includes('not found') ? 404 : 500 })
  }
}, { domain: 'tasks', action: 'W' })
