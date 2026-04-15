// Created At: 2026-04-10 03:15:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:15:00 +07:00 (v1.0.0)

/**
 * GET /api/marketing/ads-audit
 * M4 Feature C1 — Meta Ads Audit (ZDEV-TSK-20260410-015)
 *
 * Query params:
 *   range        '7d' | '30d' | '90d'   (default '30d')
 *   campaignId   narrow to one campaign (optional)
 *   regenerate   'true' to bypass Redis cache (DEV only)
 *
 * RBAC:
 *   OWNER, MANAGER, SALES  → view cached report
 *   DEV                    → may pass regenerate=true
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { auditAds } from '@/lib/ai/adsAuditor'

export const dynamic = 'force-dynamic'

const VIEW_ROLES      = ['OWNER', 'MANAGER', 'MGR', 'SALES', 'DEV']
const REGENERATE_ROLES = ['DEV', 'MANAGER', 'MGR', 'OWNER']

function hasRole(session, allowed) {
  if (!session?.user) return false
  const userRoles = Array.isArray(session.user.roles)
    ? session.user.roles
    : [session.user.role].filter(Boolean)
  return userRoles.some((r) => allowed.includes(r))
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!hasRole(session, VIEW_ROLES)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const range       = searchParams.get('range') || '30d'
    const campaignId  = searchParams.get('campaignId') || null
    const regenerate  = searchParams.get('regenerate') === 'true'

    if (!['7d', '30d', '90d'].includes(range)) {
      return NextResponse.json({ error: 'range must be 7d, 30d, or 90d' }, { status: 400 })
    }

    // Only privileged roles may force a regenerate (costs a Gemini call)
    const canRegenerate = hasRole(session, REGENERATE_ROLES)
    if (regenerate && !canRegenerate) {
      return NextResponse.json({ error: 'Forbidden — regenerate requires MANAGER, OWNER or DEV' }, { status: 403 })
    }

    const report = await auditAds(tenantId, {
      range,
      campaignId,
      regenerate: regenerate && canRegenerate,
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('[Marketing/AdsAudit] GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
