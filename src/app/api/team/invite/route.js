// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Team Invitation API — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import { withAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { can } from '@/lib/permissionMatrix'
import {
  createInvitation,
  listPendingInvitations,
  emailAlreadyMember,
} from '@/lib/repositories/invitationRepo'
import { logSystemEvent, AUDIT_TYPES } from '@/lib/repositories/systemAuditRepo'
import { sendInviteEmail } from '@/lib/email'

// POST /api/team/invite — create invitation token
export const POST = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'team', 'A')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const tenantId = getTenantId(request)
  const { email, role, name } = await request.json()

  if (!email || !role) {
    return Response.json({ error: 'MISSING_FIELDS', message: 'email และ role จำเป็น' }, { status: 400 })
  }
  if (role === 'OWNER') {
    return Response.json({ error: 'INVALID_ROLE', message: 'ไม่สามารถเชิญด้วย Role OWNER ได้โดยตรง' }, { status: 400 })
  }

  const alreadyMember = await emailAlreadyMember(email, tenantId)
  if (alreadyMember) {
    return Response.json({ error: 'ALREADY_MEMBER', message: 'อีเมลนี้มีบัญชีในระบบแล้ว' }, { status: 409 })
  }

  const invitation = await createInvitation({
    tenantId,
    email,
    role,
    invitedById: session.user.id,
  })

  await logSystemEvent({
    tenantId,
    type: AUDIT_TYPES.MEMBER_INVITE,
    actorId: session.user.id,
    metadata: { email, role, token: invitation.token },
  })

  const tenantSlug = request.headers.get('x-tenant-slug') ?? tenantId
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/join?token=${invitation.token}`

  await sendInviteEmail({
    to: email,
    inviteUrl,
    role,
    inviterName: session.user.name ?? session.user.email,
  })

  return Response.json({
    success: true,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    inviteUrl,
  }, { status: 201 })
})

// GET /api/team/invite — list pending invitations
export const GET = withAuth(async (request, { session }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'team', 'R')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  const tenantId = getTenantId(request)
  const invitations = await listPendingInvitations(tenantId)
  return Response.json({ invitations })
})
