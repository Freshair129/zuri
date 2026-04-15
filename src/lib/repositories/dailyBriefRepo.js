// Created At: 2026-04-12 05:20:00 +07:00 (v1.3.15)
// Previous version: 2026-04-11 20:34:25 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:20:00 +07:00 (v1.3.15)

import { getPrisma } from '@/lib/db'

export async function findByDate(briefDate) {
  const prisma = await getPrisma()
  return prisma.dailyBrief.findUnique({ where: { briefDate } })
}

export async function getDailyBriefByDate({ tenantId, date }) {
  const prisma = await getPrisma()
  const briefDate = new Date(date)
  briefDate.setHours(0, 0, 0, 0)
  
  return prisma.dailyBrief.findUnique({
    where: { briefDate }
  })
}

export async function findMany({ limit = 30 } = {}) {
  const prisma = await getPrisma()
  return prisma.dailyBrief.findMany({
    take: limit,
    orderBy: { briefDate: 'desc' },
  })
}

export async function getDailyBriefs({ tenantId, page = 1, limit = 10 } = {}) {
  return findMany({ limit })
}

export async function upsert(briefDate, data) {
  const prisma = await getPrisma()
  return prisma.dailyBrief.upsert({
    where: { briefDate },
    create: { ...data, briefDate },
    update: data,
  })
}
