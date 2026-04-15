// Created At: 2026-04-12 04:50:00 +07:00 (v1.3.9)
// Previous version: 2026-04-11 20:32:56 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 04:50:00 +07:00 (v1.3.9)

import { getPrisma } from '@/lib/db'
import { generateTaskId } from '@/lib/idGenerator'

export async function listTasks(tenantId, filters = {}, { limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }

  if (filters.assigneeId) where.assigneeId = filters.assigneeId
  if (filters.status) where.status = filters.status
  if (filters.type) where.type = filters.type
  if (filters.priority) where.priority = filters.priority

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      take: limit,
      skip,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.task.count({ where })
  ])

  return { data: tasks, meta: { total, limit, skip } }
}

export async function getTaskById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.task.findFirst({
    where: { id, tenantId },
  })
}

export async function createTask(tenantId, data) {
  const prisma = await getPrisma()
  const taskId = await generateTaskId()
  
  return prisma.task.create({
    data: {
      ...data,
      taskId,
      tenantId,
    }
  })
}

export async function updateTask(tenantId, id, data) {
  const prisma = await getPrisma()
  const task = await prisma.task.findFirst({
    where: { id, tenantId }
  })

  if (!task) {
    throw new Error('Task not found or access denied')
  }

  if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
    data.completedAt = new Date()
  } else if (data.status && data.status !== 'COMPLETED') {
    data.completedAt = null
  }

  return prisma.task.update({
    where: { id },
    data,
  })
}

export async function deleteTask(tenantId, id) {
  const prisma = await getPrisma()
  const task = await prisma.task.findFirst({
    where: { id, tenantId }
  })

  if (!task) {
    throw new Error('Task not found or access denied')
  }

  return prisma.task.delete({
    where: { id }
  })
}
