// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { withAuth } from '@/lib/auth'
import { getRedis } from '@/lib/redis'
import crypto from 'crypto'

const prisma = getPrisma()

const ZURI_ROOT_DOMAIN = 'zuri.app'
const IMPERSONATE_TTL  = 3600 // 1 hour

/**
 * POST /api/admin/impersonate
 * Issue a short-lived impersonation token and log the action.
 * DEV only. Body: { tenantSlug: string }
 *
 * Returns { url } pointing to the tenant subdomain with ?imp={token}
 */
export const POST = withAuth(async (req, { session }) => {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { tenantSlug } = body
  if (!tenantSlug) return NextResponse.json({ error: 'tenantSlug required' }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({ where: { tenantSlug } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Issue a short-lived impersonation token stored in Redis
  const token   = crypto.randomBytes(24).toString('hex')
  const redisKey = `admin:impersonate:${token}`
  await getRedis().set(redisKey, JSON.stringify({
    adminId:    session.user.id,
    adminEmail: session.user.email,
    tenantId:   tenant.id,
    tenantSlug: tenant.tenantSlug,
    issuedAt:   new Date().toISOString(),
  }), { ex: IMPERSONATE_TTL })

  // Structured audit log
  const auditEntry = {
    adminId:    session.user.id,
    adminEmail: session.user.email,
    tenantId:   tenant.id,
    tenantSlug: tenant.tenantSlug,
    token,
    timestamp:  new Date().toISOString(),
  }
  console.log('[AUDIT][Impersonate]', auditEntry)

  // Store in Redis audit list (last 100 entries)
  await getRedis().lpush('admin:audit:impersonate', JSON.stringify(auditEntry))
  await getRedis().ltrim('admin:audit:impersonate', 0, 99)

  const host = req.headers.get('host') || ''
  const isDev = process.env.NODE_ENV === 'development'
  
  let url
  if (isDev) {
    url = `http://localhost:3000?tenant=${tenantSlug}&imp=${token}`
  } else {
    // Dynamically derive root domain from current host (e.g. zuri10.vercel.app or zuri.app)
    const hostname = host.split(':')[0]
    // If we're at marketing.zuri10.vercel.app, the root is zuri10.vercel.app
    const parts = hostname.split('.')
    let rootDomain = ZURI_ROOT_DOMAIN
    
    if (hostname.endsWith('.vercel.app') && parts.length >= 3) {
      rootDomain = parts.slice(parts.length - 3).join('.')
    } else if (parts.length >= 2) {
      rootDomain = parts.slice(parts.length - 2).join('.')
    }
    
    url = `https://${tenantSlug}.${rootDomain}?imp=${token}`
  }

  return NextResponse.json({ url, expiresInSeconds: IMPERSONATE_TTL })
}, { domain: 'system', action: 'F' })

/**
 * GET /api/admin/impersonate
 * Return recent impersonation audit log (last 20 entries). DEV only.
 */
export const GET = withAuth(async () => {
  const raw = await getRedis().lrange('admin:audit:impersonate', 0, 19)
  const entries = raw.map((e) => {
    try { return JSON.parse(e) } catch { return null }
  }).filter(Boolean)
  return NextResponse.json({ data: entries })
}, { domain: 'system', action: 'F' })
