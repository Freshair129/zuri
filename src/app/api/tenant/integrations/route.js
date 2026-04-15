import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { updateTenantIntegrations } from '@/lib/repositories/tenantRepo'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/tenant/integrations
 * Update per-tenant integration credentials (OWNER only)
 *
 * Body: { fbPageId?, fbPageToken?, lineOaId?, lineChannelToken? }
 * Tokens are stored in DB — not exposed via GET /api/tenant/config (returns boolean flags only)
 */
export const PATCH = withAuth(async (req, { session }) => {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fbPageId, fbPageToken, lineOaId, lineChannelToken, lineChannelSecret } = body

  try {
    const result = await updateTenantIntegrations(tenantId, {
      fbPageId,
      fbPageToken,
      lineOaId,
      lineChannelToken,
      lineChannelSecret,
    })
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[PATCH /api/tenant/integrations]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}, { domain: 'tenant', action: 'W' })
