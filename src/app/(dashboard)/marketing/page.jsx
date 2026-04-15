'use client'

/**
 * Marketing Dashboard — core/marketing (FEAT09)
 * Executive overview: KPI cards, spend vs revenue chart, hourly heatmap,
 * top campaigns table. All data from /api/marketing/* — never direct Meta API.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, LineChart,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink,
  DollarSign, MousePointerClick, Eye, Users, Zap, Target,
  Radio, Pause, AlertTriangle, Calendar, Megaphone, Phone,
} from 'lucide-react'

const RANGES = ['7d', '30d', '90d']
const RANGE_LABELS = { '7d': '7 วัน', '30d': '30 วัน', '90d': '90 วัน' }
const DOW_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function fmt(n, { type = 'number', decimals = 0 } = {}) {
  if (n == null) return '—'
  if (type === 'currency') return `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals })}`
  if (type === 'pct')      return `${Number(n).toFixed(decimals)}%`
  if (type === 'x')        return `${Number(n).toFixed(decimals)}x`
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals })
}

function ChangeChip({ value }) {
  if (value == null) return <span className="text-gray-400 text-xs">—</span>
  const up = value > 0
  const Icon = up ? TrendingUp : value < 0 ? TrendingDown : Minus
  const color = up ? 'text-green-600 bg-green-50' : value < 0 ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, value, change, icon: Icon, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    pink:   'bg-pink-50 text-pink-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`p-1.5 rounded-lg ${colors[color]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <ChangeChip value={change} />
    </div>
  )
}

function StatusBadge({ status }) {
  const map = { ACTIVE:'bg-green-100 text-green-700', PAUSED:'bg-yellow-100 text-yellow-700', ARCHIVED:'bg-gray-100 text-gray-500' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>{status}</span>
}

// ─────────────────────────────────────────────────────────────────────
// Calendar helpers (Mon-first week)
// ─────────────────────────────────────────────────────────────────────

const DOW_LABELS_FULL = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function dateOnlyISO(d) {
  return new Date(d).toISOString().slice(0, 10)
}
function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d) // local time, midnight
}
function startOfMonWeek(d) {
  const out = new Date(d)
  const dow = out.getDay() // 0=Sun..6=Sat
  const diff = (dow + 6) % 7 // 0 if Mon, 6 if Sun
  out.setDate(out.getDate() - diff)
  out.setHours(0, 0, 0, 0)
  return out
}
function addDays(d, n) {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

/**
 * Split an ad's spend days into contiguous "runs".
 * Returns [{ start: Date, end: Date, days: number, totalSpend: number }, ...]
 */
function adRuns(ad) {
  const days = Object.keys(ad.dailySpend ?? {})
    .filter((k) => (ad.dailySpend[k] || 0) > 0)
    .sort()
  if (days.length === 0) return []
  const runs = []
  let runStart = parseISODate(days[0])
  let runEnd = runStart
  let runSum = ad.dailySpend[days[0]]

  for (let i = 1; i < days.length; i++) {
    const cur = parseISODate(days[i])
    if (daysBetween(runEnd, cur) === 1) {
      runEnd = cur
      runSum += ad.dailySpend[days[i]]
    } else {
      runs.push({ start: runStart, end: runEnd, days: daysBetween(runStart, runEnd) + 1, totalSpend: runSum })
      runStart = cur
      runEnd = cur
      runSum = ad.dailySpend[days[i]]
    }
  }
  runs.push({ start: runStart, end: runEnd, days: daysBetween(runStart, runEnd) + 1, totalSpend: runSum })
  return runs
}

/**
 * Greedy lane assignment so bars don't visually overlap.
 * Returns Map<adId, laneIndex>.
 */
function assignLanes(ads) {
  const sorted = [...ads].sort((a, b) => {
    if (a.firstSpend !== b.firstSpend) return a.firstSpend < b.firstSpend ? -1 : 1
    return (b.totalSpend || 0) - (a.totalSpend || 0)
  })
  const lanes = [] // each entry = end-date Date object
  const map = new Map()
  for (const ad of sorted) {
    const start = parseISODate(ad.firstSpend)
    const end = parseISODate(ad.lastSpend)
    let placed = false
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] < start) {
        lanes[i] = end
        map.set(ad.adId, i)
        placed = true
        break
      }
    }
    if (!placed) {
      lanes.push(end)
      map.set(ad.adId, lanes.length - 1)
    }
  }
  return { laneMap: map, totalLanes: lanes.length }
}

/**
 * Pick a color for an ad bar based on status.
 * Returns Tailwind classes string.
 */
function adBarClasses(ad, palette) {
  if (ad.status === 'ACTIVE') return 'bg-emerald-500 hover:bg-emerald-600 text-white'
  if (ad.status === 'PAUSED') return palette  // alternate blue/pink for visual variety
  return 'bg-gray-300 hover:bg-gray-400 text-gray-700'
}

const PAUSED_PALETTES = [
  'bg-sky-500 hover:bg-sky-600 text-white',
  'bg-fuchsia-500 hover:bg-fuchsia-600 text-white',
  'bg-indigo-500 hover:bg-indigo-600 text-white',
  'bg-rose-500 hover:bg-rose-600 text-white',
]

/**
 * SummaryCard — single KPI card matching the calendar header design.
 */
function SummaryCard({ label, value, sub, icon: Icon, tone }) {
  const tones = {
    green:  { bg: 'bg-emerald-50',  ring: 'ring-emerald-200', icon: 'text-emerald-600 bg-emerald-100', text: 'text-emerald-900' },
    purple: { bg: 'bg-violet-50',   ring: 'ring-violet-200',  icon: 'text-violet-600 bg-violet-100',   text: 'text-violet-900' },
    yellow: { bg: 'bg-amber-50',    ring: 'ring-amber-200',   icon: 'text-amber-600 bg-amber-100',     text: 'text-amber-900' },
    red:    { bg: 'bg-rose-50',     ring: 'ring-rose-200',    icon: 'text-rose-600 bg-rose-100',       text: 'text-rose-900' },
  }
  const t = tones[tone] || tones.green
  return (
    <div className={`${t.bg} ring-1 ${t.ring} rounded-2xl p-4 flex items-start gap-3`}>
      <div className={`${t.icon} h-10 w-10 rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${t.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/**
 * CalendarSummaryCards — 4 KPI cards (top of marketing page).
 * Stays full-width even when the calendar grid is moved next to the heatmap.
 */
function CalendarSummaryCards({ data, live, loading }) {
  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }
  const summary = data?.summary ?? { adsWithSpend: 0, totalSpend: 0, totalImpressions: 0 }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        label="DELIVERING NOW"
        value={`${live?.delivering ?? 0} ●`}
        sub="ACTIVE · Spend ≥ Yesterday"
        icon={Phone}
        tone="green"
      />
      <SummaryCard
        label="ADS WITH SPEND"
        value={summary.adsWithSpend}
        sub={`Unique ads in ${data?.range ?? '7d'}`}
        icon={Megaphone}
        tone="purple"
      />
      <SummaryCard
        label="IMPRESSIONS"
        value={(summary.totalImpressions ?? 0).toLocaleString('en-US')}
        sub="Total this period"
        icon={Eye}
        tone="yellow"
      />
      <SummaryCard
        label="ACTUAL SPEND"
        value={`฿${(summary.totalSpend ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`}
        sub="Facebook billing data"
        icon={DollarSign}
        tone="red"
      />
    </div>
  )
}

/**
 * AdCalendarGrid — Google Calendar-style view of ad delivery.
 * Compact mode for sitting next to the Hourly Spend Heatmap.
 */
function AdCalendarGrid({ data, loading }) {
  // Compact sizing so it fits comfortably at half-page width
  const LANE_HEIGHT = 18
  const LANE_GAP    = 3
  const HEADER_PAD  = 22

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-52 bg-gray-50 rounded animate-pulse" />
      </div>
    )
  }

  const ads = data?.ads ?? []
  const winStart = data?.windowStart ? parseISODate(data.windowStart) : new Date()
  const winEnd   = data?.windowEnd   ? parseISODate(data.windowEnd)   : new Date()
  const calStart = startOfMonWeek(winStart)
  const calEnd   = addDays(startOfMonWeek(winEnd), 6)

  const weeks = []
  for (let cur = new Date(calStart); cur <= calEnd; cur = addDays(cur, 7)) {
    weeks.push(new Date(cur))
  }

  const { laneMap } = assignLanes(ads)
  const adRunsCache = new Map()
  for (const ad of ads) adRunsCache.set(ad.adId, adRuns(ad))

  const renderWeek = (weekStart) => {
    const weekEnd = addDays(weekStart, 6)
    const segments = []
    for (const ad of ads) {
      const runs = adRunsCache.get(ad.adId) ?? []
      for (const run of runs) {
        const segStart = run.start > weekStart ? run.start : weekStart
        const segEnd   = run.end   < weekEnd   ? run.end   : weekEnd
        if (segStart > segEnd) continue
        const dayStart = daysBetween(weekStart, segStart)
        const span     = daysBetween(segStart, segEnd) + 1
        let spendInSegment = 0
        for (let d = new Date(segStart); d <= segEnd; d = addDays(d, 1)) {
          spendInSegment += ad.dailySpend?.[dateOnlyISO(d)] ?? 0
        }
        segments.push({ ad, lane: laneMap.get(ad.adId) ?? 0, dayStart, span, spendInSegment })
      }
    }
    return segments
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-orange-500" />
          ปฏิทินการนำส่งโฆษณา
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm bg-emerald-500" />Delivering
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-sm bg-sky-500" />Paused
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 overflow-hidden">
        {/* Day headers — compact (1 letter) */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="px-2 py-1.5 text-[10px] font-bold text-gray-500 tracking-wider text-center">
              {d}
            </div>
          ))}
        </div>

        {ads.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            ไม่มีโฆษณาที่นำส่งในช่วงนี้
          </div>
        ) : (
          weeks.map((weekStart, wIdx) => {
            const segments = renderWeek(weekStart)
            const maxLaneInWeek = segments.reduce((m, s) => Math.max(m, s.lane), -1)
            const laneCount = maxLaneInWeek + 1
            const rowHeight = HEADER_PAD + Math.max(1, laneCount) * (LANE_HEIGHT + LANE_GAP) + 6
            let pausedColorIdx = 0
            const pausedColorMap = new Map()
            for (const seg of segments) {
              if (seg.ad.status === 'PAUSED' && !pausedColorMap.has(seg.ad.adId)) {
                pausedColorMap.set(seg.ad.adId, PAUSED_PALETTES[pausedColorIdx % PAUSED_PALETTES.length])
                pausedColorIdx++
              }
            }
            return (
              <div
                key={wIdx}
                className="relative grid grid-cols-7 border-t border-gray-100"
                style={{ height: rowHeight }}
              >
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = addDays(weekStart, di)
                  const inWindow = day >= winStart && day <= winEnd
                  return (
                    <div
                      key={di}
                      className={`border-r border-gray-100 last:border-r-0 ${inWindow ? '' : 'bg-gray-50/60'}`}
                    >
                      <div className="px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">
                        {day.getDate()}
                      </div>
                    </div>
                  )
                })}

                <div className="absolute inset-0" style={{ paddingTop: HEADER_PAD }}>
                  {segments.map((seg, idx) => {
                    const left  = (seg.dayStart / 7) * 100
                    const width = (seg.span / 7) * 100
                    const top   = seg.lane * (LANE_HEIGHT + LANE_GAP)
                    const palette = pausedColorMap.get(seg.ad.adId) ?? PAUSED_PALETTES[0]
                    const cls = adBarClasses(seg.ad, palette)
                    return (
                      <div
                        key={`${seg.ad.adId}-${idx}`}
                        className={`absolute rounded text-[9px] font-semibold flex items-center px-1.5 truncate transition-colors cursor-pointer ${cls}`}
                        style={{
                          left:   `calc(${left}% + 1px)`,
                          width:  `calc(${width}% - 2px)`,
                          top,
                          height: LANE_HEIGHT,
                        }}
                        title={`${seg.ad.name} · ฿${seg.spendInSegment.toFixed(0)} (${seg.span} วัน)`}
                      >
                        <span className="truncate flex-1">{seg.ad.name}</span>
                        {seg.span >= 3 && (
                          <span className="ml-1 opacity-90 tabular-nums">฿{Math.round(seg.spendInSegment)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * LiveTrackingBanner — shows count of ads currently delivering vs paused/idle.
 * Data from /api/marketing/dashboard → response.live
 */
function LiveTrackingBanner({ live }) {
  if (!live) return null
  const { delivering = 0, activeNoSpend = 0, pausedTotal = 0, activeTotal = 0, asOf } = live
  const hasIdle = activeNoSpend > 0
  return (
    <div className="bg-gradient-to-r from-[#1A1710] to-[#2a2218] rounded-xl border border-orange-900/30 p-4 flex items-center gap-4 flex-wrap">
      {/* Delivering — main metric with pulse */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">กำลังนำส่งโฆษณา</p>
          <p className="text-2xl font-bold text-white leading-tight">
            {delivering} <span className="text-sm font-normal text-gray-400">ตัว</span>
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-white/10 hidden md:block" />

      {/* Secondary metrics */}
      <div className="flex items-center gap-5 flex-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-green-400" />
          <span className="text-xs text-gray-300">
            ACTIVE total <span className="text-white font-semibold">{activeTotal}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Pause className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-300">
            PAUSED <span className="text-white font-semibold">{pausedTotal}</span>
          </span>
        </div>
        {hasIdle && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs text-amber-200">
              {activeNoSpend} ตัว ACTIVE แต่ไม่นำส่ง
            </span>
          </div>
        )}
      </div>

      {asOf && (
        <span className="text-[10px] text-gray-500 ml-auto">
          ข้อมูล ณ {asOf}
        </span>
      )}
    </div>
  )
}

function heatColor(value, max) {
  if (!max || !value) return '#f3f4f6'
  const p = value / max
  if (p < 0.15) return '#fef3c7'
  if (p < 0.35) return '#fde68a'
  if (p < 0.55) return '#fbbf24'
  if (p < 0.75) return '#f97316'
  return '#ea580c'
}

export default function MarketingPage() {
  const router = useRouter()
  const [range, setRange]           = useState('30d')
  const [dashboard, setDashboard]   = useState(null)
  const [timeSeries, setTimeSeries] = useState([])
  const [heatmap, setHeatmap]       = useState([])
  const [timeline, setTimeline]     = useState(null)
  const [campaigns, setCampaigns]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const fetchAll = useCallback(async (r) => {
    setLoading(true); setError(null)
    try {
      const [dash, ts, heat, tl, camps] = await Promise.all([
        fetch(`/api/marketing/dashboard?range=${r}`).then(x => x.json()),
        fetch(`/api/marketing/campaigns?type=timeseries&range=${r}`).then(x => x.json()),
        fetch(`/api/marketing/campaigns?type=heatmap&range=${r}`).then(x => x.json()),
        fetch(`/api/marketing/ad-timeline?range=${r}`).then(x => x.json()),
        fetch(`/api/marketing/campaigns?range=${r}`).then(x => x.json()),
      ])
      setDashboard(Array.isArray(dash) ? null : dash)
      setTimeSeries(Array.isArray(ts) ? ts : [])
      setHeatmap(Array.isArray(heat) ? heat : [])
      setTimeline(Array.isArray(tl) ? null : tl)
      setCampaigns((Array.isArray(camps) ? camps : []).slice(0, 10))
    } catch (err) {
      console.error('[marketing/page]', err)
      setError('ดึงข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll(range) }, [range, fetchAll])

  const { mat: heatMat, maxVal: heatMax } = (() => {
    const mat = {}; let maxVal = 0
    heatmap.forEach(({ dow, hour, spend }) => { mat[`${dow}-${hour}`] = spend; if (spend > maxVal) maxVal = spend })
    return { mat, maxVal }
  })()

  const c = dashboard?.current ?? {}
  const ch = dashboard?.changes ?? {}

  return (
    <div className="p-6 space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">วิเคราะห์ประสิทธิภาพโฆษณา Meta Ads · ซิงค์ทุก 1 ชั่วโมง</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button onClick={() => router.push('/marketing/campaign-tracker')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 border border-orange-500 rounded-lg shadow-sm">
            <Radio className="h-4 w-4" />Campaign Tracker
          </button>
          <button onClick={() => router.push('/marketing/campaigns')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <ExternalLink className="h-4 w-4" />ดูทุก Campaign
          </button>
          <button onClick={() => fetchAll(range)} disabled={loading} className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* 4 KPI summary cards (full width) */}
      <CalendarSummaryCards data={timeline} live={dashboard?.live} loading={loading} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="col-span-2"><KpiCard label="ยอดใช้โฆษณา"       value={fmt(c.spend,{type:'currency'})}           change={ch.spend}       icon={DollarSign}        color="orange" /></div>
        <div className="col-span-2"><KpiCard label="รายได้ (attributed)" value={fmt(c.revenue,{type:'currency'})}         change={ch.revenue}     icon={TrendingUp}        color="green"  /></div>
        <KpiCard label="ROAS"        value={fmt(c.roas,{type:'x',decimals:2})}  change={ch.roas}        icon={Target}            color="blue"   />
        <KpiCard label="CPL"         value={fmt(c.cpl,{type:'currency'})}       change={ch.cpl}         icon={Users}             color="purple" />
        <KpiCard label="CTR"         value={fmt(c.ctr,{type:'pct',decimals:2})} change={ch.ctr}         icon={MousePointerClick} color="pink"   />
        <KpiCard label="Impressions" value={fmt(c.impressions)}                 change={ch.impressions} icon={Eye}               color="indigo" />
        <KpiCard label="Clicks"      value={fmt(c.clicks)}                      change={ch.clicks}      icon={Zap}               color="orange" />
        <KpiCard label="Leads"       value={fmt(c.leads)}                       change={ch.leads}       icon={Users}             color="green"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">ยอดใช้โฆษณา vs รายได้</h2>
          {timeSeries.length === 0 && !loading
            ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">ไม่มีข้อมูล</div>
            : <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={timeSeries} margin={{top:4,right:16,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d?.slice(5)} interval="preserveStartEnd" />
                  <YAxis yAxisId="left"  tick={{fontSize:10}} tickFormatter={v=>`฿${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}} tickFormatter={v=>`฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v,n)=>[`฿${Number(v).toLocaleString()}`,n==='spend'?'Spend':'Revenue']} labelFormatter={l=>`วันที่ ${l}`} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Bar  yAxisId="left"  dataKey="spend"   name="Spend"   fill="#fb923c" radius={[3,3,0,0]} />
                  <Line yAxisId="right" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">CTR Trend (%)</h2>
          {timeSeries.length === 0 && !loading
            ? <div className="h-52 flex items-center justify-center text-sm text-gray-400">ไม่มีข้อมูล</div>
            : <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeSeries} margin={{top:4,right:16,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d?.slice(5)} interval="preserveStartEnd" />
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${v.toFixed(1)}%`} />
                  <Tooltip formatter={v=>[`${Number(v).toFixed(2)}%`,'CTR']} labelFormatter={l=>`วันที่ ${l}`} />
                  <Line dataKey="ctr" name="CTR" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Heatmap + Calendar Grid side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Hourly Spend Heatmap</h2>
            <span className="text-xs text-gray-400">สีเข้ม = Spend สูง</span>
          </div>
          {heatmap.length === 0 && !loading
            ? <div className="h-16 flex items-center justify-center text-sm text-gray-400">ไม่มีข้อมูล</div>
            : <div className="overflow-x-auto">
                <div className="inline-flex gap-0.5">
                  <div className="flex flex-col gap-0.5 mr-1">
                    <div className="h-5 w-7" />
                    {Array.from({length:24},(_,h)=>(
                      <div key={h} className="h-5 w-7 flex items-center justify-end pr-1 text-xs text-gray-400">{h%6===0?h:''}</div>
                    ))}
                  </div>
                  {DOW_LABELS.map((dow,d)=>(
                    <div key={d} className="flex flex-col gap-0.5">
                      <div className="h-5 w-10 text-center text-xs font-medium text-gray-500">{dow}</div>
                      {Array.from({length:24},(_,h)=>{
                        const val = heatMat[`${d}-${h}`] ?? 0
                        return <div key={h} className="h-5 w-10 rounded-sm" style={{backgroundColor:heatColor(val,heatMax)}} title={`${DOW_LABELS[d]} ${h}:00 — ฿${val.toFixed(0)}`} />
                      })}
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>

        <AdCalendarGrid data={timeline} loading={loading} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Top Campaigns (by spend)</h2>
          <button onClick={()=>router.push('/marketing/campaigns')} className="text-xs font-medium text-orange-600 hover:text-orange-700">ดูทั้งหมด →</button>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded flex-1" /><div className="h-4 bg-gray-100 rounded w-20" /><div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">ไม่มี campaign ในช่วงนี้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-2.5 text-left">Campaign</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Spend</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                  <th className="px-4 py-2.5 text-right">ROAS</th>
                  <th className="px-4 py-2.5 text-right">CTR</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                  <th className="px-4 py-2.5 text-right">CPL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(camp=>(
                  <tr key={camp.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>router.push('/marketing/campaigns')}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{camp.name}</p>
                      <p className="text-xs text-gray-400">{camp.objective??'—'}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={camp.status} /></td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(camp.spend,{type:'currency'})}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(camp.revenue,{type:'currency'})}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${camp.roas>=3?'text-green-600':camp.roas>=1?'text-yellow-600':'text-red-500'}`}>
                        {fmt(camp.roas,{type:'x',decimals:2})}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(camp.ctr,{type:'pct',decimals:2})}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(camp.leads)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(camp.cpl,{type:'currency'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
