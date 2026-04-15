// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Ownership Transfer repository — ADR-077 / ZUR-20
import { getPrisma } from '../db'

const OTP_TTL_MINUTES = 15

export async function createTransferRequest({ tenantId, fromEmployeeId, toEmployeeId, otpHash }) {
  const prisma = await getPrisma()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)
  return prisma.ownershipTransferRequest.create({
    data: { tenantId, fromEmployeeId, toEmployeeId, otpHash, expiresAt },
  })
}

export async function findPendingRequest(tenantId) {
  const prisma = await getPrisma()
  return prisma.ownershipTransferRequest.findFirst({
    where: {
      tenantId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function cancelPendingRequests(tenantId) {
  const prisma = await getPrisma()
  return prisma.ownershipTransferRequest.updateMany({
    where: { tenantId, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
}

// Atomic ownership swap — must run inside prisma.$transaction
export async function executeTransfer(tx, { requestId, fromEmployeeId, toEmployeeId, tenantId }) {
  await tx.employee.update({
    where: { id: fromEmployeeId },
    data: { role: 'ADM', roles: ['ADM'] },
  })
  await tx.employee.update({
    where: { id: toEmployeeId },
    data: { role: 'OWNER', roles: ['OWNER'] },
  })
  await tx.tenant.update({
    where: { id: tenantId },
    data: { ownerEmployeeId: toEmployeeId },
  })
  await tx.ownershipTransferRequest.update({
    where: { id: requestId },
    data: { status: 'CONFIRMED', confirmedAt: new Date() },
  })
}

export async function listEligibleRecipients(tenantId, excludeId) {
  const prisma = await getPrisma()
  return prisma.employee.findMany({
    where: {
      tenantId,
      role: 'ADM',
      id: { not: excludeId },
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
}
