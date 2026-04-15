// Created At: 2026-04-10 06:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 06:00:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const REDIS_KEY = 'uat:feedback'
const MAX_ENTRIES = 500

/**
 * POST /api/uat/feedback
 * Submit UAT feedback entry. Any authenticated user.
 */
export const POST = withAuth(async (req, { session }) => {
  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { role, module: mod, issueType, severity, description, steps, expected, actual } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const entry = {
    id:          `UAT-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    submittedBy: session?.user?.email ?? 'unknown',
    tenantSlug:  session?.user?.tenantSlug ?? null,
    role:        role ?? null,
    module:      mod ?? null,
    issueType:   issueType ?? 'BUG',
    severity:    severity ?? 'MINOR',
    description: description.trim(),
    steps:       steps?.trim() ?? null,
    expected:    expected?.trim() ?? null,
    actual:      actual?.trim() ?? null,
  }

  const redis = getRedis()
  await redis.lpush(REDIS_KEY, JSON.stringify(entry))
  await redis.ltrim(REDIS_KEY, 0, MAX_ENTRIES - 1)

  console.log('[UAT][Feedback]', {
    id: entry.id, severity: entry.severity, module: entry.module, submittedBy: entry.submittedBy,
  })

  return NextResponse.json({ ok: true, id: entry.id })
})

/**
 * GET /api/uat/feedback
 * Retrieve all feedback entries. DEV role only.
 */
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '100', 10))

  const redis = getRedis()
  const raw   = await redis.lrange(REDIS_KEY, 0, limit - 1)
  const items = raw.map((r) => { try { return JSON.parse(r) } catch { return null } }).filter(Boolean)

  // Severity stats
  const stats = { CRITICAL: 0, MAJOR: 0, MINOR: 0, TRIVIAL: 0 }
  items.forEach((i) => { if (stats[i.severity] !== undefined) stats[i.severity]++ })

  return NextResponse.json({ data: items, total: items.length, stats })
}, { domain: 'system', action: 'F' })
