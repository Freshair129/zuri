// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Invitation Token repository — ADR-077 / ZUR-20
import { getPrisma } from '../db'
import { randomUUID } from 'crypto'

const TOKEN_TTL_DAYS = 7

export async function createInvitation({ tenantId, email, role, invitedById }) {
  const prisma = await getPrisma()
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  return prisma.invitationToken.create({
    data: { tenantId, token, email, role, invitedById, expiresAt },
  })
}

export async function findValidToken(token) {
  const prisma = await getPrisma()
  return prisma.invitationToken.findFirst({
    where: {
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })
}

export async function markTokenUsed(id) {
  const prisma = await getPrisma()
  return prisma.invitationToken.update({
    where: { id },
    data: { usedAt: new Date() },
  })
}

export async function cancelToken(token, tenantId) {
  const prisma = await getPrisma()
  return prisma.invitationToken.deleteMany({
    where: { token, tenantId, usedAt: null },
  })
}

export async function listPendingInvitations(tenantId) {
  const prisma = await getPrisma()
  return prisma.invitationToken.findMany({
    where: {
      tenantId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  })
}

export async function emailAlreadyMember(email, tenantId) {
  const prisma = await getPrisma()
  const existing = await prisma.employee.findFirst({
    where: { email, tenantId },
    select: { id: true },
  })
  return !!existing
}
