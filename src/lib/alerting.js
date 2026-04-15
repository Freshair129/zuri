// Created At: 2026-04-10 09:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 09:00:00 +07:00 (v1.0.0)

import * as Sentry from '@sentry/nextjs'
import { sendLinePush } from '@/lib/line/lineUtil'

/**
 * Alert channels for production monitoring.
 * Sentry captures the full stack trace; LINE push gives Thai ops team
 * an immediate human-readable notification within seconds.
 */

/**
 * Captures an error to Sentry and sends a LINE push alert to ops.
 * Fail-safe: LINE push failures do NOT re-throw — alerting must never
 * crash the caller.
 *
 * @param {Error|string} error
 * @param {object} [context]   Extra tags/data forwarded to Sentry scope
 * @param {string} [context.tenantId]
 * @param {string} [context.route]     e.g. '/api/webhooks/line'
 * @param {string} [context.severity]  'critical' | 'error' | 'warning' (default 'error')
 */
export async function alertCriticalError(error, context = {}) {
  const { tenantId, route, severity = 'error' } = context

  // 1. Sentry — always capture for full stack trace + alerting rules
  Sentry.withScope((scope) => {
    if (tenantId) scope.setTag('tenantId', tenantId)
    if (route)    scope.setTag('route', route)
    scope.setLevel(severity)
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)))
  })

  // 2. LINE push — immediate Thai-language notification to ops
  const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const lineUid = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_MANAGER_USER_ID
  if (!token || !lineUid) return // Not configured — Sentry alert is sufficient

  const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  const errMsg    = error instanceof Error ? error.message : String(error)
  const routeTag  = route ? `\n📍 Route: ${route}` : ''
  const tenantTag = tenantId ? `\n🏢 Tenant: ${tenantId}` : ''

  const text = [
    `🚨 Zuri Alert [${severity.toUpperCase()}]`,
    `⏰ ${timestamp}`,
    `❌ ${errMsg}${routeTag}${tenantTag}`,
    `\nตรวจสอบ Sentry dashboard เพื่อดู stack trace`,
  ].join('\n')

  try {
    await sendLinePush(token, lineUid, [{ type: 'text', text }])
  } catch (lineErr) {
    console.error('[Alerting] LINE push failed:', lineErr.message)
  }
}

/**
 * Sends a plain LINE push to the ops user (non-error notifications).
 * Used by health-check worker for daily status reports.
 *
 * @param {string} text
 */
export async function notifyOps(text) {
  const token   = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const lineUid = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_MANAGER_USER_ID
  if (!token || !lineUid) {
    console.warn('[Alerting] LINE ops notification skipped — not configured')
    return
  }
  try {
    await sendLinePush(token, lineUid, [{ type: 'text', text }])
  } catch (err) {
    console.error('[Alerting] notifyOps LINE push failed:', err.message)
  }
}
