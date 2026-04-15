/**
 * FlowAccount disconnect
 * DELETE /api/integrations/flowaccount/disconnect
 *
 * Marks the tenant's FlowAccount config as inactive, clears tokens.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getPrisma } from '@/lib/db'
import { auditAction, AUDIT_ACTIONS } from '@/lib/audit'

const prisma = getPrisma()

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Snapshot before so the audit log can prove the disconnect
    const before = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'flowaccount' } },
    })

    await prisma.integrationConfig.updateMany({
      where: { tenantId, provider: 'flowaccount' },
      data: {
        isActive: false,
        oauthAccessTokenEnc: null,
        oauthRefreshTokenEnc: null,
        oauthExpiresAt: null,
      },
    })

    if (before) {
      await auditAction({
        request,
        session,
        tenantId,
        action: AUDIT_ACTIONS.INTEGRATION_DISCONNECT,
        target: before.id,
        targetType: 'integration',
        before: { provider: 'flowaccount', isActive: before.isActive, hadToken: !!before.oauthAccessTokenEnc },
        after: { provider: 'flowaccount', isActive: false, hadToken: false },
      })
    }

    return NextResponse.json({ ok: true, message: 'FlowAccount disconnected' })
  } catch (error) {
    console.error('[FlowAccount/disconnect]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
