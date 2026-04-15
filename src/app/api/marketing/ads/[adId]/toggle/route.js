/**
 * POST /api/marketing/ads/:adId/toggle
 * Body: { enabled: boolean }
 *
 * Flips an ad between ACTIVE and PAUSED. RBAC: MANAGER+ (marketing:F).
 * Writes to Meta Graph API only when META_ADS_WRITE_ENABLED=true,
 * otherwise updates local DB only (UI shows the new state immediately).
 *
 * Audit: every successful toggle is logged via AUDIT_ACTIONS.AD_TOGGLE.
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { toggleAdStatus } from '@/lib/repositories/marketingRepo'
import { auditAction, AUDIT_ACTIONS } from '@/lib/audit'

export const POST = withAuth(
  async (request, { session, params }) => {
    try {
      const adId = params?.adId
      if (!adId) {
        return NextResponse.json({ error: 'adId required' }, { status: 400 })
      }

      const body = await request.json().catch(() => ({}))
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'enabled (boolean) required' }, { status: 400 })
      }

      const nextStatus = body.enabled ? 'ACTIVE' : 'PAUSED'
      const result = await toggleAdStatus(session.user.tenantId, adId, nextStatus)

      await auditAction({
        request,
        session,
        tenantId: session.user.tenantId,
        action: AUDIT_ACTIONS.AD_TOGGLE,
        target: adId,
        targetType: 'ad',
        before: { status: result.previousStatus },
        after:  { status: result.newStatus },
        details: { name: result.name, metaSynced: result.metaSynced },
      })

      return NextResponse.json({ ok: true, ...result })
    } catch (err) {
      console.error('[ads/toggle]', err)
      return NextResponse.json(
        { error: err.message || 'Internal server error' },
        { status: err.message?.includes('not found') ? 404 : 500 }
      )
    }
  },
  { domain: 'marketing', action: 'F' }
)
