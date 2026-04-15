// Created At: 2026-04-10 03:25:00 +07:00 (v1.0.0)
// Previous version: 2026-04-10 03:25:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-10 03:55:00 +07:00 (v1.1.0)

'use client'

/**
 * Marketing — Meta Ads Audit (M4 Feature C1)
 * ZDEV-TSK-20260410-015
 *
 * AI-assisted audit report UI:
 *  - range + campaign filter (forwarded to /api/marketing/ads-audit)
 *  - KPI row + severity-distribution mini-chart
 *  - priority-action cards (pause / refresh / budget / audience)
 *  - findings grid with visual BenchmarkGauge, severity filter + text search
 *  - skeleton loader for first load; regenerate button for MANAGER/DEV
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertTriangle, AlertCircle, Info, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, Target, Sparkles, PauseCircle, Wand2, Users, Loader2,
  Search, Filter, ChevronDown,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const RANGES = [
  { key: '7d',  label: '7 วัน'  },
  { key: '30d', label: '30 วัน' },
  { key: '90d', label: '90 วัน' },
]

const SEVERITY_STYLES = {
  critical: {
    card:     'bg-red-50/70 border-red-200',
    badge:    'bg-red-100 text-red-700 border border-red-200',
    icon:     AlertCircle,
    iconClr:  'text-red-600',
    label:    'Critical',
    barFill:  'bg-red-500',
    barLight: 'bg-red-200',
    hex:      '#ef4444',
  },
  warning: {
    card:     'bg-amber-50/70 border-amber-200',
    badge:    'bg-amber-100 text-amber-800 border border-amber-200',
    icon:     AlertTriangle,
    iconClr:  'text-amber-600',
    label:    'Warning',
    barFill:  'bg-amber-500',
    barLight: 'bg-amber-200',
    hex:      '#f59e0b',
  },
  info: {
    card:     'bg-sky-50/60 border-sky-200',
    badge:    'bg-sky-100 text-sky-700 border border-sky-200',
    icon:     Info,
    iconClr:  'text-sky-600',
    label:    'Info',
    barFill:  'bg-sky-500',
    barLight: 'bg-sky-200',
    hex:      '#0ea5e9',
  },
}

const ACTION_ICONS = {
  pause:            { icon: PauseCircle,  label: 'Pause',             color: 'text-red-600'    },
  refresh_creative: { icon: Wand2,        label: 'Refresh creative',  color: 'text-amber-600'  },
  adjust_audience:  { icon: Users,        label: 'Adjust audience',   color: 'text-purple-600' },
  budget_cut:       { icon: TrendingDown, label: 'Cut budget',        color: 'text-orange-600' },
  budget_boost:     { icon: TrendingUp,   label: 'Boost budget',      color: 'text-green-600'  },
  observe:          { icon: Info,         label: 'Observe',           color: 'text-gray-500'   },
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  if (n == null) return '—'
  return `฿${Number(n).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
}

function fmtNumber(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('th-TH')
}

function fmtBenchmark(value, unit) {
  if (value == null) return '—'
  if (unit === '%' || unit === 'x') return `${value}${unit}`
  if (unit === '฿') return `฿${value}`
  return String(value)
}

// ─── BenchmarkGauge — visual segmented bar with marker ────────────────────────
function BenchmarkGauge({ value, benchmark, severity }) {
  if (!benchmark || value == null) return null
  const { healthy, warning, critical, unit, higherIsBetter } = benchmark

  // Decide the bar domain [0 .. max]
  const numericValue = Number(value) || 0
  const max = Math.max(numericValue * 1.2, healthy * 1.6, critical * 1.3) || 1
  const clamp = (n) => Math.min(100, Math.max(0, (n / max) * 100))
  const markerPct = clamp(numericValue)

  // Build zone segments
  // For higher-is-better: [0..critical]=red, [critical..warning]=amber, [warning..healthy]=sky, [healthy..max]=green
  // For lower-is-better:  [0..healthy]=green, [healthy..warning]=sky, [warning..critical]=amber, [critical..max]=red
  let zones
  if (higherIsBetter) {
    zones = [
      { width: clamp(critical),           bg: 'bg-red-300'    },
      { width: clamp(warning) - clamp(critical), bg: 'bg-amber-300' },
      { width: clamp(healthy) - clamp(warning),  bg: 'bg-sky-300'   },
      { width: 100 - clamp(healthy),      bg: 'bg-green-300'  },
    ]
  } else {
    zones = [
      { width: clamp(healthy),            bg: 'bg-green-300'  },
      { width: clamp(warning) - clamp(healthy), bg: 'bg-sky-300'    },
      { width: clamp(critical) - clamp(warning), bg: 'bg-amber-300' },
      { width: 100 - clamp(critical),     bg: 'bg-red-300'    },
    ]
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-200/60">
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
        <span>
          <span className="font-semibold text-gray-700">{higherIsBetter ? 'Higher is better' : 'Lower is better'}</span>
        </span>
        <span>
          Target: <span className="font-semibold text-gray-700">{fmtBenchmark(healthy, unit)}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden flex">
        {zones.map((z, i) => (
          <div key={i} className={z.bg} style={{ width: `${Math.max(0, z.width)}%` }} />
        ))}
        {/* marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-0.5 bg-gray-900 rounded"
          style={{ left: `calc(${markerPct}% - 1px)` }}
          title={`Current: ${fmtBenchmark(numericValue.toFixed(2), unit)}`}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] mt-1">
        <span className="text-gray-400">0{unit === '%' ? '%' : ''}</span>
        <span className={`font-semibold ${SEVERITY_STYLES[severity]?.iconClr || 'text-gray-700'}`}>
          Current: {fmtBenchmark(numericValue.toFixed(2), unit)}
        </span>
        <span className="text-gray-400">{fmtBenchmark(max.toFixed(0), unit)}</span>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent = 'orange' }) {
  const accents = {
    orange: 'bg-orange-50 text-orange-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-lg ${accents[accent]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function SeverityPill({ severity }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info
  const Icon = style.icon
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.badge}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{style.label}</span>
    </div>
  )
}

// ─── SeverityDistribution — stacked bar across KPI row ────────────────────────
function SeverityDistribution({ summary }) {
  if (!summary) return null
  const total = (summary.criticalCount || 0) + (summary.warningCount || 0) + (summary.infoCount || 0)
  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Finding Distribution
        </div>
        <div className="text-sm text-gray-400">No findings in this period.</div>
      </div>
    )
  }

  const parts = [
    { key: 'critical', count: summary.criticalCount || 0, style: SEVERITY_STYLES.critical },
    { key: 'warning',  count: summary.warningCount  || 0, style: SEVERITY_STYLES.warning  },
    { key: 'info',     count: summary.infoCount     || 0, style: SEVERITY_STYLES.info     },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Finding Distribution</span>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
        {parts.map((p) => {
          const pct = total > 0 ? (p.count / total) * 100 : 0
          if (pct === 0) return null
          return <div key={p.key} className={p.style.barFill} style={{ width: `${pct}%` }} />
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${p.style.barFill}`} />
            <span className={p.style.iconClr + ' font-semibold'}>{p.count}</span>
            <span className="text-gray-400 capitalize">{p.key}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FindingCard ──────────────────────────────────────────────────────────────
function FindingCard({ finding }) {
  const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.info
  const Icon = style.icon
  const action = ACTION_ICONS[finding.action] || ACTION_ICONS.observe
  const ActionIcon = action.icon

  return (
    <div className={`rounded-xl border p-4 ${style.card}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.iconClr}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {finding.scope} · {finding.metric}
            </span>
            <SeverityPill severity={finding.severity} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate" title={finding.scopeName}>
            {finding.scopeName}
          </h3>
          <p className="text-sm text-gray-700 mb-2">{finding.message}</p>

          {finding.recommendation && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200/60">
              <ActionIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${action.color}`} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-800">{action.label}</div>
                <p className="text-sm text-gray-600">{finding.recommendation}</p>
              </div>
            </div>
          )}

          <BenchmarkGauge
            value={finding.value}
            benchmark={finding.benchmark}
            severity={finding.severity}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonBlock({ className = '' }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />
}

function AuditSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-6 w-6 rounded-lg" />
            </div>
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Priority actions skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-4/6" />
          </div>
        ))}
      </div>

      {/* Findings skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-4/5" />
            <SkeletonBlock className="h-2 w-full mt-3" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdsAuditPage() {
  const [range, setRange] = useState('30d')
  const [campaignId, setCampaignId] = useState('all')
  const [campaigns, setCampaigns] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [regenerating, setRegenerating] = useState(false)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Fetch campaigns for dropdown ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadCampaigns() {
      try {
        const res = await fetch(`/api/marketing/campaigns?range=${range}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setCampaigns(data)
      } catch (err) {
        console.error('[AdsAudit] campaigns fetch failed:', err)
      }
    }
    loadCampaigns()
    return () => { cancelled = true }
  }, [range])

  // ── Fetch audit report ──────────────────────────────────────────────────────
  const fetchReport = useCallback(async ({ regenerate = false } = {}) => {
    if (regenerate) setRegenerating(true)
    else setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ range })
      if (campaignId && campaignId !== 'all') params.set('campaignId', campaignId)
      if (regenerate) params.set('regenerate', 'true')
      const res = await fetch(`/api/marketing/ads-audit?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error('[AdsAudit] fetch failed:', err)
      setError(err.message || 'Failed to load audit report')
    } finally {
      setLoading(false)
      setRegenerating(false)
    }
  }, [range, campaignId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const summary = report?.summary
  const findings = report?.findings || []
  const recommendations = report?.recommendations || {}

  const filteredFindings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return findings.filter((f) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false
      if (q && !f.scopeName?.toLowerCase().includes(q) && !f.metric?.toLowerCase().includes(q)) return false
      return true
    })
  }, [findings, severityFilter, searchQuery])

  const showSkeleton = loading && !report

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
            Meta Ads Audit
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-assisted review of campaign performance, quality signals and budget allocation.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Campaign filter */}
          <div className="relative">
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400 max-w-[200px]"
            >
              <option value="all">All campaigns ({campaigns.length})</option>
              {campaigns.map((c) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Range switcher */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  range === r.key
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Regenerate */}
          <button
            onClick={() => fetchReport({ regenerate: true })}
            disabled={regenerating || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </button>
        </div>
      </div>

      {/* Narrative */}
      {report?.narrative && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Executive Summary
            </span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed">{report.narrative}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => fetchReport()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Skeleton during initial load */}
      {showSkeleton && <AuditSkeleton />}

      {/* Summary KPI row */}
      {!showSkeleton && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total Spend"
            value={fmtCurrency(summary.totalSpend)}
            sub={`${fmtNumber(summary.adsAudited)} ads audited`}
            icon={DollarSign}
            accent="orange"
          />
          <KpiCard
            label="Revenue"
            value={fmtCurrency(summary.totalRevenue)}
            sub={`${fmtNumber(summary.totalLeads)} leads`}
            icon={TrendingUp}
            accent="green"
          />
          <KpiCard
            label="Overall ROAS"
            value={`${Number(summary.overallRoas || 0).toFixed(2)}x`}
            sub={`CTR ${Number(summary.overallCtr || 0).toFixed(2)}%`}
            icon={Target}
            accent="blue"
          />
          <KpiCard
            label="Findings"
            value={`${summary.criticalCount + summary.warningCount}`}
            sub={`${summary.criticalCount} critical · ${summary.warningCount} warning`}
            icon={AlertTriangle}
            accent="purple"
          />
        </div>
      )}

      {/* Severity distribution */}
      {!showSkeleton && summary && <SeverityDistribution summary={summary} />}

      {/* Priority actions */}
      {!showSkeleton && report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RecoCard
            title="Pause now"
            icon={PauseCircle}
            color="red"
            items={recommendations.pauseList || []}
          />
          <RecoCard
            title="Refresh creative"
            icon={Wand2}
            color="amber"
            items={recommendations.refreshCreative || []}
          />
          <RecoCard
            title="Budget adjust"
            icon={DollarSign}
            color="orange"
            items={(recommendations.budgetAdjust || []).map((r) => ({
              adId: r.adId,
              name: r.name,
              reason: `${r.direction === 'increase' ? '↑ Boost' : '↓ Reduce'} — ${r.reason}`,
            }))}
          />
          <RecoCard
            title="Audience tuning"
            icon={Users}
            color="purple"
            items={recommendations.audienceAdjust || []}
          />
        </div>
      )}

      {/* Findings section */}
      {!showSkeleton && report && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              All findings
              <span className="text-sm text-gray-400 font-normal">({filteredFindings.length})</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ad or metric…"
                  className="h-8 pl-8 pr-3 w-56 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              {/* Severity filter */}
              <div className="flex gap-1 text-xs">
                {['all', 'critical', 'warning', 'info'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize ${
                      severityFilter === s
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredFindings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              {findings.length === 0
                ? 'No audit findings — either no active ads or everything is within healthy range.'
                : 'No findings match this filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFindings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer metadata */}
      {!showSkeleton && report?.generatedAt && (
        <div className="text-xs text-gray-400 text-center pt-2">
          Generated {new Date(report.generatedAt).toLocaleString('th-TH')} · cached for 15 min
        </div>
      )}
    </div>
  )
}

// ─── Recommendation summary card ──────────────────────────────────────────────
function RecoCard({ title, icon: Icon, color, items }) {
  const colors = {
    red:    'bg-red-50 border-red-200 text-red-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto text-xs font-bold bg-white/70 rounded-full px-2 py-0.5">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs opacity-70">None</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {items.slice(0, 4).map((item) => (
            <li key={item.adId} className="truncate" title={item.name}>
              • {item.name}
            </li>
          ))}
          {items.length > 4 && (
            <li className="opacity-60">+{items.length - 4} more</li>
          )}
        </ul>
      )}
    </div>
  )
}
