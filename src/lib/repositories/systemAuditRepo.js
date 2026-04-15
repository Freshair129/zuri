// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: System Audit Log repository — ADR-077 / ZUR-20
import { getPrisma } from '../db'

// Valid event types for SystemAuditLog
export const AUDIT_TYPES = {
  OWNERSHIP_TRANSFER: 'OWNERSHIP_TRANSFER',
  ROLE_CHANGE:        'ROLE_CHANGE',
  MEMBER_INVITE:      'MEMBER_INVITE',
  MEMBER_JOIN:        'MEMBER_JOIN',
}

export async function logSystemEvent({ tenantId, type, actorId, targetId = null, metadata = {} }) {
  const prisma = await getPrisma()
  return prisma.systemAuditLog.create({
    data: { tenantId, type, actorId, targetId, metadata },
  })
}

// For use inside prisma.$transaction — accepts tx client
export function logSystemEventTx(tx, { tenantId, type, actorId, targetId = null, metadata = {} }) {
  return tx.systemAuditLog.create({
    data: { tenantId, type, actorId, targetId, metadata },
  })
}

export async function getSystemAuditLogs(tenantId, { type, limit = 50 } = {}) {
  const prisma = await getPrisma()
  return prisma.systemAuditLog.findMany({
    where: {
      tenantId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
