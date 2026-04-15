// Created At: 2026-04-12 04:30:00 +07:00 (v1.3.5)
// Previous version: 2026-04-12 04:30:00 +07:00 (v1.3.5)
// Last Updated: 2026-04-12 08:10:00 +07:00 (v1.4.0)

import { getPrisma } from '@/lib/db'

export async function findMany(tenantId, { limit = 50, skip = 0, productId } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }
  if (productId) where.productId = productId

  return prisma.enrollment.findMany({
    where,
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      product: {
        select: { id: true, name: true, basePrice: true, hours: true },
      },
    },
  })
}

export async function findByCustomerId(customerId) {
  const prisma = await getPrisma()
  return prisma.enrollment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, basePrice: true } },
    },
  })
}

export async function findByProductId(tenantId, productId) {
  const prisma = await getPrisma()
  return prisma.enrollment.findMany({
    where: { tenantId, productId },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
    },
  })
}

export async function create(data) {
  const prisma = await getPrisma()
  return prisma.enrollment.create({
    data,
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      product: { select: { id: true, name: true, basePrice: true } },
    },
  })
}

export async function updateStatus(tenantId, enrollmentId, status) {
  const prisma = await getPrisma()
  return prisma.enrollment.update({
    where: { id: enrollmentId, tenantId },
    data: {
      status,
      ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  })
}
