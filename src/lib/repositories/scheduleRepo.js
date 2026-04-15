// Created At: 2026-04-12 04:55:00 +07:00 (v1.3.10)
// Previous version: 2026-04-11 20:33:07 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 04:55:00 +07:00 (v1.3.10)

import { getPrisma } from '@/lib/db'
import { generateScheduleId } from '@/lib/idGenerator'

/**
 * List schedules for a tenant with optional filtering
 */
export async function findSchedules(tenantId, { productId, from, to, status } = {}) {
  const prisma = await getPrisma()
  const where = {
    product: { tenantId }
  }
  
  if (productId) where.productId = productId
  if (status) where.status = status
  if (from || to) {
    where.scheduledDate = {}
    if (from) where.scheduledDate.gte = new Date(from)
    if (to) where.scheduledDate.lte = new Date(to)
  }

  return prisma.courseSchedule.findMany({
    where,
    include: {
      product: { select: { name: true, category: true } }
    },
    orderBy: { scheduledDate: 'asc' }
  })
}

/**
 * Get schedule by ID
 */
export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.courseSchedule.findFirst({
    where: { 
      id,
      product: { tenantId }
    },
    include: {
      product: true
    }
  })
}

/**
 * Create a new class schedule
 */
export async function createSchedule(tenantId, data) {
  const prisma = await getPrisma()
  const scheduleId = await generateScheduleId()
  
  // Verify product belongs to tenant
  const product = await prisma.product.findFirst({
    where: { id: data.productId, tenantId }
  })
  if (!product) throw new Error('Product not found or access denied')

  return prisma.courseSchedule.create({
    data: {
      ...data,
      scheduleId,
      scheduledDate: new Date(data.scheduledDate)
    }
  })
}

/**
 * Update schedule status (e.g. CLOSED, CANCELLED)
 */
export async function updateSchedule(tenantId, id, data) {
  const prisma = await getPrisma()
  const schedule = await findById(tenantId, id)
  if (!schedule) throw new Error('Schedule not found or access denied')

  return prisma.courseSchedule.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  })
}
