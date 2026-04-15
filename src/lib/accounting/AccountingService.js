/**
 * AccountingService — Orchestrator for accounting platform integrations.
 * Ref: FEAT17-ACCOUNTING-PLATFORM.md § 6.1 (Adapter Pattern)
 * Sanitized for Edge Runtime compatibility.
 */
import { getPrisma } from '@/lib/db'
import * as FlowAccount from './FlowAccountAdapter'
import { generateXImportFile, sendToAccountant } from './ExpressAdapter'

// ─────────────────────────────────────────────────────────────────────────────
// Config loader
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveConfig(tenantId) {
  const prisma = await getPrisma()
  return prisma.integrationConfig.findFirst({
    where: { tenantId, isActive: true },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Log helper
// ─────────────────────────────────────────────────────────────────────────────

async function logSyncRun(tenantId, provider, syncType, triggeredBy, result) {
  const prisma = await getPrisma()
  const { total = 0, success = 0, failed = 0, errorDetails } = result
  await prisma.integrationSyncLog.create({
    data: {
      tenantId,
      provider,
      syncType,
      triggeredBy,
      total,
      success,
      failed,
      errorDetailsJson: errorDetails ?? null,
      startedAt: result.startedAt ?? new Date(),
      finishedAt: new Date(),
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Document ref helpers (idempotency)
// ─────────────────────────────────────────────────────────────────────────────

async function getDocRef(tenantId, provider, entityType, entityId) {
  const prisma = await getPrisma()
  return prisma.integrationDocumentRef.findFirst({
    where: { tenantId, provider, zuriEntityType: entityType, zuriEntityId: entityId },
  })
}

async function upsertDocRef(tenantId, provider, entityType, entityId, externalId, status) {
  const prisma = await getPrisma()
  await prisma.integrationDocumentRef.upsert({
    where: {
      tenantId_provider_zuriEntityType_zuriEntityId: {
        tenantId,
        provider,
        zuriEntityType: entityType,
        zuriEntityId: entityId,
      },
    },
    update: { status, externalDocumentId: externalId, syncedAt: new Date() },
    create: {
      tenantId,
      provider,
      zuriEntityType: entityType,
      zuriEntityId: entityId,
      externalDocumentId: externalId,
      status,
      syncedAt: new Date(),
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// FlowAccount sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync a single paid order to FlowAccount.
 */
export async function syncOrderToFlowAccount(tenantId, orderId) {
  const prisma = await getPrisma()
  const config = await getActiveConfig(tenantId)
  if (!config || config.provider !== 'flowaccount') return { skipped: true }

  // Check idempotency
  const existing = await getDocRef(tenantId, 'flowaccount', 'order', orderId)
  if (existing?.status === 'synced') return { skipped: true, reason: 'already_synced' }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phonePrimary: true } },
      items: true,
    },
  })

  if (!order || order.status !== 'PAID') return { skipped: true, reason: 'not_paid' }

  const result = await FlowAccount.syncInvoice(order, config)

  await upsertDocRef(
    tenantId, 'flowaccount', 'order', orderId,
    result.flowAccountId ?? null,
    result.skipped ? 'skipped' : 'synced'
  )

  return result
}

/**
 * Sync all paid orders from yesterday to FlowAccount.
 * Called by the daily sync worker.
 */
export async function syncDailyOrdersToFlowAccount(tenantId, config) {
  const prisma = await getPrisma()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const end = new Date(yesterday)
  end.setHours(23, 59, 59, 999)

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'PAID',
      date: { gte: yesterday, lte: end },
    },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  })

  let success = 0
  let failed = 0
  const errors = []

  for (const order of orders) {
    try {
      const existing = await getDocRef(tenantId, 'flowaccount', 'order', order.id)
      if (existing?.status === 'synced') { success++; continue }

      const result = await FlowAccount.syncInvoice(order, config)
      await upsertDocRef(
        tenantId, 'flowaccount', 'order', order.id,
        result.flowAccountId ?? null,
        result.skipped ? 'skipped' : 'synced'
      )
      success++
    } catch (err) {
      failed++
      errors.push({ orderId: order.orderId, error: err.message })
      console.error('[AccountingService] FlowAccount order sync failed', order.orderId, err.message)
    }
  }

  return { total: orders.length, success, failed, errorDetails: errors.length ? errors : null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Express export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate Express X-import Excel for a tenant + date,
 * then email to accountant if config.syncMode = 'auto'.
 */
export async function runExpressExport(tenantId, date) {
  const config = await getActiveConfig(tenantId)
  if (!config || config.provider !== 'express') {
    return { skipped: true, reason: 'no_express_config' }
  }

  const targetDate = date ? new Date(date) : (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  })()

  const startedAt = new Date()
  const dateLabel = targetDate.toISOString().split('T')[0]

  try {
    const { buffer, ordersCount, expensesCount } = await generateXImportFile(
      tenantId, targetDate, config
    )

    let emailResult = { sent: false }
    if (config.syncMode === 'auto') {
      emailResult = await sendToAccountant(buffer, config, dateLabel)
    }

    await logSyncRun(tenantId, 'express', 'invoice', 'cron', {
      total: ordersCount + expensesCount,
      success: ordersCount + expensesCount,
      failed: 0,
      startedAt,
    })

    return {
      ok: true,
      dateLabel,
      ordersCount,
      expensesCount,
      emailSent: emailResult.sent,
      buffer: buffer.toString('base64'), // For download endpoint
    }
  } catch (err) {
    console.error('[AccountingService] Express export failed', tenantId, err.message)
    await logSyncRun(tenantId, 'express', 'invoice', 'cron', {
      total: 0,
      success: 0,
      failed: 1,
      errorDetails: [{ error: err.message }],
      startedAt,
    })
    throw err
  }
}
