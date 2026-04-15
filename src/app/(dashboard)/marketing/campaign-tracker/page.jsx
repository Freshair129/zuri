'use client'

/**
 * Campaign Tracker — Operations page for managing live ads.
 * Route: /marketing/campaign-tracker (RBAC: marketing:F)
 *
 * Layout:
 *  - Header with date range switcher
 *  - Full-width Calendar (Gantt of ad delivery)
 *  - Campaign performance table with status toggles
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Calendar as CalendarIcon, Radio } from 'lucide-react'
import CampaignToggleTable from '@/components/marketing/CampaignToggleTable'

const RANGES = ['7d', '30d', '90d']
const RANGE_LABELS = { '7d': '7 วัน', '30d': '30 วัน', '90d': '90 วัน' }
const DOW_LABELS_FULL = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// ─── Calendar helpers (mirror /marketing) ───────────────────────────

function dateOnlyISO(d) { return new Date(d).toISOString().slice(0, 10) }
function parseISODate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
function startOfMonWeek(d) { const out = new Date(d); const dow = out.getDay(); out.setDate(out.getDate() - ((dow + 6) % 7)); out.setHours(0,0,0,0); return out }
function addDays(d, n) { const out = new Date(d); out.setDate(out.getDate() + n); return out }
function daysBetween(a, b) { return Math.round((b - a) / 86400000) }

function adRuns(ad) {
  const days = Object.keys(ad.dailySpend ?? {}).filter((k) => (ad.dailySpend[k] || 0) > 0).sort()
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
      runs.push({ start: runStart, end: runEnd, totalSpend: runSum })
      runStart = cur; runEnd = cur; runSum = ad.dailySpend[days[i]]
    }
  }
  runs.push({ start: runStart, end: runEnd, totalSpend: runSum })
  return runs
}

function assignLanes(ads) {
  const sorted = [...ads].sort((a, b) => {
    if (a.firstSpend !== b.firstSpend) return a.firstSpend < b.firstSpend ? -1 : 1
    return (b.totalSpend || 0) - (a.totalSpend || 0)
  })
  const lanes = []
  const map = new Map()
  for (const ad of sorted) {
    const start = parseISODate(ad.firstSpend)
    const end = parseISODate(ad.lastSpend)
    let placed = false
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] < start) {
        lanes[i] = end; map.set(ad.adId, i); placed = true; break
      }
    }
    if (!placed) { lanes.push(end); map.set(ad.adId, lanes.length - 1) }
  }
  return { laneMap: map }
}

const PAUSED_PALETTES = [
  'bg-sky-500 text-white',
  'bg-fuchsia-500 text-white',
  'bg-indigo-500 text-white',
  'bg-rose-500 text-white',
]

// ─── Full-width calendar ────────────────────────────────────────────

function FullCalendar({ data, loading }) {
  const LANE_HEIGHT = 26
  const LANE_GAP    = 4
  const HEADER_PAD  = 28

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-80 bg-gray-50 rounded animate-pulse" />
      </div>
    )
  }
  const ads = data?.ads ?? []
  const winStart = data?.windowStart ? parseISODate(data.windowStart) : new Date()
  const winEnd   = data?.windowEnd   ? parseISODate(data.windowEnd)   : new Date()
  const calStart = startOfMonWeek(winStart)
  const calEnd   = addDays(startOfMonWeek(winEnd), 6)
  const weeks = []
  for (let cur = new Date(calStart); cur <= calEnd; cur = addDays(cur, 7)) weeks.push(new Date(cur))

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-orange-500" />
          ปฏิทินการนำส่งโฆษณา
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-emerald-500" />Delivering
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-sky-500" />
            <span className="h-3 w-6 rounded bg-fuchsia-500" />Paused
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-gray-200 ring-1 ring-gray-300" />Gap
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {DOW_LABELS_FULL.map((d) => (
          <div key={d} className="px-3 py-2 text-[11px] font-bold text-gray-500 tracking-wider">{d}</div>
        ))}
      </div>

      {ads.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-gray-400">ไม่มีโฆษณาที่นำส่งในช่วงนี้</div>
      ) : (
        weeks.map((weekStart, wIdx) => {
          const segments = renderWeek(weekStart)
          const maxLane = segments.reduce((m, s) => Math.max(m, s.lane), -1)
          const laneCount = maxLane + 1
          const rowHeight = HEADER_PAD + Math.max(1, laneCount) * (LANE_HEIGHT + LANE_GAP) + 8
          let pausedColorIdx = 0
          const pausedColorMap = new Map()
          for (const seg of segments) {
            if (seg.ad.status === 'PAUSED' && !pausedColorMap.has(seg.ad.adId)) {
              pausedColorMap.set(seg.ad.adId, PAUSED_PALETTES[pausedColorIdx % PAUSED_PALETTES.length])
              pausedColorIdx++
            }
          }
          return (
            <div key={wIdx} className="relative grid grid-cols-7 border-t border-gray-100" style={{ height: rowHeight }}>
              {Array.from({ length: 7 }).map((_, di) => {
                const day = addDays(weekStart, di)
                const inWindow = day >= winStart && day <= winEnd
                return (
                  <div key={di} className={`border-r border-gray-100 last:border-r-0 ${inWindow ? '' : 'bg-gray-50/60'}`}>
                    <div className="px-2 py-1 text-[11px] font-semibold text-gray-400">{day.getDate()}</div>
                  </div>
                )
              })}
              <div className="absolute inset-0" style={{ paddingTop: HEADER_PAD }}>
                {segments.map((seg, idx) => {
                  const left  = (seg.dayStart / 7) * 100
                  const width = (seg.span / 7) * 100
                  const top   = seg.lane * (LANE_HEIGHT + LANE_GAP)
                  const palette = pausedColorMap.get(seg.ad.adId) ?? PAUSED_PALETTES[0]
                  const cls = seg.ad.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : palette
                  return (
                    <div
                      key={`${seg.ad.adId}-${idx}`}
                      className={`absolute rounded-md text-[10px] font-bold flex items-center px-2 truncate shadow-sm ${cls}`}
                      style={{
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        top, height: LANE_HEIGHT,
                      }}
                      title={`${seg.ad.name} · ฿${seg.spendInSegment.toFixed(0)} (${seg.span} วัน)`}
                    >
                      <span className="truncate flex-1">{seg.ad.name}</span>
                      {seg.span >= 2 && (
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
  )
}

// ─── Page ────────────────────────────────────────────────────────────

export default function CampaignTrackerPage() {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [timeline, setTimeline] = useState(null)
  const [adsList, setAdsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async (r) => {
    setLoading(true)
    setError(null)
    try {
      const [tl, list] = await Promise.all([
        fetch(`/api/marketing/ad-timeline?range=${r}`).then((x) => x.json()),
        fetch(`/api/marketing/ads?range=${r}`).then((x) => x.json()),
      ])
      setTimeline(Array.isArray(tl) ? null : tl)
      setAdsList(Array.isArray(list?.ads) ? list.ads : [])
    } catch (err) {
      console.error('[campaign-tracker]', err)
      setError('ดึงข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll(range) }, [range, fetchAll])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/marketing')}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors"
            title="กลับไป Marketing"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Radio className="h-6 w-6 text-orange-500" />
              Campaign Tracker
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">จัดการการนำส่งโฆษณา · เปิด/ปิดแอด · ติดตามสถานะ real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === r ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAll(range)}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Calendar (full width) */}
      <FullCalendar data={timeline} loading={loading} />

      {/* Campaign list with toggles */}
      <CampaignToggleTable
        ads={adsList}
        loading={loading}
        onAfterToggle={() => fetchAll(range)}
      />
    </div>
  )
}
