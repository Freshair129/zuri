// Created At: 2026-04-12 05:50:00 +07:00 (v1.3.21)
// Previous version: 2026-04-11 20:35:44 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:50:00 +07:00 (v1.3.21)

/**
 * auditRepo — Compliance Audit Log access (M6 Feature D4 / ZDEV-TSK-20260410-026)
 * Records are immutable.
 */

import { getPrisma } from '@/lib/db'

/**
 * Append an audit log entry.
 */
export async function create(tenantId, ...rest) {
  const prisma = await getPrisma()
  if (typeof rest[0] === 'string') {
    const [actor, action, target, details] = rest
    return prisma.auditLog.create({
      data: {
        tenantId,
        actor,
        action,
        target: target ?? null,
        details: details ?? null,
        createdAt: new Date(),
      },
    })
  }

  const payload = rest[0] ?? {}
  if (!payload.actor || !payload.action) {
    throw new Error('auditRepo.create: actor and action are required')
  }

  return prisma.auditLog.create({
    data: {
      tenantId,
      actor: payload.actor,
      actorId: payload.actorId ?? null,
      actorRole: payload.actorRole ?? null,
      action: payload.action,
      target: payload.target ?? null,
      targetType: payload.targetType ?? null,
      before: payload.before ?? null,
      after: payload.after ?? null,
      details: payload.details ?? null,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      createdAt: new Date(),
    },
  })
}

export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.auditLog.findFirst({
    where: { id, tenantId },
  })
}

export async function findByActor(tenantId, actor, { limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  return prisma.auditLog.findMany({
    where: { tenantId, actor },
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
  })
}

export async function findByActorId(tenantId, actorId, { limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  return prisma.auditLog.findMany({
    where: { tenantId, actorId },
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
  })
}

export async function findByTarget(tenantId, target, { limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  return prisma.auditLog.findMany({
    where: { tenantId, target },
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
  })
}

export async function findByTenant(tenantId, opts = {}) {
  const prisma = await getPrisma()
  const {
    action, actor, actorId, target, targetType,
    since, until,
    limit = 50, skip = 0,
  } = opts

  const where = { tenantId }
  if (action) where.action = action
  if (actor) where.actor = actor
  if (actorId) where.actorId = actorId
  if (target) where.target = target
  if (targetType) where.targetType = targetType
  if (since || until) {
    where.createdAt = {}
    if (since) where.createdAt.gte = new Date(since)
    if (until) where.createdAt.lte = new Date(until)
  }

  return prisma.auditLog.findMany({
    where,
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
  })
}

export async function countByTenant(tenantId, opts = {}) {
  const prisma = await getPrisma()
  const { action, actor, actorId, target, targetType, since, until } = opts
  const where = { tenantId }
  if (action) where.action = action
  if (actor) where.actor = actor
  if (actorId) where.actorId = actorId
  if (target) where.target = target
  if (targetType) where.targetType = targetType
  if (since || until) {
    where.createdAt = {}
    if (since) where.createdAt.gte = new Date(since)
    if (until) where.createdAt.lte = new Date(until)
  }
  return prisma.auditLog.count({ where })
}
