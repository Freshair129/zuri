// Created At: 2026-04-12 11:55:00 +07:00 (v1.3.0)
// Previous version: 2026-04-11 20:30:00 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 11:55:00 +07:00 (v1.3.0)

import { getOrSet } from '@/lib/redis'
import { getPrisma } from '@/lib/db'

const V_SCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001'
const V_SCHOOL_SLUG = 'vschool'

/**
 * Get tenantId from request headers (set by middleware)
 */
export function getTenantId(req) {
  return req.headers.get('x-tenant-id') || null
}

/**
 * Get tenant slug from request headers
 */
export function getTenantSlug(req) {
  return req.headers.get('x-tenant-slug') || V_SCHOOL_SLUG
}

/**
 * Resolve tenant by slug (cached in Redis for 5 min)
 */
export async function resolveTenantBySlug(slug) {
  return getOrSet(`tenant:${slug}`, async () => {
    const prisma = await getPrisma()
    return prisma.tenant.findUnique({
      where: { tenantSlug: slug },
    })
  }, 300)
}
