// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Public join via invitation token — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/db'
import { findValidToken, markTokenUsed } from '@/lib/repositories/invitationRepo'
import { logSystemEventTx, AUDIT_TYPES } from '@/lib/repositories/systemAuditRepo'

// POST /api/team/join — public, token-based employee creation
export async function POST(request) {
  const { token, firstName, lastName, password } = await request.json()

  if (!token || !firstName || !lastName || !password) {
    return Response.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'PASSWORD_TOO_SHORT', message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
  }

  const invitation = await findValidToken(token)
  if (!invitation) {
    return Response.json({ error: 'TOKEN_INVALID_OR_EXPIRED' }, { status: 404 })
  }

  const prisma = await getPrisma()
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const employee = await prisma.$transaction(async (tx) => {
      // Double-check token inside transaction
      const invite = await tx.invitationToken.findFirst({
        where: { token, usedAt: null, expiresAt: { gt: new Date() } },
      })
      if (!invite) throw new Error('TOKEN_INVALID')

      // Check email not already a member
      const existing = await tx.employee.findFirst({
        where: { email: invite.email, tenantId: invite.tenantId },
      })
      if (existing) throw new Error('ALREADY_MEMBER')

      const newEmployee = await tx.employee.create({
        data: {
          tenantId:     invite.tenantId,
          email:        invite.email,
          firstName,
          lastName,
          role:         invite.role,
          roles:        [invite.role],
          passwordHash,
          isActive:     true,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      })

      await tx.invitationToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      })

      await logSystemEventTx(tx, {
        tenantId:  invite.tenantId,
        type:      AUDIT_TYPES.MEMBER_JOIN,
        actorId:   newEmployee.id,
        targetId:  invite.invitedById,
        metadata:  { role: invite.role, inviteToken: token },
      })

      return newEmployee
    })

    return Response.json({ success: true, employee }, { status: 201 })
  } catch (err) {
    if (err.message === 'TOKEN_INVALID') {
      return Response.json({ error: 'TOKEN_INVALID_OR_EXPIRED' }, { status: 404 })
    }
    if (err.message === 'ALREADY_MEMBER') {
      return Response.json({ error: 'ALREADY_MEMBER' }, { status: 409 })
    }
    console.error('[JoinAPI]', err)
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
