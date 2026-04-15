import { NextResponse } from 'next/server'
import { getTenantId, getTenantSlug, resolveTenantBySlug } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getTenantById, updateTenantConfig, shapeTenantConfig } from '@/lib/repositories/tenantRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/tenant/config
 * Returns public branding + config for the current tenant.
 * Used by TenantContext on every page load (no auth required — public branding).
 */
export async function GET(request) {
  try {
    let tenantId = getTenantId(request)
    let tenant = null

    if (tenantId) {
      tenant = await getTenantById(tenantId)
    } else {
      // Fallback for public branding: resolve by slug from headers/subdomain
      const slug = getTenantSlug(request)
      tenant = await resolveTenantBySlug(slug)
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ data: shapeTenantConfig(tenant) })
  } catch (error) {
    console.error('[Tenant/Config.GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/tenant/config
 * Update per-tenant branding / locale config.
 * Requires OWNER or MANAGER role (RBAC domain: tenant, action: W).
 *
 * Body: { brandColor?, logoUrl?, vatRate?, currency?, timezone? }
 */
export const PATCH = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      if (!tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = await request.json()
      const updated = await updateTenantConfig(tenantId, body)

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error('[Tenant/Config.PATCH]', error)
      if (error.message === 'No valid config keys provided') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message === 'Tenant not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'tenant', action: 'W' }
)
