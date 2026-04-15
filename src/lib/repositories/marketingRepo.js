// Created At: 2026-04-12 04:10:00 +07:00 (v1.3.1)
// Previous version: 2026-04-11 11:30:00 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 04:10:00 +07:00 (v1.3.1)

import { getPrisma } from '@/lib/db'
import { getOrSet, getRedis } from '@/lib/redis'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Parse a range string into start/end Date objects.
 * Supports: '7d' | '30d' | '90d' | ISO date pair
 */
export function parseDateRange(range = '30d') {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  let start = new Date(now)
  switch (range) {
    case '1d':  start.setDate(now.getDate() - 1);  break
    case '7d':  start.setDate(now.getDate() - 7);  break
    case '30d': start.setDate(now.getDate() - 30); break
    case '90d': start.setDate(now.getDate() - 90); break
    default:    start.setDate(now.getDate() - 30)
  }
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function calcDerived(r) {
  const spend = parseFloat(r.spend) || 0
  const impressions = parseInt(r.impressions) || 0
  const clicks = parseInt(r.clicks) || 0
  const leads = parseInt(r.leads) || 0
  const revenue = parseFloat(r.revenue) || 0
  return {
    ...r,
    spend,
    impressions,
    clicks,
    leads,
    revenue,
    ctr:  impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0,
    cpc:  clicks > 0     ? +(spend / clicks).toFixed(2)              : 0,
    cpl:  leads > 0      ? +(spend / leads).toFixed(2)               : 0,
    roas: spend > 0      ? +(revenue / spend).toFixed(2)             : 0,
    cpm:  impressions > 0 ? +(spend / impressions * 1000).toFixed(2) : 0,
  }
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null
  return +((curr - prev) / prev * 100).toFixed(1)
}

// ─────────────────────────────────────────────
// Core query (single period KPI)
// ─────────────────────────────────────────────

async function queryKpi(tenantId, start, end) {
  const prisma = await getPrisma()
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(m.spend), 0)::float      AS spend,
      COALESCE(SUM(m.impressions), 0)::int  AS impressions,
      COALESCE(SUM(m.clicks), 0)::int       AS clicks,
      COALESCE(SUM(m.leads), 0)::int        AS leads,
      COALESCE(SUM(m.revenue), 0)::float    AS revenue,
      COALESCE(SUM(m.reach), 0)::int        AS reach
    FROM ad_daily_metrics m
    JOIN ads a         ON m.ad_id      = a.ad_id
    JOIN ad_sets s     ON a.ad_set_id  = s.ad_set_id
    JOIN campaigns c   ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    WHERE ac.tenant_id::text = ${tenantId}
      AND m.date >= ${start}::date
      AND m.date <= ${end}::date
  `
  return rows[0] ?? {}
}

// ─────────────────────────────────────────────
// getAdTimeline — Gantt-style ad delivery calendar
// Returns one row per ad with spend > 0 in the window,
// each carrying a per-day spend map for chart rendering.
// ─────────────────────────────────────────────

export async function getAdTimeline(tenantId, range = '7d') {
  const cacheKey = `marketing:timeline:${tenantId}:${range}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const { start, end } = parseDateRange(range)

    const rows = await prisma.$queryRaw`
      WITH window_metrics AS (
        SELECT
          a.ad_id,
          a.name,
          a.status,
          m.date::date AS day,
          m.spend::float AS spend,
          m.impressions,
          m.clicks,
          m.leads
        FROM ad_daily_metrics m
        JOIN ads a          ON m.ad_id     = a.ad_id
        JOIN ad_sets s      ON a.ad_set_id = s.ad_set_id
        JOIN campaigns c    ON s.campaign_id = c.campaign_id
        JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
        WHERE ac.tenant_id::text = ${tenantId}
          AND m.date >= ${start}::date
          AND m.date <= ${end}::date
          AND m.spend > 0
      )
      SELECT
        ad_id                                          AS "adId",
        name,
        status,
        MIN(day)::text                                 AS "firstSpend",
        MAX(day)::text                                 AS "lastSpend",
        COUNT(DISTINCT day)::int                       AS "activeDays",
        SUM(spend)::float                              AS "totalSpend",
        SUM(impressions)::int                          AS "totalImpressions",
        SUM(clicks)::int                               AS "totalClicks",
        SUM(leads)::int                                AS "totalLeads",
        json_object_agg(day::text, spend ORDER BY day) AS "dailySpend"
      FROM window_metrics
      GROUP BY ad_id, name, status
      ORDER BY "firstSpend", "totalSpend" DESC
      LIMIT 80
    `

    // Roll up summary for KPI cards
    const summary = rows.reduce(
      (acc, r) => ({
        adsWithSpend:     acc.adsWithSpend + 1,
        totalSpend:       acc.totalSpend + (r.totalSpend || 0),
        totalImpressions: acc.totalImpressions + (r.totalImpressions || 0),
        totalClicks:      acc.totalClicks + (r.totalClicks || 0),
        totalLeads:       acc.totalLeads + (r.totalLeads || 0),
      }),
      { adsWithSpend: 0, totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalLeads: 0 }
    )

    // Date axis
    const dates = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().slice(0, 10))
    }

    return {
      range,
      windowStart: start.toISOString().slice(0, 10),
      windowEnd:   end.toISOString().slice(0, 10),
      dates,
      summary,
      ads: rows,
    }
  }, 300)
}

// ─────────────────────────────────────────────
// getAdsForToggleTable — flat list of ads + window metrics for the
// Campaign Tracker page. Returns ad-level rows (not aggregated by
// campaign) so the UI can toggle individual ads.
// ─────────────────────────────────────────────

export async function getAdsForToggleTable(tenantId, range = '30d') {
  const prisma = await getPrisma()
  const { start, end } = parseDateRange(range)
  const rows = await prisma.$queryRaw`
    SELECT
      a.id::text                                AS id,
      a.ad_id                                   AS "adId",
      a.name,
      a.status,
      a.delivery_status                         AS "deliveryStatus",
      s.ad_set_id                               AS "adSetId",
      s.name                                    AS "adSetName",
      c.campaign_id                             AS "campaignId",
      c.name                                    AS "campaignName",
      c.objective,
      COALESCE(SUM(m.spend),       0)::float    AS spend,
      COALESCE(SUM(m.impressions), 0)::int      AS impressions,
      COALESCE(SUM(m.clicks),      0)::int      AS clicks,
      COALESCE(SUM(m.leads),       0)::int      AS leads,
      COALESCE(SUM(m.revenue),     0)::float    AS revenue,
      MAX(m.date)                               AS "lastSpendDate"
    FROM ads a
    JOIN ad_sets s      ON a.ad_set_id = s.ad_set_id
    JOIN campaigns c    ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    LEFT JOIN ad_daily_metrics m
      ON m.ad_id = a.ad_id
     AND m.date >= ${start}::date
     AND m.date <= ${end}::date
    WHERE ac.tenant_id::text = ${tenantId}
    GROUP BY a.id, a.ad_id, a.name, a.status, a.delivery_status,
             s.ad_set_id, s.name, c.campaign_id, c.name, c.objective
    ORDER BY spend DESC NULLS LAST, a.name
    LIMIT 200
  `
  return rows.map((r) => ({
    ...r,
    ctr: r.impressions > 0 ? +(r.clicks / r.impressions * 100).toFixed(2) : 0,
    cpc: r.clicks > 0      ? +(r.spend / r.clicks).toFixed(2)              : 0,
    cpl: r.leads > 0       ? +(r.spend / r.leads).toFixed(2)               : 0,
    roas: r.spend > 0      ? +(r.revenue / r.spend).toFixed(2)             : 0,
  }))
}

/**
 * toggleAdStatus — flip an ad between ACTIVE and PAUSED.
 */
export async function toggleAdStatus(tenantId, adId, nextStatus) {
  if (!['ACTIVE', 'PAUSED'].includes(nextStatus)) {
    throw new Error(`Invalid status: ${nextStatus}`)
  }

  const prisma = await getPrisma()
  // 1. Tenant scope check
  const owns = await prisma.$queryRaw`
    SELECT a.ad_id, a.status, a.name
    FROM ads a
    JOIN ad_sets s      ON a.ad_set_id = s.ad_set_id
    JOIN campaigns c    ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    WHERE ac.tenant_id::text = ${tenantId} AND a.ad_id = ${adId}
    LIMIT 1
  `
  if (owns.length === 0) {
    throw new Error('Ad not found or not owned by tenant')
  }
  const before = owns[0]

  // 2. Meta API write (gated)
  let metaSynced = false
  if (process.env.META_ADS_WRITE_ENABLED === 'true' && process.env.META_SYSTEM_USER_TOKEN) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${adId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          access_token: process.env.META_SYSTEM_USER_TOKEN,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Meta API error: ${err?.error?.message ?? res.statusText}`)
      }
      metaSynced = true
    } catch (err) {
      console.error('[toggleAdStatus] Meta write failed', adId, err.message)
      throw err
    }
  }

  // 3. Local DB update
  await prisma.$executeRaw`
    UPDATE ads SET status = ${nextStatus}, updated_at = NOW()
    WHERE ad_id = ${adId}
  `

  // 4. Cache bust
  await clearMarketingCache(tenantId)

  return {
    adId,
    name: before.name,
    previousStatus: before.status,
    newStatus: nextStatus,
    metaSynced,
  }
}

// ─────────────────────────────────────────────
// getLiveAdStatus — current ad delivery snapshot
// ─────────────────────────────────────────────

export async function getLiveAdStatus(tenantId) {
  const prisma = await getPrisma()
  const rows = await prisma.$queryRaw`
    WITH latest AS (
      SELECT COALESCE(MAX(m.date)::date, CURRENT_DATE) AS d
      FROM ad_daily_metrics m
      JOIN ads a          ON m.ad_id     = a.ad_id
      JOIN ad_sets s      ON a.ad_set_id = s.ad_set_id
      JOIN campaigns c    ON s.campaign_id = c.campaign_id
      JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
      WHERE ac.tenant_id::text = ${tenantId}
    ),
    spent_recent AS (
      SELECT DISTINCT m.ad_id
      FROM ad_daily_metrics m, latest
      WHERE m.spend > 0
        AND m.date >= latest.d - INTERVAL '1 day'
        AND m.date <= latest.d
    )
    SELECT
      COUNT(*) FILTER (WHERE a.status = 'ACTIVE')                               AS active_total,
      COUNT(*) FILTER (WHERE a.status = 'PAUSED')                               AS paused_total,
      COUNT(*) FILTER (WHERE a.status = 'ACTIVE' AND a.ad_id IN (SELECT ad_id FROM spent_recent)) AS delivering,
      COUNT(*) FILTER (WHERE a.status = 'ACTIVE' AND a.ad_id NOT IN (SELECT ad_id FROM spent_recent)) AS active_no_spend,
      (SELECT d FROM latest)::text                                              AS as_of
    FROM ads a
    JOIN ad_sets s      ON a.ad_set_id = s.ad_set_id
    JOIN campaigns c    ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    WHERE ac.tenant_id::text = ${tenantId}
  `
  const r = rows[0] ?? {}
  return {
    delivering:    parseInt(r.delivering)    || 0,
    activeNoSpend: parseInt(r.active_no_spend) || 0,
    activeTotal:   parseInt(r.active_total)  || 0,
    pausedTotal:   parseInt(r.paused_total)  || 0,
    asOf:          r.as_of ?? null,
  }
}

// ─────────────────────────────────────────────
// getDashboardSummary — KPI cards with period comparison
// ─────────────────────────────────────────────

export async function getDashboardSummary(tenantId, range = '30d') {
  const cacheKey = `marketing:dashboard:${tenantId}:${range}`
  return getOrSet(cacheKey, async () => {
    const { start, end } = parseDateRange(range)
    const periodMs = end.getTime() - start.getTime()
    const prevEnd   = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - periodMs)

    const [curr, prev, live] = await Promise.all([
      queryKpi(tenantId, start, end),
      queryKpi(tenantId, prevStart, prevEnd),
      getLiveAdStatus(tenantId),
    ])

    const c = calcDerived(curr)
    const p = calcDerived(prev)

    return {
      range,
      current: c,
      previous: p,
      live, // { delivering, activeNoSpend, activeTotal, pausedTotal, asOf }
      changes: {
        spend:       pctChange(c.spend, p.spend),
        impressions: pctChange(c.impressions, p.impressions),
        clicks:      pctChange(c.clicks, p.clicks),
        leads:       pctChange(c.leads, p.leads),
        revenue:     pctChange(c.revenue, p.revenue),
        roas:        pctChange(c.roas, p.roas),
        ctr:         pctChange(c.ctr, p.ctr),
        cpl:         pctChange(c.cpl, p.cpl),
      },
    }
  }, 300)
}

// ─────────────────────────────────────────────
// getCampaigns — campaign list with aggregated metrics
// ─────────────────────────────────────────────

export async function getCampaigns(tenantId, { range = '30d', status } = {}) {
  const cacheKey = `marketing:campaigns:${tenantId}:${range}:${status ?? 'all'}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const { start, end } = parseDateRange(range)

    const rows = await prisma.$queryRaw`
      SELECT
        c.id,
        c.campaign_id  AS "campaignId",
        c.name,
        c.objective,
        c.status,
        c.start_date   AS "startDate",
        c.end_date     AS "endDate",
        COALESCE(SUM(m.spend),       0)::float  AS spend,
        COALESCE(SUM(m.impressions), 0)::int    AS impressions,
        COALESCE(SUM(m.clicks),      0)::int    AS clicks,
        COALESCE(SUM(m.leads),       0)::int    AS leads,
        COALESCE(SUM(m.revenue),     0)::float  AS revenue,
        COALESCE(SUM(m.reach),       0)::int    AS reach,
        COUNT(DISTINCT s.ad_set_id)::int        AS "adSetCount",
        COUNT(DISTINCT a.ad_id)::int            AS "adCount"
      FROM campaigns c
      JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
      LEFT JOIN ad_sets s ON s.campaign_id = c.campaign_id
      LEFT JOIN ads a     ON a.ad_set_id  = s.ad_set_id
      LEFT JOIN ad_daily_metrics m ON m.ad_id = a.ad_id
        AND m.date >= ${start}::date
        AND m.date <= ${end}::date
      WHERE ac.tenant_id::text = ${tenantId}
      GROUP BY c.id, c.campaign_id, c.name, c.objective, c.status, c.start_date, c.end_date
      ORDER BY spend DESC
    `

    let result = rows.map(calcDerived)
    if (status) result = result.filter(r => r.status === status)
    return result
  }, 300)
}

// ─────────────────────────────────────────────
// Drill-down: AdSets for a Campaign
// ─────────────────────────────────────────────

export async function getAdSetsForCampaign(tenantId, campaignId, range = '30d') {
  const prisma = await getPrisma()
  const { start, end } = parseDateRange(range)
  const rows = await prisma.$queryRaw`
    SELECT
      s.id,
      s.ad_set_id  AS "adSetId",
      s.name,
      s.status,
      s.daily_budget AS "dailyBudget",
      COALESCE(SUM(m.spend),       0)::float  AS spend,
      COALESCE(SUM(m.impressions), 0)::int    AS impressions,
      COALESCE(SUM(m.clicks),      0)::int    AS clicks,
      COALESCE(SUM(m.leads),       0)::int    AS leads,
      COALESCE(SUM(m.revenue),     0)::float  AS revenue,
      COUNT(DISTINCT a.ad_id)::int            AS "adCount"
    FROM ad_sets s
    JOIN campaigns c   ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    LEFT JOIN ads a    ON a.ad_set_id = s.ad_set_id
    LEFT JOIN ad_daily_metrics m ON m.ad_id = a.ad_id
      AND m.date >= ${start}::date
      AND m.date <= ${end}::date
    WHERE ac.tenant_id::text = ${tenantId}
      AND c.campaign_id = ${campaignId}
    GROUP BY s.id, s.ad_set_id, s.name, s.status, s.daily_budget
    ORDER BY spend DESC
  `
  return rows.map(calcDerived)
}

// ─────────────────────────────────────────────
// Drill-down: Ads for an AdSet
// ─────────────────────────────────────────────

export async function getAdsForAdSet(tenantId, adSetId, range = '30d') {
  const prisma = await getPrisma()
  const { start, end } = parseDateRange(range)
  const rows = await prisma.$queryRaw`
    SELECT
      a.id,
      a.ad_id           AS "adId",
      a.name,
      a.status,
      a.delivery_status AS "deliveryStatus",
      COALESCE(SUM(m.spend),       0)::float  AS spend,
      COALESCE(SUM(m.impressions), 0)::int    AS impressions,
      COALESCE(SUM(m.clicks),      0)::int    AS clicks,
      COALESCE(SUM(m.leads),       0)::int    AS leads,
      COALESCE(SUM(m.revenue),     0)::float  AS revenue
    FROM ads a
    JOIN ad_sets s     ON a.ad_set_id  = s.ad_set_id
    JOIN campaigns c   ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    LEFT JOIN ad_daily_metrics m ON m.ad_id = a.ad_id
      AND m.date >= ${start}::date
      AND m.date <= ${end}::date
    WHERE ac.tenant_id::text = ${tenantId}
      AND s.ad_set_id = ${adSetId}
    GROUP BY a.id, a.ad_id, a.name, a.status, a.delivery_status
    ORDER BY spend DESC
  `
  return rows.map(calcDerived)
}

// ─────────────────────────────────────────────
// getTimeSeries — daily spend/revenue/clicks for Recharts
// ─────────────────────────────────────────────

export async function getTimeSeries(tenantId, range = '30d') {
  const cacheKey = `marketing:timeseries:${tenantId}:${range}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const { start, end } = parseDateRange(range)
    const rows = await prisma.$queryRaw`
      SELECT
        m.date::text                          AS date,
        COALESCE(SUM(m.spend),       0)::float  AS spend,
        COALESCE(SUM(m.impressions), 0)::int    AS impressions,
        COALESCE(SUM(m.clicks),      0)::int    AS clicks,
        COALESCE(SUM(m.revenue),     0)::float  AS revenue,
        COALESCE(SUM(m.reach),       0)::int    AS reach
      FROM ad_daily_metrics m
      JOIN ads a         ON m.ad_id      = a.ad_id
      JOIN ad_sets s     ON a.ad_set_id  = s.ad_set_id
      JOIN campaigns c   ON s.campaign_id = c.campaign_id
      JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
      WHERE ac.tenant_id::text = ${tenantId}
        AND m.date >= ${start}::date
        AND m.date <= ${end}::date
      GROUP BY m.date
      ORDER BY m.date ASC
    `
    return rows.map(r => ({
      date:        r.date,
      spend:       parseFloat(r.spend) || 0,
      impressions: parseInt(r.impressions) || 0,
      clicks:      parseInt(r.clicks) || 0,
      revenue:     parseFloat(r.revenue) || 0,
      reach:       parseInt(r.reach) || 0,
      ctr:         (parseInt(r.impressions) || 0) > 0
                     ? +((parseInt(r.clicks) / parseInt(r.impressions)) * 100).toFixed(2)
                     : 0,
    }))
  }, 300)
}

// ─────────────────────────────────────────────
// getPlacementBreakdown — by platform + position
// ─────────────────────────────────────────────

export async function getPlacementBreakdown(tenantId, range = '30d') {
  const cacheKey = `marketing:placement:${tenantId}:${range}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const { start, end } = parseDateRange(range)
    const rows = await prisma.$queryRaw`
      SELECT
        p.platform,
        p.position,
        COALESCE(SUM(p.spend),       0)::float  AS spend,
        COALESCE(SUM(p.impressions), 0)::int    AS impressions,
        COALESCE(SUM(p.clicks),      0)::int    AS clicks,
        COALESCE(SUM(p.revenue),     0)::float  AS revenue,
        COALESCE(SUM(p.reach),       0)::int    AS reach
      FROM ad_daily_placements p
      JOIN ads a         ON p.ad_id      = a.ad_id
      JOIN ad_sets s     ON a.ad_set_id  = s.ad_set_id
      JOIN campaigns c   ON s.campaign_id = c.campaign_id
      JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
      WHERE ac.tenant_id::text = ${tenantId}
        AND p.date >= ${start}::date
        AND p.date <= ${end}::date
      GROUP BY p.platform, p.position
      ORDER BY spend DESC
    `
    return rows.map(r => ({
      platform:    r.platform,
      position:    r.position,
      label:       `${r.platform} – ${r.position}`,
      spend:       parseFloat(r.spend) || 0,
      impressions: parseInt(r.impressions) || 0,
      clicks:      parseInt(r.clicks) || 0,
      revenue:     parseFloat(r.revenue) || 0,
      cpm:  (parseInt(r.impressions) || 0) > 0
              ? +((parseFloat(r.spend) / parseInt(r.impressions)) * 1000).toFixed(2) : 0,
      ctr:  (parseInt(r.impressions) || 0) > 0
              ? +((parseInt(r.clicks) / parseInt(r.impressions)) * 100).toFixed(2) : 0,
    }))
  }, 300)
}

// ─────────────────────────────────────────────
// getHourlyHeatmap — 24×7 grid (dayOfWeek × hour)
// ─────────────────────────────────────────────

export async function getHourlyHeatmap(tenantId, range = '30d') {
  const cacheKey = `marketing:heatmap:${tenantId}:${range}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const { start, end } = parseDateRange(range)
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(DOW FROM h.date)::int         AS dow,
        h.hour,
        COALESCE(SUM(h.spend),       0)::float  AS spend,
        COALESCE(SUM(h.clicks),      0)::int    AS clicks,
        COALESCE(SUM(h.impressions), 0)::int    AS impressions,
        COALESCE(SUM(h.leads),       0)::int    AS leads
      FROM ad_hourly_metrics h
      JOIN ads a         ON h.ad_id      = a.ad_id
      JOIN ad_sets s     ON a.ad_set_id  = s.ad_set_id
      JOIN campaigns c   ON s.campaign_id = c.campaign_id
      JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
      WHERE ac.tenant_id::text = ${tenantId}
        AND h.date >= ${start}::date
        AND h.date <= ${end}::date
      GROUP BY dow, h.hour
      ORDER BY dow, h.hour
    `
    return rows.map(r => ({
      dow:         parseInt(r.dow) || 0,    // 0 = Sun … 6 = Sat
      hour:        parseInt(r.hour) || 0,
      spend:       parseFloat(r.spend) || 0,
      clicks:      parseInt(r.clicks) || 0,
      impressions: parseInt(r.impressions) || 0,
      leads:       parseInt(r.leads) || 0,
    }))
  }, 300)
}

// ─────────────────────────────────────────────
// AskMarketing: Business Memory & Context (FEAT15)
// ─────────────────────────────────────────────

export async function getTenantMarketingConfig(tenantId) {
  const prisma = await getPrisma()
  const config = await prisma.tenantMarketingConfig.findUnique({
    where: { tenantId }
  })
  // Default values from spec FEAT15
  return config || {
    targetROAS: 3.0,
    avgCOGS: 0.35,
    creatureFatigueFreq: 4.0,
    dailyBudgetCap: null,
    seasonalPeaks: [],
    notes: ''
  }
}

export async function upsertTenantMarketingConfig(tenantId, data) {
  const prisma = await getPrisma()
  return await prisma.tenantMarketingConfig.upsert({
    where: { tenantId },
    update: { ...data, updatedAt: new Date() },
    create: { ...data, tenantId, updatedAt: new Date() }
  })
}

/**
 * getAskContext — High-fidelity data aggregator for the AI engine.
 */
export async function getAskContext(tenantId, range = '30d') {
  const prisma = await getPrisma()
  const { start, end } = parseDateRange(range)

  // 1. KPI Summary & Live Status
  const summary = await getDashboardSummary(tenantId, range)

  // 2. Top 10 Campaigns by Spend
  const campaigns = await getCampaigns(tenantId, { range })
  const topCampaigns = (campaigns || []).slice(0, 10).map(c => ({
    name: c.name,
    status: c.status,
    spend: c.spend,
    revenue: c.revenue,
    roas: c.roas,
    leads: c.leads
  }))

  // 3. Creative Fatigue Candidates (Frequency > threshold)
  const config = await getTenantMarketingConfig(tenantId)
  const threshold = config.creatureFatigueFreq || 4.0

  const fatigueRows = await prisma.$queryRaw`
    SELECT
      a.ad_id as "adId",
      a.name,
      SUM(m.spend)::float as spend,
      SUM(m.impressions)::int as impressions,
      SUM(m.reach)::int as reach,
      SUM(m.clicks)::int as clicks
    FROM ad_daily_metrics m
    JOIN ads a ON m.ad_id = a.ad_id
    JOIN ad_sets s ON a.ad_set_id = s.ad_set_id
    JOIN campaigns c ON s.campaign_id = c.campaign_id
    JOIN ad_accounts ac ON c.ad_account_id = ac.account_id
    WHERE ac.tenant_id::text = ${tenantId}
      AND m.date >= ${start}::date
      AND m.date <= ${end}::date
      AND a.status = 'ACTIVE'
    GROUP BY a.ad_id, a.name
    HAVING SUM(m.reach) > 0 AND (SUM(m.impressions)::float / SUM(m.reach)::float) > ${threshold}
    ORDER BY spend DESC
    LIMIT 5
  `
  const fatigueCandidates = (fatigueRows || []).map(r => ({
    ...r,
    frequency: +(r.impressions / r.reach).toFixed(2),
    ctr: r.impressions > 0 ? +(r.clicks / r.impressions * 100).toFixed(2) : 0
  }))

  // 4. Tracking Health (Unattributed Revenue Check)
  const trackingRows = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(total), 0)::float as total_revenue,
      COALESCE(SUM(total) FILTER (WHERE metadata->>'firstTouchAdId' IS NULL), 0)::float as unattributed_revenue
    FROM orders
    WHERE tenant_id::text = ${tenantId}
      AND created_at >= ${start}
      AND created_at <= ${end}
      AND status NOT IN ('CANCELLED', 'VOID')
  `
  const th = trackingRows[0] || { total_revenue: 0, unattributed_revenue: 0 }
  const unattributedPct = th.total_revenue > 0 ? +(th.unattributed_revenue / th.total_revenue * 100).toFixed(1) : 0

  return {
    period: range,
    summary: {
      spend: summary.current.spend,
      revenue: summary.current.revenue,
      roas: summary.current.roas,
      liveAdCount: summary.live.delivering
    },
    topCampaigns,
    fatigueCandidates,
    tracking: {
      unattributedPct,
      isIssueLowAttribution: unattributedPct > 60
    },
    businessMemory: {
      targetROAS: config.targetROAS,
      avgCOGS: config.avgCOGS,
      notes: config.notes
    }
  }
}

// ─────────────────────────────────────────────
// clearMarketingCache — called after sync-hourly
// ─────────────────────────────────────────────

export async function clearMarketingCache(tenantId) {
  const redis = getRedis()
  const ranges = ['7d', '30d', '90d']
  const prefixes = ['dashboard', 'campaigns', 'timeseries', 'placement', 'heatmap']
  const keys = []
  for (const prefix of prefixes) {
    for (const r of ranges) {
      keys.push(`marketing:${prefix}:${tenantId}:${r}`)
      keys.push(`marketing:${prefix}:${tenantId}:${r}:all`)
    }
  }
  await Promise.all(keys.map(k => redis.del(k)))
}
