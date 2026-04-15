/**
 * Accounting Integration Config API
 * GET  /api/integrations/accounting  — return current config (tokens masked)
 * PUT  /api/integrations/accounting  — update non-OAuth settings
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getPrisma } from '@/lib/db'
import { auditAction, AUDIT_ACTIONS } from '@/lib/audit'

const prisma = getPrisma()

function maskConfig(config) {
  if (!config) return null
  return {
    id: config.id,
    provider: config.provider,
    isActive: config.isActive,
    isConnected: !!config.oauthAccessTokenEnc || config.provider === 'express',
    oauthExpiresAt: config.oauthExpiresAt,
    accountantEmail: config.accountantEmail,
    syncMode: config.syncMode,
    syncOptionsJson: config.syncOptionsJson,
    accountMappingJson: config.accountMappingJson,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'MGR', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.integrationConfig.findMany({
      where: { tenantId: session.user.tenantId },
    })

    return NextResponse.json({ configs: configs.map(maskConfig) })
  } catch (error) {
    console.error('[Integrations/accounting GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, accountantEmail, syncMode, syncOptionsJson, accountMappingJson, isActive } = body

    if (!provider || !['flowaccount', 'express', 'peak', 'sage'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    // Snapshot the BEFORE state for the audit log
    const beforeConfig = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    })

    const config = await prisma.integrationConfig.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      update: {
        accountantEmail: accountantEmail ?? undefined,
        syncMode: syncMode ?? undefined,
        syncOptionsJson: syncOptionsJson ?? undefined,
        accountMappingJson: accountMappingJson ?? undefined,
        isActive: isActive ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        provider,
        accountantEmail,
        syncMode: syncMode ?? 'manual',
        syncOptionsJson: syncOptionsJson ?? {},
        accountMappingJson: accountMappingJson ?? {},
        isActive: isActive ?? false,
      },
    })

    // Audit when isActive flips OR when a new config is created
    const wasActive = beforeConfig?.isActive ?? false
    const isActiveNow = config.isActive ?? false
    if (!beforeConfig || wasActive !== isActiveNow) {
      await auditAction({
        request,
        session,
        tenantId,
        action: AUDIT_ACTIONS.INTEGRATION_TOGGLE,
        target: config.id,
        targetType: 'integration',
        before: beforeConfig
          ? { provider, isActive: wasActive, syncMode: beforeConfig.syncMode }
          : null,
        after: { provider, isActive: isActiveNow, syncMode: config.syncMode },
        details: { transition: beforeConfig ? 'updated' : 'created' },
      })
    }

    return NextResponse.json({ ok: true, config: maskConfig(config) })
  } catch (error) {
    console.error('[Integrations/accounting PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
