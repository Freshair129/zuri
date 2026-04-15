// Created At: 2026-04-10 03:10:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:10:00 +07:00 (v1.0.0)

/**
 * adsAuditor — Automated Meta Ads Performance Audit
 * M4 Feature C1 (ZDEV-TSK-20260410-015)
 *
 * Analyses AdDailyMetric rows against SME quality benchmarks and produces
 * severity-tagged findings plus actionable recommendations. Optionally
 * enriches the report with a Gemini Flash narrative summary.
 *
 * Design notes:
 * - Rule-based core so the audit runs without AI credits and is testable.
 * - Gemini Flash is used only for the executive summary string (best-effort).
 * - Metrics are sourced via marketingRepo — no direct Prisma or Meta calls.
 * - Results are cached in Redis for 15 minutes; use { regenerate: true } to bypass.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getOrSet, getRedis } from '@/lib/redis'
import {
  getCampaigns,
  getAdSetsForCampaign,
  getAdsForAdSet,
} from '@/lib/repositories/marketingRepo'

// ─── Benchmarks ────────────────────────────────────────────────────────────────
// Thai SME culinary-school defaults. Override via options.benchmarks for other
// verticals. Values derived from Zuri pilot-tenant aggregates + Meta industry
// medians for Education/SEA region.
export const DEFAULT_BENCHMARKS = Object.freeze({
  ctr:       { healthy: 1.5,  warning: 0.8,  critical: 0.4,  unit: '%',    higherIsBetter: true  },
  roas:      { healthy: 3.0,  warning: 1.5,  critical: 1.0,  unit: 'x',    higherIsBetter: true  },
  frequency: { healthy: 2.5,  warning: 4.0,  critical: 5.0,  unit: '',     higherIsBetter: false },
  cpc:       { healthy: 15,   warning: 30,   critical: 60,   unit: '฿',    higherIsBetter: false },
  cpm:       { healthy: 150,  warning: 300,  critical: 500,  unit: '฿',    higherIsBetter: false },
  cpl:       { healthy: 80,   warning: 200,  critical: 400,  unit: '฿',    higherIsBetter: false },
})

const MIN_AUDIT_SPEND    = 100   // ฿ — skip findings on noise-level spend
const MIN_AUDIT_IMPRS    = 1000  // skip if impressions too low for stat significance
const CACHE_TTL_SECONDS  = 900   // 15 min

// ─── Benchmark evaluation ─────────────────────────────────────────────────────
/**
 * Compare a metric value against benchmark bands.
 * Returns { severity: 'healthy'|'info'|'warning'|'critical', band }
 */
export function evaluateMetric(metric, value, benchmarks = DEFAULT_BENCHMARKS) {
  const b = benchmarks[metric]
  if (!b || value === null || value === undefined || Number.isNaN(value)) {
    return { severity: 'info', band: null }
  }

  if (b.higherIsBetter) {
    if (value >= b.healthy)  return { severity: 'healthy',  band: 'healthy'  }
    if (value >= b.warning)  return { severity: 'info',     band: 'info'     }
    if (value >= b.critical) return { severity: 'warning',  band: 'warning'  }
    return                         { severity: 'critical', band: 'critical' }
  }
  // lower is better
  if (value <= b.healthy)  return { severity: 'healthy',  band: 'healthy'  }
  if (value <= b.warning)  return { severity: 'info',     band: 'info'     }
  if (value <= b.critical) return { severity: 'warning',  band: 'warning'  }
  return                         { severity: 'critical', band: 'critical' }
}

// ─── Finding & recommendation builders ────────────────────────────────────────
function fmtMetric(metric, value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const b = DEFAULT_BENCHMARKS[metric]
  if (!b) return String(value)
  if (b.unit === '฿')  return `฿${Number(value).toFixed(2)}`
  if (b.unit === '%')  return `${Number(value).toFixed(2)}%`
  if (b.unit === 'x')  return `${Number(value).toFixed(2)}x`
  return Number(value).toFixed(2)
}

function buildFinding({ scope, scopeId, scopeName, metric, value, severity, message, recommendation, action }) {
  const b = DEFAULT_BENCHMARKS[metric]
  return {
    id: `${scope}:${scopeId}:${metric}`,
    scope,
    scopeId,
    scopeName,
    severity,
    metric,
    value,
    valueFormatted: fmtMetric(metric, value),
    benchmark: b
      ? {
          healthy: b.healthy,
          warning: b.warning,
          critical: b.critical,
          unit: b.unit,
          higherIsBetter: b.higherIsBetter,
        }
      : null,
    message,
    recommendation,
    action,
  }
}

/**
 * Evaluate a single ad (or aggregated scope) and produce findings.
 * Row must expose the derived metrics calcDerived() adds in marketingRepo:
 *   { spend, impressions, clicks, leads, revenue, ctr, cpc, cpl, roas, cpm, reach? }
 * plus frequency if available (impressions / reach when reach > 0).
 */
export function auditRow(row, { scope, scopeId, scopeName, benchmarks = DEFAULT_BENCHMARKS } = {}) {
  const findings = []
  const spend = Number(row.spend) || 0
  const impressions = Number(row.impressions) || 0

  if (spend < MIN_AUDIT_SPEND || impressions < MIN_AUDIT_IMPRS) {
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'spend',
      value: spend,
      severity: 'info',
      message: `Not enough data yet (spend ฿${spend.toFixed(0)}, ${impressions.toLocaleString()} impressions).`,
      recommendation: 'Let this run for another 2–3 days before auditing, or merge with a similar ad set.',
      action: 'observe',
    }))
    return findings
  }

  const reach = Number(row.reach) || 0
  const frequency = reach > 0 ? +(impressions / reach).toFixed(2) : null

  // 1. ROAS — the headline metric
  const roas = Number(row.roas) || 0
  const roasEval = evaluateMetric('roas', roas, benchmarks)
  if (roasEval.severity !== 'healthy') {
    const critical = roasEval.severity === 'critical'
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'roas',
      value: roas,
      severity: roasEval.severity,
      message: critical
        ? `ROAS ${fmtMetric('roas', roas)} is burning budget (benchmark ≥${benchmarks.roas.healthy}x).`
        : `ROAS ${fmtMetric('roas', roas)} is below target ≥${benchmarks.roas.healthy}x.`,
      recommendation: critical
        ? 'Pause and re-evaluate targeting + creative. Reallocate budget to top ROAS ad.'
        : 'Trim budget by 20–30% and test a new headline or offer.',
      action: critical ? 'pause' : 'budget_cut',
    }))
  }

  // 2. CTR — creative/relevance health
  const ctr = Number(row.ctr) || 0
  const ctrEval = evaluateMetric('ctr', ctr, benchmarks)
  if (ctrEval.severity !== 'healthy' && ctrEval.severity !== 'info') {
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'ctr',
      value: ctr,
      severity: ctrEval.severity,
      message: `CTR ${fmtMetric('ctr', ctr)} signals weak creative-audience fit (benchmark ≥${benchmarks.ctr.healthy}%).`,
      recommendation: 'Refresh the hook image / first line of the caption. Try a student testimonial or a course outcome photo.',
      action: 'refresh_creative',
    }))
  }

  // 3. Frequency — creative fatigue
  if (frequency !== null) {
    const freqEval = evaluateMetric('frequency', frequency, benchmarks)
    if (freqEval.severity === 'warning' || freqEval.severity === 'critical') {
      findings.push(buildFinding({
        scope, scopeId, scopeName,
        metric: 'frequency',
        value: frequency,
        severity: freqEval.severity,
        message: `Frequency ${frequency.toFixed(2)} — audience is seeing this ad too often (creative fatigue).`,
        recommendation: 'Rotate creative or broaden the audience. Exclude recent engagers for 14 days.',
        action: 'refresh_creative',
      }))
    }
  }

  // 4. CPC — bid/auction efficiency
  const cpc = Number(row.cpc) || 0
  const cpcEval = evaluateMetric('cpc', cpc, benchmarks)
  if (cpcEval.severity === 'critical') {
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'cpc',
      value: cpc,
      severity: 'warning',
      message: `CPC ${fmtMetric('cpc', cpc)} is high — either CTR is low or the audience is too competitive.`,
      recommendation: 'Narrow interest targeting or switch to a Lookalike (1–3%) of past enrolees.',
      action: 'adjust_audience',
    }))
  }

  // 5. CPM — audience saturation / pricing
  const cpm = Number(row.cpm) || 0
  const cpmEval = evaluateMetric('cpm', cpm, benchmarks)
  if (cpmEval.severity === 'critical') {
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'cpm',
      value: cpm,
      severity: 'warning',
      message: `CPM ${fmtMetric('cpm', cpm)} is unusually high — audience may be saturated or too narrow.`,
      recommendation: 'Broaden age range by ±5 years or add 1–2 adjacent interests to reduce competition.',
      action: 'adjust_audience',
    }))
  }

  // 6. Cost per Lead — bottom-funnel efficiency
  const cpl = Number(row.cpl) || 0
  if (cpl > 0) {
    const cplEval = evaluateMetric('cpl', cpl, benchmarks)
    if (cplEval.severity === 'warning' || cplEval.severity === 'critical') {
      findings.push(buildFinding({
        scope, scopeId, scopeName,
        metric: 'cpl',
        value: cpl,
        severity: cplEval.severity,
        message: `Cost per lead ${fmtMetric('cpl', cpl)} is above target ≤฿${benchmarks.cpl.healthy}.`,
        recommendation: 'Add a clearer CTA and qualify leads earlier in the LINE/Facebook form.',
        action: 'refresh_creative',
      }))
    }
  }

  // 7. Top performer — info-level kudos, used to trigger budget reallocation
  if (roasEval.severity === 'healthy' && ctrEval.severity === 'healthy' && spend >= MIN_AUDIT_SPEND * 3) {
    findings.push(buildFinding({
      scope, scopeId, scopeName,
      metric: 'roas',
      value: roas,
      severity: 'info',
      message: `Top performer — ROAS ${fmtMetric('roas', roas)} with CTR ${fmtMetric('ctr', ctr)}.`,
      recommendation: 'Increase daily budget by 15–20% and clone into a Lookalike audience.',
      action: 'budget_boost',
    }))
  }

  return findings
}

// ─── Report orchestration ─────────────────────────────────────────────────────
function emptySummary() {
  return {
    totalSpend: 0,
    totalRevenue: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalLeads: 0,
    overallRoas: 0,
    overallCtr: 0,
    adsAudited: 0,
    criticalCount: 0,
    warningCount: 0,
    infoCount: 0,
  }
}

function rollupRecommendations(findings) {
  const pauseList = []
  const refreshCreative = []
  const budgetAdjust = []
  const audienceAdjust = []

  for (const f of findings) {
    if (f.scope !== 'ad') continue
    switch (f.action) {
      case 'pause':
        pauseList.push({ adId: f.scopeId, name: f.scopeName, reason: f.message })
        break
      case 'refresh_creative':
        refreshCreative.push({ adId: f.scopeId, name: f.scopeName, reason: f.message })
        break
      case 'budget_cut':
      case 'budget_boost':
        budgetAdjust.push({
          adId: f.scopeId,
          name: f.scopeName,
          direction: f.action === 'budget_cut' ? 'decrease' : 'increase',
          reason: f.message,
        })
        break
      case 'adjust_audience':
        audienceAdjust.push({ adId: f.scopeId, name: f.scopeName, reason: f.message })
        break
      default:
        break
    }
  }

  // Dedupe by adId — keep first reason
  const dedupe = (arr) => {
    const seen = new Set()
    return arr.filter((x) => {
      if (seen.has(x.adId)) return false
      seen.add(x.adId)
      return true
    })
  }

  return {
    pauseList: dedupe(pauseList),
    refreshCreative: dedupe(refreshCreative),
    budgetAdjust: dedupe(budgetAdjust),
    audienceAdjust: dedupe(audienceAdjust),
  }
}

// ─── Optional Gemini narrative enrichment ─────────────────────────────────────
async function generateNarrative(summary, findings) {
  if (!process.env.GEMINI_API_KEY) return null
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const topFindings = findings
      .filter((f) => f.severity === 'critical' || f.severity === 'warning')
      .slice(0, 8)
      .map((f) => `- [${f.severity}] ${f.scopeName}: ${f.message}`)
      .join('\n')

    const prompt = `You are a marketing analyst for a Thai culinary-school SME. Write a 3-sentence executive summary (in Thai) of this Meta Ads audit.
Be direct, specific, and action-oriented. Do not use emojis.

KPI summary:
- Spend: ฿${summary.totalSpend.toFixed(0)}
- Revenue: ฿${summary.totalRevenue.toFixed(0)}
- ROAS: ${summary.overallRoas.toFixed(2)}x
- CTR: ${summary.overallCtr.toFixed(2)}%
- Ads audited: ${summary.adsAudited}
- Findings: ${summary.criticalCount} critical, ${summary.warningCount} warning

Top issues:
${topFindings || '(none)'}`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('[adsAuditor] Narrative generation failed:', error.message)
    return null
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────
/**
 * Run an audit for a tenant over a range.
 * @param {string} tenantId
 * @param {object} options
 * @param {string}  [options.range='30d']  '7d' | '30d' | '90d'
 * @param {string}  [options.campaignId]    Narrow to one campaign (optional)
 * @param {boolean} [options.regenerate]    Bypass cache
 * @param {boolean} [options.withNarrative=true] Call Gemini for summary text
 * @param {object}  [options.benchmarks]    Override benchmarks
 * @returns {Promise<AuditReport>}
 */
export async function auditAds(tenantId, options = {}) {
  if (!tenantId) throw new Error('tenantId is required')
  const {
    range = '30d',
    campaignId = null,
    regenerate = false,
    withNarrative = true,
    benchmarks = DEFAULT_BENCHMARKS,
  } = options

  const cacheKey = `marketing:ads-audit:${tenantId}:${range}:${campaignId ?? 'all'}`
  if (regenerate) {
    const r = getRedis()
    if (r) {
      try { await r.del(cacheKey) } catch (e) { /* ignore */ }
    }
  }

  return getOrSet(
    cacheKey,
    async () => {
      const summary = emptySummary()
      const findings = []

      // 1. Pull campaigns (already aggregated + calcDerived in marketingRepo)
      let campaigns = await getCampaigns(tenantId, { range })
      if (campaignId) campaigns = campaigns.filter((c) => c.campaignId === campaignId)

      if (campaigns.length === 0) {
        return {
          tenantId,
          range,
          generatedAt: new Date().toISOString(),
          summary,
          findings: [],
          recommendations: rollupRecommendations([]),
          narrative: null,
        }
      }

      // 2. Campaign-level roll-up + drill-down per campaign
      for (const camp of campaigns) {
        summary.totalSpend       += Number(camp.spend) || 0
        summary.totalRevenue     += Number(camp.revenue) || 0
        summary.totalImpressions += Number(camp.impressions) || 0
        summary.totalClicks      += Number(camp.clicks) || 0
        summary.totalLeads       += Number(camp.leads) || 0

        // Campaign-scope ROAS finding (critical only, for visibility)
        const campRoasEval = evaluateMetric('roas', Number(camp.roas) || 0, benchmarks)
        if (campRoasEval.severity === 'critical' && Number(camp.spend) >= MIN_AUDIT_SPEND) {
          findings.push(buildFinding({
            scope: 'campaign',
            scopeId: camp.campaignId,
            scopeName: camp.name,
            metric: 'roas',
            value: Number(camp.roas) || 0,
            severity: 'critical',
            message: `Campaign "${camp.name}" overall ROAS is ${fmtMetric('roas', camp.roas)}.`,
            recommendation: 'Review underperforming ads below and pause the weakest before adding budget.',
            action: 'pause',
          }))
        }

        // Drill into ad sets → ads (repo already scopes by tenant + joins)
        const adSets = await getAdSetsForCampaign(tenantId, camp.campaignId, range)
        for (const adSet of adSets) {
          const ads = await getAdsForAdSet(tenantId, adSet.adSetId, range)
          for (const ad of ads) {
            const adFindings = auditRow(ad, {
              scope: 'ad',
              scopeId: ad.adId,
              scopeName: ad.name,
              benchmarks,
            })
            if (adFindings.length > 0) summary.adsAudited += 1
            findings.push(...adFindings)
          }
        }
      }

      // 3. Derive aggregate KPIs
      summary.overallRoas = summary.totalSpend > 0
        ? +(summary.totalRevenue / summary.totalSpend).toFixed(2)
        : 0
      summary.overallCtr = summary.totalImpressions > 0
        ? +((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2)
        : 0
      summary.criticalCount = findings.filter((f) => f.severity === 'critical').length
      summary.warningCount  = findings.filter((f) => f.severity === 'warning').length
      summary.infoCount     = findings.filter((f) => f.severity === 'info').length

      // 4. Sort findings: critical → warning → info, then by spend
      const order = { critical: 0, warning: 1, info: 2 }
      findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9))

      // 5. Group into actionable recommendations
      const recommendations = rollupRecommendations(findings)

      // 6. Optional AI narrative
      const narrative = withNarrative
        ? await generateNarrative(summary, findings)
        : null

      return {
        tenantId,
        range,
        campaignId,
        generatedAt: new Date().toISOString(),
        summary,
        findings,
        recommendations,
        narrative,
      }
    },
    CACHE_TTL_SECONDS,
  )
}
