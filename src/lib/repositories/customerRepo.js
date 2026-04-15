// Created At: 2026-04-12 04:20:00 +07:00 (v1.3.3)
// Previous version: 2026-04-10 12:00:00 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 04:20:00 +07:00 (v1.3.3)

/**
 * customerRepo — CRM customer data access layer (FEAT05-CRM)
 * All functions receive tenantId as first param.
 */

import { getPrisma } from '@/lib/db'
import { getOrSet, redis } from '@/lib/redis'
import { generateCustomerId } from '@/lib/idGenerator'

// ─── Phone Normalization ─────────────────────────────────────────────────────
export function normalizePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('66') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+66${digits.slice(1)}`
  if (digits.length === 9) return `+66${digits}`
  return raw
}

function displayName(c) {
  return c.name ?? c.facebookName ?? 'ลูกค้า'
}

// ─── Redis cache helpers ──────────────────────────────────────────────────────
async function bustListCache(tenantId) {
  try {
    const keys = await redis.keys(`crm:list:${tenantId}:*`)
    if (keys.length > 0) await redis.del(...keys)
  } catch (err) {
    console.error('[customerRepo] bustListCache error', err)
  }
}

async function bustDetailCache(tenantId, id) {
  try {
    await redis.del(`crm:detail:${tenantId}:${id}`)
  } catch (err) {
    console.error('[customerRepo] bustDetailCache error', err)
  }
}

function hashFilters(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 24)
}

function baseWhere(tenantId) {
  return { tenantId, deletedAt: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
export async function listCustomers(tenantId, {
  page = 1,
  limit = 20,
  search,
  stage,
  tags,
  channel,
  assigneeId,
  from,
  to,
} = {}) {
  const filters = { page, limit, search, stage, tags, channel, assigneeId, from, to }
  const cacheKey = `crm:list:${tenantId}:${hashFilters(filters)}`

  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const where = { ...baseWhere(tenantId) }

    if (search) {
      where.OR = [
        { name:         { contains: search, mode: 'insensitive' } },
        { facebookName: { contains: search, mode: 'insensitive' } },
        { phonePrimary: { contains: search } },
        { email:        { contains: search, mode: 'insensitive' } },
      ]
    }

    if (stage) {
      where.lifecycleStage = Array.isArray(stage) ? { in: stage } : stage
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags }
    }

    if (channel === 'facebook') where.facebookId = { not: null }
    if (channel === 'line')     where.lineId      = { not: null }

    if (assigneeId) where.assigneeId = assigneeId

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to)   where.createdAt.lte = new Date(to)
    }

    const offset = (page - 1) * limit

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          customerId: true,
          name: true,
          facebookName: true,
          phonePrimary: true,
          email: true,
          lifecycleStage: true,
          tags: true,
          facebookId: true,
          lineId: true,
          assigneeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ])

    return {
      customers: customers.map(c => ({ ...c, displayName: displayName(c) })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  }, 60)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getCustomerById(tenantId, id) {
  const cacheKey = `crm:detail:${tenantId}:${id}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const customer = await prisma.customer.findFirst({
      where: { id, ...baseWhere(tenantId) },
      include: {
        profile: true,
        insight: true,
        orders: {
          take: 5,
          orderBy: { date: 'desc' },
        },
        enrollments: {
          take: 5,
          orderBy: { enrolledAt: 'desc' },
          include: { product: true },
        },
        conversations: {
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: { 
            _count: { select: { messages: true } }
          }
        },
        _count: {
          select: { orders: true, enrollments: true, conversations: true },
        },
      },
    })
    if (!customer) return null
    return { ...customer, displayName: displayName(customer) }
  }, 60)
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
export async function createCustomer(tenantId, {
  name,
  phone,
  email,
  lineId,
  facebookId,
  facebookName,
  tags = [],
  notes,
  assigneeId,
  lifecycleStage = 'NEW',
}) {
  const prisma = await getPrisma()
  const customerId = await generateCustomerId(lineId ? 'LINE' : facebookId ? 'FB' : 'WEB')
  const phonePrimary = normalizePhone(phone)

  const customer = await prisma.customer.create({
    data: {
      customerId,
      tenantId,
      name:          name ?? null,
      facebookName:  facebookName ?? null,
      facebookId:    facebookId ?? null,
      lineId:        lineId ?? null,
      email:         email ?? null,
      phonePrimary,
      tags,
      assigneeId:    assigneeId ?? null,
      lifecycleStage,
      intelligence:  notes ? { notes } : undefined,
    },
  })

  await bustListCache(tenantId)
  return { ...customer, displayName: displayName(customer) }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCustomer(tenantId, id, data) {
  const prisma = await getPrisma()
  const { profile: profileData, ...rest } = data

  const customerData = {}
  if (rest.name        !== undefined) customerData.name        = rest.name
  if (rest.facebookName !== undefined) customerData.facebookName = rest.facebookName
  if (rest.email       !== undefined) customerData.email       = rest.email
  if (rest.status      !== undefined) customerData.status      = rest.status
  if (rest.assigneeId  !== undefined) customerData.assigneeId  = rest.assigneeId
  if (rest.phone || rest.phonePrimary) {
    customerData.phonePrimary = normalizePhone(rest.phone ?? rest.phonePrimary)
  }
  if (rest.lifecycleStage !== undefined) customerData.lifecycleStage = rest.lifecycleStage

  const updated = await prisma.customer.update({
    where: { id, tenantId },
    data: {
      ...customerData,
      ...(profileData && {
        profile: {
          upsert: {
            create: { ...profileData },
            update: profileData,
          },
        },
      }),
    },
    include: { profile: true },
  })

  await Promise.all([bustListCache(tenantId), bustDetailCache(tenantId, id)])
  return { ...updated, displayName: displayName(updated) }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE
// ─────────────────────────────────────────────────────────────────────────────
export async function softDeleteCustomer(tenantId, id) {
  const prisma = await getPrisma()
  const deleted = await prisma.customer.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  })
  await Promise.all([bustListCache(tenantId), bustDetailCache(tenantId, id)])
  return deleted
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE TRANSITION
// ─────────────────────────────────────────────────────────────────────────────
export async function transitionStage(tenantId, id, toStage, { changedBy, note } = {}) {
  const prisma = await getPrisma()
  const current = await prisma.customer.findFirst({
    where: { id, ...baseWhere(tenantId) },
    select: { lifecycleStage: true },
  })
  if (!current) throw new Error('Customer not found')

  const [customer] = await prisma.$transaction([
    prisma.customer.update({
      where: { id, tenantId },
      data: { lifecycleStage: toStage, updatedAt: new Date() },
    }),
    prisma.customerStageHistory.create({
      data: {
        tenantId,
        customerId: id,
        fromStage: current.lifecycleStage,
        toStage,
        changedBy: changedBy ?? null,
        note: note ?? null,
      },
    }),
    prisma.customerActivity.create({
      data: {
        tenantId,
        customerId: id,
        type: 'STAGE_CHANGE',
        payload: { from: current.lifecycleStage, to: toStage, note },
        actorId: changedBy ?? null,
      },
    }),
  ])

  await Promise.all([bustListCache(tenantId), bustDetailCache(tenantId, id)])
  return customer
}

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────
export async function addTag(tenantId, id, tag) {
  const prisma = await getPrisma()
  const customer = await prisma.customer.findFirst({
    where: { id, ...baseWhere(tenantId) },
    select: { tags: true },
  })
  if (!customer) throw new Error('Customer not found')

  const newTags = Array.from(new Set([...customer.tags, tag]))
  const updated = await prisma.customer.update({
    where: { id, tenantId },
    data: { tags: newTags },
  })

  await prisma.customerActivity.create({
    data: {
      tenantId,
      customerId: id,
      type: 'TAG_CHANGE',
      payload: { action: 'add', tag },
    },
  })

  await Promise.all([bustListCache(tenantId), bustDetailCache(tenantId, id)])
  return updated.tags
}

export async function removeTag(tenantId, id, tag) {
  const prisma = await getPrisma()
  const customer = await prisma.customer.findFirst({
    where: { id, ...baseWhere(tenantId) },
    select: { tags: true },
  })
  if (!customer) throw new Error('Customer not found')

  const newTags = customer.tags.filter(t => t !== tag)
  const updated = await prisma.customer.update({
    where: { id, tenantId },
    data: { tags: newTags },
  })

  await prisma.customerActivity.create({
    data: {
      tenantId,
      customerId: id,
      type: 'TAG_CHANGE',
      payload: { action: 'remove', tag },
    },
  })

  await Promise.all([bustListCache(tenantId), bustDetailCache(tenantId, id)])
  return updated.tags
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TIMELINE
// ─────────────────────────────────────────────────────────────────────────────
export async function getTimeline(tenantId, customerId, { type, page = 1, limit = 20 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId, customerId }
  if (type) where.type = type

  const offset = (page - 1) * limit

  const [activities, total] = await Promise.all([
    prisma.customerActivity.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customerActivity.count({ where }),
  ])

  return { activities, total, page, limit, pages: Math.ceil(total / limit) }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT BY FACEBOOK ID
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertByFacebookId(tenantId, facebookId, data) {
  const prisma = await getPrisma()
  const phone = normalizePhone(data.phonePrimary || data.phone)

  // 1. Check by Facebook ID
  let customer = await prisma.customer.findUnique({ where: { facebookId } })

  // 2. If not found by FB ID, check by Phone (Identity Binding)
  if (!customer && phone) {
    customer = await prisma.customer.findFirst({
      where: { tenantId, phonePrimary: phone, deletedAt: null }
    })
  }

  if (customer) {
    // Update existing (including binding FB ID if it was missing)
    const result = await prisma.customer.update({
      where: { id: customer.id },
      data: { ...data, facebookId, phonePrimary: phone }
    })
    
    // Log Identity Linkage
    if (!customer.facebookId) {
       await prisma.customerActivity.create({
         data: {
           tenantId,
           customerId: customer.id,
           type: 'IDENTITY_LINKED',
           payload: { platform: 'facebook', facebookId }
         }
       }).catch(() => null)
    }

    await bustListCache(tenantId)
    return result
  }

  // 3. Create New
  const result = await prisma.customer.create({
    data: {
      ...data,
      tenantId,
      facebookId,
      phonePrimary: phone,
      customerId: data.customerId ?? await generateCustomerId('FB'),
      lifecycleStage: 'NEW',
    },
  })
  await bustListCache(tenantId)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT BY LINE ID
// ─────────────────────────────────────────────────────────────────────────────
export async function upsertByLineId(tenantId, lineId, data) {
  const prisma = await getPrisma()
  const phone = normalizePhone(data.phonePrimary || data.phone)

  // 1. Check by LINE ID
  let customer = await prisma.customer.findFirst({
    where: { tenantId, lineId, deletedAt: null }
  })

  // 2. If not found by LINE ID, check by Phone (Identity Binding)
  if (!customer && phone) {
    customer = await prisma.customer.findFirst({
      where: { tenantId, phonePrimary: phone, deletedAt: null }
    })
  }

  if (customer) {
    // Update existing (including binding LINE ID if it was missing)
    const result = await prisma.customer.update({
      where: { id: customer.id },
      data: { ...data, lineId, phonePrimary: phone }
    })

    // Log Identity Linkage
    if (!customer.lineId) {
      await prisma.customerActivity.create({
        data: {
          tenantId,
          customerId: customer.id,
          type: 'IDENTITY_LINKED',
          payload: { platform: 'line', lineId }
        }
      }).catch(() => null)
    }

    await bustListCache(tenantId)
    return result
  }

  // 3. Create New
  const result = await prisma.customer.create({
    data: {
      ...data,
      tenantId,
      lineId,
      phonePrimary: phone,
      customerId: data.customerId ?? await generateCustomerId('LINE'),
      lifecycleStage: 'NEW',
    },
  })
  await bustListCache(tenantId)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE
// ─────────────────────────────────────────────────────────────────────────────
export async function mergeCustomers(tenantId, primaryId, secondaryId) {
  const prisma = await getPrisma()
  const [primary, secondary] = await Promise.all([
    prisma.customer.findFirst({ where: { id: primaryId,   ...baseWhere(tenantId) } }),
    prisma.customer.findFirst({ where: { id: secondaryId, ...baseWhere(tenantId) } }),
  ])
  if (!primary)   throw new Error('Primary customer not found')
  if (!secondary) throw new Error('Secondary customer not found')

  await prisma.$transaction([
    prisma.conversation.updateMany({ where: { customerId: secondaryId }, data: { customerId: primaryId } }),
    prisma.order.updateMany(       { where: { customerId: secondaryId }, data: { customerId: primaryId } }),
    prisma.enrollment.updateMany(  { where: { customerId: secondaryId }, data: { customerId: primaryId } }),
    prisma.customer.update({
      where: { id: primaryId },
      data: { tags: Array.from(new Set([...primary.tags, ...secondary.tags])) },
    }),
    prisma.customer.update({
      where: { id: secondaryId },
      data: { deletedAt: new Date(), mergedInto: primaryId },
    }),
    prisma.customerActivity.create({
      data: {
        tenantId,
        customerId: primaryId,
        type: 'NOTE',
        payload: { action: 'merge', mergedFrom: secondaryId },
      },
    }),
  ])

  await Promise.all([
    bustListCache(tenantId),
    bustDetailCache(tenantId, primaryId),
    bustDetailCache(tenantId, secondaryId),
  ])

  return getCustomerById(tenantId, primaryId)
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI STATS
// ─────────────────────────────────────────────────────────────────────────────
export async function getKpiStats(tenantId) {
  const cacheKey = `crm:kpi:${tenantId}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, newThisMonth, enrolled, paid] = await Promise.all([
      prisma.customer.count({ where: baseWhere(tenantId) }),
      prisma.customer.count({ where: { ...baseWhere(tenantId), createdAt: { gte: startOfMonth } } }),
      prisma.customer.count({ where: { ...baseWhere(tenantId), lifecycleStage: 'ENROLLED' } }),
      prisma.customer.count({ where: { ...baseWhere(tenantId), lifecycleStage: 'PAID' } }),
    ])

    return { total, newThisMonth, enrolled, paid }
  }, 60)
}

export async function getDailyCustomerStats(tenantId, date = new Date()) {
  const prisma = await getPrisma()
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.customer.count({
    where: {
      ...baseWhere(tenantId),
      createdAt: { gte: startOfDay, lte: endOfDay }
    }
  })
}
