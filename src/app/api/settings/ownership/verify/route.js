// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Ownership Transfer — OTP verify + atomic swap — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { withAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { can } from '@/lib/permissionMatrix'
import { getPrisma } from '@/lib/db'
import { findPendingRequest, executeTransfer } from '@/lib/repositories/ownershipRepo'
import { logSystemEventTx, AUDIT_TYPES } from '@/lib/repositories/systemAuditRepo'

// POST /api/settings/ownership/verify — verify OTP + execute atomic ownership swap
export const POST = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'ownership', 'F')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const tenantId = getTenantId(request)
  const { otp } = await request.json()
  if (!otp) {
    return Response.json({ error: 'MISSING_OTP' }, { status: 400 })
  }

  const pendingRequest = await findPendingRequest(tenantId)
  if (!pendingRequest) {
    return Response.json({ error: 'NO_PENDING_REQUEST', message: 'ไม่มีคำขอโอนสิทธิ์ที่รอดำเนินการ' }, { status: 404 })
  }

  // Verify OTP
  const isValid = await bcrypt.compare(otp, pendingRequest.otpHash)
  if (!isValid) {
    return Response.json({ error: 'INVALID_OTP', message: 'OTP ไม่ถูกต้อง' }, { status: 400 })
  }

  // Check expiry (belt-and-suspenders — findPendingRequest already filters)
  if (new Date() > pendingRequest.expiresAt) {
    return Response.json({ error: 'OTP_EXPIRED', message: 'OTP หมดอายุแล้ว กรุณาเริ่มกระบวนการใหม่' }, { status: 400 })
  }

  // Atomic swap — no two OWNERs can exist simultaneously
  const prisma = await getPrisma()
  try {
    await prisma.$transaction(async (tx) => {
      await executeTransfer(tx, {
        requestId:      pendingRequest.id,
        fromEmployeeId: pendingRequest.fromEmployeeId,
        toEmployeeId:   pendingRequest.toEmployeeId,
        tenantId,
      })
      await logSystemEventTx(tx, {
        tenantId,
        type:     AUDIT_TYPES.OWNERSHIP_TRANSFER,
        actorId:  pendingRequest.fromEmployeeId,
        targetId: pendingRequest.toEmployeeId,
        metadata: { requestId: pendingRequest.id },
      })
    })
  } catch (err) {
    console.error('[OwnershipVerify] transaction failed', err)
    return Response.json({ error: 'TRANSFER_FAILED' }, { status: 500 })
  }

  // TODO: invalidate active sessions for both parties via ActiveSession table
  // For now return flag so client can force re-login
  return Response.json({
    success: true,
    message: 'โอนสิทธิ์สำเร็จ กรุณาเข้าสู่ระบบใหม่',
    requireRelogin: true,
  })
})
