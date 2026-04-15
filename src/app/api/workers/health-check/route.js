// Created At: 2026-04-10 09:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 09:00:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getPrisma } from '@/lib/db'
import { getRedis } from '@/lib/redis'
import { notifyOps } from '@/lib/alerting'

export const dynamic = 'force-dynamic'

// POST /api/workers/health-check
// QStash cron: 0 1 * * * UTC = 08:00 ICT daily
// Runs a full health report for the first 7 days post-launch;
// continues as a lightweight ping thereafter.
export async function POST(request) {
  const { isValid } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  const results = {
    db:    { ok: false, latencyMs: null },
    redis: { ok: false, latencyMs: null },
    timestamp: new Date().toISOString(),
  }

  // ── DB health check ───────────────────────────────────────────────
  try {
    const prisma = getPrisma()
    const t0 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    results.db = { ok: true, latencyMs: Date.now() - t0 }
  } catch (err) {
    console.error('[HealthCheck] DB check failed:', err.message)
    results.db = { ok: false, error: err.message, latencyMs: null }
  }

  // ── Redis health check ────────────────────────────────────────────
  try {
    const r = getRedis()
    if (r) {
      const t0 = Date.now()
      await r.set('health:ping', '1', { ex: 60 })
      results.redis = { ok: true, latencyMs: Date.now() - t0 }
    } else {
      results.redis = { ok: false, error: 'Redis not configured' }
    }
  } catch (err) {
    console.error('[HealthCheck] Redis check failed:', err.message)
    results.redis = { ok: false, error: err.message, latencyMs: null }
  }

  // ── Determine if we're in the 7-day post-launch window ───────────
  const launchDateStr = process.env.LAUNCH_DATE // e.g. "2026-04-10"
  const isPostLaunchWindow = launchDateStr
    ? Date.now() - new Date(launchDateStr).getTime() < 7 * 24 * 60 * 60 * 1000
    : false

  const allOk  = results.db.ok && results.redis.ok
  const nowTH  = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  const status = allOk ? '✅ ระบบปกติ' : '⚠️ มีปัญหา'

  // ── Always send alert if something is broken ──────────────────────
  if (!allOk || isPostLaunchWindow) {
    const dbLine = results.db.ok
      ? `✅ DB: ${results.db.latencyMs}ms`
      : `❌ DB: ${results.db.error}`
    const redisLine = results.redis.ok
      ? `✅ Redis: ${results.redis.latencyMs}ms`
      : `❌ Redis: ${results.redis.error}`

    const header = isPostLaunchWindow && allOk
      ? `🟢 Daily Health Report — Day ${getDaysSinceLaunch(launchDateStr)}/7`
      : `🔴 Health Alert — ${status}`

    const report = [
      header,
      `⏰ ${nowTH}`,
      ``,
      dbLine,
      redisLine,
    ].join('\n')

    await notifyOps(report)
  }

  // ── If critical failure, throw so QStash retries ─────────────────
  if (!results.db.ok) {
    console.error('[HealthCheck] DB is DOWN — throwing for QStash retry')
    throw new Error(`DB health check failed: ${results.db.error}`)
  }

  return NextResponse.json({ ok: allOk, results })
}

function getDaysSinceLaunch(launchDateStr) {
  const ms = Date.now() - new Date(launchDateStr).getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
}
