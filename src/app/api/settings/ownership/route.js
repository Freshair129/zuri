// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Ownership Transfer API — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { withAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { can } from '@/lib/permissionMatrix'
import { getPrisma } from '@/lib/db'
import {
  createTransferRequest,
  findPendingRequest,
  cancelPendingRequests,
  executeTransfer,
  listEligibleRecipients,
} from '@/lib/repositories/ownershipRepo'
import { logSystemEventTx, AUDIT_TYPES } from '@/lib/repositories/systemAuditRepo'
import { sendOwnershipOtpEmail } from '@/lib/email'

// GET /api/settings/ownership — current status + eligible ADM list
export const GET = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'ownership', 'R')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const tenantId = getTenantId(request)
  const [pendingRequest, eligibleRecipients] = await Promise.all([
    findPendingRequest(tenantId),
    listEligibleRecipients(tenantId, session.user.id),
  ])

  return Response.json({ pendingRequest, eligibleRecipients })
})

// POST /api/settings/ownership — initiate transfer (create OTP)
export const POST = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'ownership', 'F')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const tenantId = getTenantId(request)
  const { toEmployeeId } = await request.json()
  if (!toEmployeeId) {
    return Response.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  const prisma = await getPrisma()
  const recipient = await prisma.employee.findFirst({
    where: { id: toEmployeeId, tenantId, role: 'ADM', isActive: true },
    select: { id: true, firstName: true, email: true },
  })
  if (!recipient) {
    return Response.json({ error: 'RECIPIENT_NOT_ADMIN', message: 'ผู้รับต้องมี Role ADM ในระบบ' }, { status: 400 })
  }

  // Cancel any stale pending requests
  await cancelPendingRequests(tenantId)

  // Generate 6-digit OTP and hash
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const otpHash = await bcrypt.hash(otp, 12)

  await createTransferRequest({
    tenantId,
    fromEmployeeId: session.user.id,
    toEmployeeId,
    otpHash,
  })

  await sendOwnershipOtpEmail({
    to: session.user.email,
    otp,
    toEmployeeName: recipient.firstName,
  })

  return Response.json({
    success: true,
    message: 'OTP ส่งไปยังอีเมลของคุณแล้ว',
    toEmployee: { firstName: recipient.firstName },
  })
})

// DELETE /api/settings/ownership — cancel pending request
export const DELETE = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'ownership', 'F')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  const tenantId = getTenantId(request)
  await cancelPendingRequests(tenantId)
  return Response.json({ success: true })
})
