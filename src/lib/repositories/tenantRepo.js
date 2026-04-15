// Created At: 2026-04-12 03:57:00 +07:00 (v1.2.8)
// Previous version: 2026-04-12 03:22:00 +07:00 (v1.2.4)
// Last Updated: 2026-04-12 03:57:00 +07:00 (v1.2.8)

import { getPrisma } from '@/lib/db'
import { isMockMode, MOCK_TENANT } from '@/lib/mockMode'

// Cache TTL: 5 min — tenant config rarely changes
const TENANT_CACHE_TTL = 300

/**
 * Get tenant by internal UUID (tenantId from session)
 */
export async function getTenantById(id) {
  if (isMockMode) return MOCK_TENANT
  const { getOrSet } = await import('@/lib/redis')
  const prisma = await getPrisma()
  return getOrSet(`tenant:id:${id}`, async () => {
    return prisma.tenant.findUnique({ where: { id } })
  }, TENANT_CACHE_TTL)
}

/**
 * Get tenant by slug (subdomain: vschool, sakura …)
 */
export async function getTenantBySlug(slug) {
  if (isMockMode) return MOCK_TENANT
  const { getOrSet } = await import('@/lib/redis')
  const prisma = await getPrisma()
  return getOrSet(`tenant:slug:${slug}`, async () => {
    return prisma.tenant.findUnique({ where: { tenantSlug: slug } })
  }, TENANT_CACHE_TTL)
}

/**
 * Shape a Tenant record into a safe public config object
 */
export function shapeTenantConfig(tenant) {
  if (!tenant) return null
  const config = tenant.config ?? {}
  return {
    id:        tenant.id,
    name:      tenant.tenantName,
    slug:      tenant.tenantSlug,
    plan:      tenant.plan,
    isActive:  tenant.isActive,
    brandColor:          config.brandColor          ?? '#E8820C',
    brandColorSecondary: config.brandColorSecondary ?? '#1A1710',
    logoUrl:             config.logoUrl             ?? null,
    brandFont:           config.brandFont           ?? 'IBM Plex Sans Thai',
    businessHours:       config.businessHours       ?? null,
    vatRate:             config.vatRate             ?? 7,
    currency:            config.currency            ?? 'THB',
    timezone:            config.timezone            ?? 'Asia/Bangkok',
    hasFbPage:           Boolean(tenant.fbPageId  || tenant.fbPageToken),
    hasLineOa:           Boolean(tenant.lineOaId  || tenant.lineChannelToken),
    hasLineChannelSecret: Boolean(tenant.lineChannelSecret),
  }
}

/**
 * Get raw integration tokens (Worker/Server only)
 */
export async function getTenantTokens(tenantId) {
  const prisma = await getPrisma()
  const tenant = await prisma.tenant.findUnique({
    where:  { id: tenantId },
    select: {
      fbPageToken: true,
      lineChannelToken: true,
      lineChannelSecret: true,
      fbPageId: true,
      lineOaId: true,
    },
  })
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`)
  
  const { decryptToken } = await import('@/lib/crypto/tokenEncryption')
  return {
    fbPageToken:       (await decryptToken(tenant.fbPageToken))       ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? null,
    lineChannelToken:  (await decryptToken(tenant.lineChannelToken))  ?? process.env.LINE_CHANNEL_ACCESS_TOKEN  ?? null,
    lineChannelSecret: (await decryptToken(tenant.lineChannelSecret)) ?? process.env.LINE_CHANNEL_SECRET        ?? null,
  }
}

/**
 * Resolve tenant by Facebook Page ID
 */
export async function getTenantByFbPageId(fbPageId) {
  if (!fbPageId) return null
  const prisma = await getPrisma()
  return prisma.tenant.findFirst({ where: { fbPageId, isActive: true } })
}

/**
 * Resolve tenant by LINE OA ID
 */
export async function getTenantByLineOaId(lineOaId) {
  if (!lineOaId) return null
  const prisma = await getPrisma()
  return prisma.tenant.findFirst({ where: { lineOaId, isActive: true } })
}

/**
 * Update per-tenant config
 */
export async function updateTenantConfig(tenantId, updates) {
  const ALLOWED_KEYS = [
    'brandColor', 'brandColorSecondary', 'logoUrl', 'brandFont',
    'businessHours', 'vatRate', 'currency', 'timezone',
  ]

  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_KEYS.includes(k))
  )

  if (Object.keys(safe).length === 0) throw new Error('No valid config keys provided')

  const prisma = await getPrisma()
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!existing) throw new Error('Tenant not found')

  const merged = { ...(existing.config ?? {}), ...safe }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data:  { config: merged, updatedAt: new Date() },
  })

  // Bust cache
  const { getRedis } = await import('@/lib/redis')
  await Promise.all([
    getRedis().del(`tenant:id:${tenantId}`),
    getRedis().del(`tenant:slug:${existing.tenantSlug}`),
    getRedis().del(`tenant:${existing.tenantSlug}`),
  ]).catch((err) => console.error('[tenantRepo.updateConfig] cache bust failed', err))

  return shapeTenantConfig(updated)
}

/**
 * Update integration fields
 */
export async function updateTenantIntegrations(tenantId, { fbPageId, lineOaId, fbPageToken, lineChannelToken, lineChannelSecret }) {
  const { encryptToken } = await import('@/lib/crypto/tokenEncryption')
  const data = {}
  if (fbPageId           !== undefined) data.fbPageId           = fbPageId           || null
  if (lineOaId           !== undefined) data.lineOaId           = lineOaId           || null
  if (fbPageToken        !== undefined) data.fbPageToken        = fbPageToken        ? await encryptToken(fbPageToken)       : null
  if (lineChannelToken   !== undefined) data.lineChannelToken   = lineChannelToken   ? await encryptToken(lineChannelToken)  : null
  if (lineChannelSecret  !== undefined) data.lineChannelSecret  = lineChannelSecret  ? await encryptToken(lineChannelSecret) : null

  if (Object.keys(data).length === 0) return null

  const prisma = await getPrisma()
  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!existing) throw new Error('Tenant not found')

  const updated = await prisma.tenant.update({ where: { id: tenantId }, data })

  const { getRedis } = await import('@/lib/redis')
  await Promise.all([
    getRedis().del(`tenant:id:${tenantId}`),
    getRedis().del(`tenant:slug:${existing.tenantSlug}`),
    getRedis().del(`tenant:${existing.tenantSlug}`),
  ]).catch((err) => console.error('[tenantRepo.updateIntegrations] cache bust failed', err))

  return shapeTenantConfig(updated)
}
