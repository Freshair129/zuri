// Created At: 2026-04-12 06:00:00 +07:00 (v1.3.23)
// Previous version: 2026-04-09 14:18:00 +07:00 (v1.1.0b)
// Last Updated: 2026-04-12 06:00:00 +07:00 (v1.3.23)

import { getPrisma } from '@/lib/db'

/**
 * UI reads ads data from DB — never from Graph API directly.
 * Data is synced hourly via QStash worker → /api/workers/sync-hourly
 */

// ─────────────────────────────────────────────────────────
// Helpers: tenant scoping via AdAccount chain
// ─────────────────────────────────────────────────────────

/**
 * Build a Prisma `where` filter that scopes Ads to a specific tenant
 * by traversing AdAccount → Campaign → AdSet → Ad.
 */
function adTenantWhere(tenantId, extra = {}) {
  return {
    adSet: {
      campaign: {
        adAccount: { tenantId },
      },
    },
    ...extra,
  }
}

// ─────────────────────────────────────────────────────────
// findAllAds — list ads for a tenant
// ─────────────────────────────────────────────────────────

export async function findAllAds(tenantId, { status, limit = 100 } = {}) {
  const prisma = await getPrisma()
  const where = adTenantWhere(tenantId, status ? { status } : {})

  return prisma.ad.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })
}

// ─────────────────────────────────────────────────────────
// findDailyMetrics — metrics for a specific ad
// ─────────────────────────────────────────────────────────

export async function findDailyMetrics(tenantId, adId, { startDate, endDate } = {}) {
  const prisma = await getPrisma()
  // Verify this ad belongs to the tenant first
  const ad = await prisma.ad.findFirst({
    where: { adId, ...adTenantWhere(tenantId) },
  })
  if (!ad) return []

  const where = { adId }
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = startDate
    if (endDate)   where.date.lte = endDate
  }

  return prisma.adDailyMetric.findMany({
    where,
    orderBy: { date: 'asc' },
  })
}

// ─────────────────────────────────────────────────────────
// upsertDailyMetric — used by sync-hourly worker
// ─────────────────────────────────────────────────────────

export async function upsertDailyMetric(adId, date, data) {
  const prisma = await getPrisma()
  return prisma.adDailyMetric.upsert({
    where: { adId_date: { adId, date } },
    create: { ...data, adId, date },
    update: data,
  })
}

// ─────────────────────────────────────────────────────────
// getCampaignById — used by ads-optimize API
// ─────────────────────────────────────────────────────────

export async function getCampaignById({ tenantId, id }) {
  const prisma = await getPrisma()
  return prisma.campaign.findFirst({
    where: {
      id,
      adAccount: { tenantId },
    },
  })
}

// ─────────────────────────────────────────────────────────
// updateCampaignStatus — pause/activate campaign or ad
// ─────────────────────────────────────────────────────────

export async function updateCampaignStatus({ tenantId, campaignId, adId, action }) {
  const prisma = await getPrisma()
  const status = action === 'pause' ? 'PAUSED' : 'ACTIVE'

  if (campaignId) {
    // Verify tenant ownership
    const camp = await getCampaignById({ tenantId, id: campaignId })
    if (!camp) throw new Error('Campaign not found or access denied')

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status },
    })
  }

  if (adId) {
    const ad = await prisma.ad.findFirst({
      where: { adId, ...adTenantWhere(tenantId) },
    })
    if (!ad) throw new Error('Ad not found or access denied')

    await prisma.ad.update({
      where: { adId },
      data: { status },
    })
  }
}

// ─────────────────────────────────────────────────────────
// getCampaignMetrics — aggregate metrics for a campaign
// ─────────────────────────────────────────────────────────

export async function getCampaignMetrics(tenantId, campaignId) {
  const prisma = await getPrisma()
  // Verify ownership
  const camp = await prisma.campaign.findFirst({
    where: { campaignId, adAccount: { tenantId } },
    include: { adSets: { include: { ads: { select: { adId: true } } } } },
  })
  if (!camp) return []

  const adIds = camp.adSets.flatMap(s => s.ads.map(a => a.adId))
  if (!adIds.length) return []

  return prisma.adDailyMetric.groupBy({
    by: ['adId'],
    where: { adId: { in: adIds } },
    _sum: {
      impressions: true,
      clicks:      true,
      spend:       true,
      revenue:     true,
      leads:       true,
    },
  })
}
