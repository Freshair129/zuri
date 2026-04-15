import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getPrisma } from '@/lib/db'
import { getRedis } from '@/lib/redis'
import { clearMarketingCache } from '@/lib/repositories/marketingRepo'
import { getTenantTokens } from '@/lib/repositories/tenantRepo'

const META_API_VERSION = 'v21.0'
const META_API_BASE    = `https://graph.facebook.com/${META_API_VERSION}`

const prisma = getPrisma()

// ─────────────────────────────────────────────────────────────────────────────
// Meta Graph API helpers
// ─────────────────────────────────────────────────────────────────────────────

async function metaGet(path, params = {}, token) {
  const accessToken = token ?? process.env.META_SYSTEM_USER_TOKEN
  if (!accessToken) throw new Error('META_SYSTEM_USER_TOKEN not set')

  const qs = new URLSearchParams({ access_token: accessToken, ...params })
  const url = `${META_API_BASE}/${path}?${qs}`
  const res = await fetch(url)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Meta API ${res.status}: ${err?.error?.message ?? res.statusText}`)
  }
  return res.json()
}

/**
 * Paginate a Meta /edge endpoint, collecting all pages.
 * Returns flat array of items.
 */
async function metaGetAll(path, params = {}, token) {
  const items = []
  let cursor = null

  do {
    const p = { ...params, limit: 500 }
    if (cursor) p.after = cursor

    const data = await metaGet(path, p, token)
    if (data.data) items.push(...data.data)

    cursor = data.paging?.cursors?.after ?? null
    const nextUrl = data.paging?.next
    if (!nextUrl) break
  } while (cursor)

  return items
}

// ─────────────────────────────────────────────────────────────────────────────
// Upsert helpers (raw SQL for speed — these tables aren't in Prisma schema)
// ─────────────────────────────────────────────────────────────────────────────

async function upsertCampaign(accountId, c) {
  await prisma.$executeRaw`
    INSERT INTO campaigns (id, campaign_id, name, objective, status, ad_account_id, created_at, updated_at)
    VALUES (gen_random_uuid()::text, ${c.id}, ${c.name}, ${c.objective ?? null}, ${c.status}, ${accountId}, NOW(), NOW())
    ON CONFLICT (campaign_id) DO UPDATE
      SET name       = EXCLUDED.name,
          objective  = EXCLUDED.objective,
          status     = EXCLUDED.status,
          updated_at = NOW()
  `
}

async function upsertAdSet(s) {
  const targeting = s.targeting ? JSON.stringify(s.targeting) : '{}'
  await prisma.$executeRaw`
    INSERT INTO ad_sets (id, ad_set_id, name, status, campaign_id, daily_budget, targeting, created_at, updated_at)
    VALUES (gen_random_uuid()::text, ${s.id}, ${s.name}, ${s.status}, ${s.campaign_id}, ${s.daily_budget ?? 0}, ${targeting}::jsonb, NOW(), NOW())
    ON CONFLICT (ad_set_id) DO UPDATE
      SET name         = EXCLUDED.name,
          status       = EXCLUDED.status,
          daily_budget = EXCLUDED.daily_budget,
          targeting    = EXCLUDED.targeting,
          updated_at   = NOW()
  `
}

async function upsertAd(a) {
  await prisma.$executeRaw`
    INSERT INTO ads (id, ad_id, name, status, ad_set_id, creative_id, created_at, updated_at)
    VALUES (gen_random_uuid()::text, ${a.id}, ${a.name}, ${a.status}, ${a.adset_id}, ${a.creative?.id ?? null}, NOW(), NOW())
    ON CONFLICT (ad_id) DO UPDATE
      SET name       = EXCLUDED.name,
          status     = EXCLUDED.status,
          updated_at = NOW()
  `
}

async function upsertDailyMetric(adId, date, m) {
  const d = date instanceof Date ? date : new Date(date)
  await prisma.$executeRaw`
    INSERT INTO ad_daily_metrics
      (id, ad_id, date, spend, impressions, clicks, leads, purchases, revenue, roas, reach, cpm, cpc, frequency, cost_per_lead, cost_per_purchase, created_at)
    VALUES (
      gen_random_uuid()::text,
      ${adId}, ${d}::date,
      ${parseFloat(m.spend) || 0},
      ${parseInt(m.impressions) || 0},
      ${parseInt(m.inline_link_clicks ?? m.clicks) || 0},
      ${parseInt(m.leads) || 0},
      ${parseInt(m.purchases) || 0},
      ${parseFloat(m.purchase_roas?.[0]?.value ?? m.revenue) || 0},
      ${parseFloat(m.purchase_roas?.[0]?.value ? (parseFloat(m.spend) > 0 ? parseFloat(m.purchase_roas[0].value) : 0) : m.roas) || 0},
      ${parseInt(m.reach) || 0},
      ${parseFloat(m.cpm) || 0},
      ${parseFloat(m.cpc) || 0},
      ${parseFloat(m.frequency) || 0},
      ${parseFloat(m.cost_per_lead) || 0},
      ${parseFloat(m.cost_per_purchase ?? m.cost_per_result) || 0},
      NOW()
    )
    ON CONFLICT (ad_id, date) DO UPDATE
      SET spend                = EXCLUDED.spend,
          impressions          = EXCLUDED.impressions,
          clicks               = EXCLUDED.clicks,
          leads                = EXCLUDED.leads,
          purchases            = EXCLUDED.purchases,
          revenue              = EXCLUDED.revenue,
          roas                 = EXCLUDED.roas,
          reach                = EXCLUDED.reach,
          cpm                  = EXCLUDED.cpm,
          cpc                  = EXCLUDED.cpc,
          frequency            = EXCLUDED.frequency,
          cost_per_lead        = EXCLUDED.cost_per_lead,
          cost_per_purchase    = EXCLUDED.cost_per_purchase
  `
}

async function upsertLiveStatus(adId, isRunning) {
  await prisma.$executeRaw`
    INSERT INTO ad_live_status (id, ad_id, is_running_now, last_impression_time, updated_at)
    VALUES (gen_random_uuid()::text, ${adId}, ${isRunning}, NOW(), NOW())
    ON CONFLICT (ad_id) DO UPDATE
      SET is_running_now        = EXCLUDED.is_running_now,
          last_impression_time  = EXCLUDED.last_impression_time,
          updated_at            = NOW()
  `
}

async function upsertDailyDemographic(adId, date, m) {
  const d = date instanceof Date ? date : new Date(date)
  await prisma.$executeRaw`
    INSERT INTO ad_daily_demographics
      (id, ad_id, date, age, gender, spend, impressions, clicks, reach, revenue, created_at)
    VALUES (
      gen_random_uuid()::text,
      ${adId}, ${d}::date,
      ${m.age}, ${m.gender},
      ${parseFloat(m.spend) || 0},
      ${parseInt(m.impressions) || 0},
      ${parseInt(m.inline_link_clicks ?? m.clicks) || 0},
      ${parseInt(m.reach) || 0},
      ${parseFloat(m.purchase_roas?.[0]?.value ?? m.revenue) || 0},
      NOW()
    )
    ON CONFLICT (ad_id, date, age, gender) DO UPDATE
      SET spend       = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          clicks      = EXCLUDED.clicks,
          reach       = EXCLUDED.reach,
          revenue     = EXCLUDED.revenue
  `
}

async function upsertDailyPlacement(adId, date, m) {
  const d = date instanceof Date ? date : new Date(date)
  await prisma.$executeRaw`
    INSERT INTO ad_daily_placements
      (id, ad_id, date, platform, position, spend, impressions, clicks, reach, revenue, created_at)
    VALUES (
      gen_random_uuid()::text,
      ${adId}, ${d}::date,
      ${m.publisher_platform}, ${m.platform_position},
      ${parseFloat(m.spend) || 0},
      ${parseInt(m.impressions) || 0},
      ${parseInt(m.inline_link_clicks ?? m.clicks) || 0},
      ${parseInt(m.reach) || 0},
      ${parseFloat(m.purchase_roas?.[0]?.value ?? m.revenue) || 0},
      NOW()
    )
    ON CONFLICT (ad_id, date, platform, position) DO UPDATE
      SET spend       = EXCLUDED.spend,
          impressions = EXCLUDED.impressions,
          clicks      = EXCLUDED.clicks,
          reach       = EXCLUDED.reach,
          revenue     = EXCLUDED.revenue
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Main sync logic
// ─────────────────────────────────────────────────────────────────────────────

async function syncTenant(tenantId, accountId) {
  const redis = getRedis()
  const inflightKey = `sync:_inflight:${tenantId}`

  // Inflight guard (Gotcha #2) — TTL 10 min
  const alreadyRunning = await redis.set(inflightKey, '1', { nx: true, ex: 600 })
  if (!alreadyRunning) {
    return { skipped: true }
  }

  // M5: Use per-tenant fbPageToken if set; fall back to system-wide META_SYSTEM_USER_TOKEN
  let metaToken
  try {
    const tokens = await getTenantTokens(tenantId)
    metaToken = tokens.fbPageToken ?? undefined
  } catch {
    metaToken = undefined
  }

  try {
    // ── 1. Campaigns ──────────────────────────────────────────────
    const campaigns = await metaGetAll(`act_${accountId}/campaigns`, {
      fields: 'id,name,status,objective',
    }, metaToken)
    for (const c of campaigns) {
      await upsertCampaign(accountId, c)
    }

    // ── 2. AdSets ─────────────────────────────────────────────────
    const adSets = await metaGetAll(`act_${accountId}/adsets`, {
      fields: 'id,name,status,campaign_id,daily_budget,targeting',
    }, metaToken)
    for (const s of adSets) {
      await upsertAdSet(s)
    }

    // ── 3. Ads ────────────────────────────────────────────────────
    const ads = await metaGetAll(`act_${accountId}/ads`, {
      fields: 'id,name,status,adset_id,creative{id}',
    }, metaToken)
    for (const a of ads) {
      await upsertAd(a)
      await upsertLiveStatus(a.id, a.status === 'ACTIVE')
    }

    // ── 4. Daily insights (last 7d — overlapping window for attribution updates)
    const insightsData = await metaGetAll(`act_${accountId}/insights`, {
      fields: [
        'ad_id', 'date_start', 'spend', 'impressions', 'reach', 'frequency',
        'inline_link_clicks', 'cpm', 'cpc', 'leads', 'purchase_roas', 'cost_per_lead',
      ].join(','),
      date_preset: 'last_7d',
      level: 'ad',
      time_increment: 1,
    }, metaToken)
    for (const m of insightsData) {
      await upsertDailyMetric(m.ad_id, m.date_start, m)
    }

    // ── 5. Demographic breakdown (last 7d) ────────────────────────
    const demoData = await metaGetAll(`act_${accountId}/insights`, {
      fields: ['ad_id', 'date_start', 'spend', 'impressions', 'reach', 'inline_link_clicks', 'purchase_roas'].join(','),
      breakdowns: 'age,gender',
      date_preset: 'last_7d',
      level: 'ad',
      time_increment: 1,
    }, metaToken)
    for (const m of demoData) {
      await upsertDailyDemographic(m.ad_id, m.date_start, m)
    }

    // ── 6. Placement breakdown (last 7d) ──────────────────────────
    const placeData = await metaGetAll(`act_${accountId}/insights`, {
      fields: ['ad_id', 'date_start', 'spend', 'impressions', 'reach', 'inline_link_clicks', 'purchase_roas'].join(','),
      breakdowns: 'publisher_platform,platform_position',
      date_preset: 'last_7d',
      level: 'ad',
      time_increment: 1,
    }, metaToken)
    for (const m of placeData) {
      await upsertDailyPlacement(m.ad_id, m.date_start, m)
    }

    // ── 7. Clear Redis cache ──────────────────────────────────────
    await clearMarketingCache(tenantId)

    return {
      campaigns: campaigns.length,
      adSets:    adSets.length,
      ads:       ads.length,
      metrics:   insightsData.length,
      demographics: demoData.length,
      placements:   placeData.length,
    }
  } finally {
    await redis.del(inflightKey)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req) {
  // NFR3: Verify QStash signature
  const { isValid } = await verifyQStashSignature(req)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    // Load all ad accounts to sync
    const accounts = await prisma.$queryRaw`
      SELECT account_id, tenant_id::text AS "tenantId"
      FROM ad_accounts
      WHERE account_id IS NOT NULL
    `

    if (!accounts.length) {
      return NextResponse.json({ ok: true, synced: 0 })
    }

    const results = []
    for (const acc of accounts) {
      try {
        const r = await syncTenant(acc.tenantId, acc.account_id)
        results.push({ accountId: acc.account_id, ...r })
      } catch (err) {
        console.error(`[sync-hourly] account ${acc.account_id} failed:`, err.message)
        results.push({ accountId: acc.account_id, error: err.message })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('[sync-hourly]', error)
    throw error // NFR5: throw so QStash retries
  }
}
