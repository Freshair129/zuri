// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Token validate + cancel — ADR-077 / ZUR-20
export const dynamic = 'force-dynamic'

import { withAuth } from '@/lib/auth'
import { getTenantId } from '@/lib/tenant'
import { can } from '@/lib/permissionMatrix'
import { findValidToken, cancelToken } from '@/lib/repositories/invitationRepo'

// GET /api/team/invite/[token]/validate — public, check token before join
export async function GET(request, { params }) {
  const { token } = await params
  if (!token) return Response.json({ valid: false, error: 'NO_TOKEN' }, { status: 400 })

  const invitation = await findValidToken(token)
  if (!invitation) {
    return Response.json({ valid: false, error: 'TOKEN_INVALID_OR_EXPIRED' }, { status: 404 })
  }

  return Response.json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    tenantId: invitation.tenantId,
    expiresAt: invitation.expiresAt,
  })
}

// DELETE /api/team/invite/[token] — cancel invitation (OWNER/ADM only)
export const DELETE = withAuth(async (request, { session, params }) => {
  const roles = session.user.roles ?? [session.user.role]
  if (!can(roles, 'team', 'A')) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 })
  }
  const tenantId = getTenantId(request)
  const { token } = await params
  await cancelToken(token, tenantId)
  return Response.json({ success: true })
})
