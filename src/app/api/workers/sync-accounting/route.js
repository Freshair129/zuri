/**
 * QStash Worker: Daily Accounting Sync
 * POST /api/workers/sync-accounting
 *
 * Runs daily at 23:00 ICT. Syncs all active FlowAccount tenants.
 * Also triggers Express exports for tenants with sync_mode = 'auto'.
 *
 * Cron: 16:00 UTC = 23:00 ICT
 */
import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getPrisma } from '@/lib/db'
import { syncDailyOrdersToFlowAccount, runExpressExport } from '@/lib/accounting/AccountingService'

const prisma = getPrisma()

export async function POST(req) {
  // NFR3: Verify QStash signature
  const { isValid } = await verifyQStashSignature(req)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    // Load all active integration configs
    const configs = await prisma.integrationConfig.findMany({
      where: { isActive: true },
    })

    if (!configs.length) {
      return NextResponse.json({ ok: true, message: 'No active integrations' })
    }

    const results = []

    for (const config of configs) {
      const { tenantId, provider } = config

      try {
        if (provider === 'flowaccount') {
          const result = await syncDailyOrdersToFlowAccount(tenantId, config)
          results.push({ tenantId, provider, ...result })
        } else if (provider === 'express' && config.syncMode === 'auto') {
          const result = await runExpressExport(tenantId, null)
          results.push({ tenantId, provider, ...result })
        }
      } catch (err) {
        console.error(`[sync-accounting] ${provider} sync failed for tenant ${tenantId}:`, err.message)
        results.push({ tenantId, provider, error: err.message })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('[sync-accounting]', error)
    throw error // NFR5: throw so QStash retries
  }
}
