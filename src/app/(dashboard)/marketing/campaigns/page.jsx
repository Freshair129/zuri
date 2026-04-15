'use client'

/**
 * Marketing — Campaigns page (core/marketing FEAT09)
 * Sortable campaign table with 3-level drill-down: Campaign → AdSet → Ad
 * All data from /api/marketing/campaigns — never direct Meta API.
 */

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

const RANGES = ['7d', '30d', '90d']
const STATUSES = ['', 'ACTIVE', 'PAUSED', 'ARCHIVED']

function fmt(n, { type = 'number', decimals = 0 } = {}) {
  if (n == null) return '—'
  if (type === 'currency') return `฿${Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals })}`
  if (type === 'pct')      return `${Number(n).toFixed(decimals)}%`
  if (type === 'x')        return `${Number(n).toFixed(decimals)}x`
  return Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals })
}

function StatusBadge({ status }) {
  const map = {
    ACTIVE:   'bg-green-100 text-green-700',
    PAUSED:   'bg-yellow-100 text-yellow-700',
    ARCHIVED: 'bg-gray-100 text-gray-500',
    ENABLED:  'bg-green-100 text-green-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  )
}

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field
  return (
    <th
      className="px-4 py-2.5 text-right cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1 justify-end text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'text-orange-500' : 'text-gray-300'}`} />
      </span>
    </th>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AdSet sub-row
function AdSetRow({ tenantId, adSetId, range, depth = 1 }) {
  const [expanded, setExpanded] = useState(false)
  const [ads, setAds]           = useState([])
  const [loading, setLoading]   = useState(false)
  const [row, setRow]           = useState(null)

  // Fetch ad-level rows on expand
  const loadAds = useCallback(async () => {
    if (ads.length > 0) return
    setLoading(true)
    try {
      const data = await fetch(`/api/marketing/campaigns?drill=ads&adset_id=${adSetId}&range=${range}`).then(r => r.json())
      setAds(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [adSetId, range, ads.length])

  const toggle = () => {
    setExpanded(e => !e)
    if (!expanded) loadAds()
  }

  if (!row) return null  // rendered via parent map

  return null  // placeholder — AdSet rows rendered inside CampaignRow
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const router = useRouter()
  const [range, setRange]         = useState('30d')
  const [status, setStatus]       = useState('')
  const [search, setSearch]       = useState('')
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [sortBy, setSortBy]       = useState('spend')
  const [sortDir, setSortDir]     = useState('desc')

  // Drill-down state: { [campaignId]: adsets[] | null }
  const [adSets, setAdSets]   = useState({})
  const [adRows, setAdRows]   = useState({})         // { [adSetId]: ads[] }
  const [expanded, setExpanded] = useState({})       // { [id]: boolean }
  const [drillLoading, setDrillLoading] = useState({})

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ range })
      if (status) params.set('status', status)
      const data = await fetch(`/api/marketing/campaigns?${params}`).then(r => r.json())
      setCampaigns(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[campaigns/page]', err)
    } finally {
      setLoading(false)
    }
  }, [range, status])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  // Sort campaigns
  const sorted = [...campaigns]
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1
      return (a[sortBy] > b[sortBy] ? 1 : -1) * v
    })

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const toggleCampaign = async (campId) => {
    const next = !expanded[campId]
    setExpanded(e => ({ ...e, [campId]: next }))
    if (next && !adSets[campId]) {
      setDrillLoading(l => ({ ...l, [campId]: true }))
      try {
        const data = await fetch(`/api/marketing/campaigns?drill=adsets&campaign_id=${campId}&range=${range}`).then(r => r.json())
        setAdSets(a => ({ ...a, [campId]: Array.isArray(data) ? data : [] }))
      } finally {
        setDrillLoading(l => ({ ...l, [campId]: false }))
      }
    }
  }

  const toggleAdSet = async (adSetId) => {
    const key = `as-${adSetId}`
    const next = !expanded[key]
    setExpanded(e => ({ ...e, [key]: next }))
    if (next && !adRows[adSetId]) {
      setDrillLoading(l => ({ ...l, [key]: true }))
      try {
        const data = await fetch(`/api/marketing/campaigns?drill=ads&adset_id=${adSetId}&range=${range}`).then(r => r.json())
        setAdRows(a => ({ ...a, [adSetId]: Array.isArray(data) ? data : [] }))
      } finally {
        setDrillLoading(l => ({ ...l, [key]: false }))
      }
    }
  }

  const colHeaders = [
    { label: 'Spend',    field: 'spend'   },
    { label: 'Revenue',  field: 'revenue' },
    { label: 'ROAS',     field: 'roas'    },
    { label: 'CTR',      field: 'ctr'     },
    { label: 'Clicks',   field: 'clicks'  },
    { label: 'Leads',    field: 'leads'   },
    { label: 'CPL',      field: 'cpl'     },
  ]

  const renderMetricCells = (row) => (
    <>
      <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-800">{fmt(row.spend, { type: 'currency' })}</td>
      <td className="px-4 py-2.5 text-right text-sm text-green-700">{fmt(row.revenue, { type: 'currency' })}</td>
      <td className="px-4 py-2.5 text-right text-sm">
        <span className={`font-semibold ${row.roas >= 3 ? 'text-green-600' : row.roas >= 1 ? 'text-yellow-600' : 'text-red-500'}`}>
          {fmt(row.roas, { type: 'x', decimals: 2 })}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(row.ctr, { type: 'pct', decimals: 2 })}</td>
      <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(row.clicks)}</td>
      <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(row.leads)}</td>
      <td className="px-4 py-2.5 text-right text-sm text-gray-600">{fmt(row.cpl, { type: 'currency' })}</td>
    </>
  )

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/marketing')} className="p-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">Meta Ads — drill-down Campaign → AdSet → Ad</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา campaign..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Range */}
        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          {RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${range === r ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {r}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">All Status</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="ml-auto text-sm text-gray-400">
          {sorted.length} campaigns
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide" style={{ minWidth: 280 }}>
                  Campaign / AdSet / Ad
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                {colHeaders.map(h => (
                  <SortHeader key={h.field} label={h.label} field={h.field} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3"><div className="h-4 bg-gray-100 rounded w-56" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3 text-right"><div className="h-4 bg-gray-100 rounded w-16 ml-auto" /></td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">ไม่มี campaign ในช่วงนี้</td>
                </tr>
              ) : sorted.map(camp => (
                <>
                  {/* Campaign row */}
                  <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleCampaign(camp.campaignId)}
                        className="flex items-center gap-2 text-left w-full group"
                      >
                        {drillLoading[camp.campaignId]
                          ? <div className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          : expanded[camp.campaignId]
                            ? <ChevronDown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                        }
                        <span>
                          <p className="font-semibold text-gray-900 truncate max-w-xs">{camp.name}</p>
                          <p className="text-xs text-gray-400">{camp.objective ?? '—'} · {camp.adSetCount ?? 0} adsets · {camp.adCount ?? 0} ads</p>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={camp.status} /></td>
                    {renderMetricCells(camp)}
                  </tr>

                  {/* AdSet sub-rows */}
                  {expanded[camp.campaignId] && (adSets[camp.campaignId] ?? []).map(aset => (
                    <>
                      <tr key={aset.adSetId} className="bg-orange-50/40 hover:bg-orange-50/70 transition-colors">
                        <td className="pl-12 pr-5 py-2.5">
                          <button
                            onClick={() => toggleAdSet(aset.adSetId)}
                            className="flex items-center gap-2 text-left w-full group"
                          >
                            {drillLoading[`as-${aset.adSetId}`]
                              ? <div className="h-3.5 w-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                              : expanded[`as-${aset.adSetId}`]
                                ? <ChevronDown className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                                : <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                            }
                            <span>
                              <p className="font-medium text-gray-700 text-xs">{aset.name}</p>
                              <p className="text-xs text-gray-400">{aset.adCount ?? 0} ads</p>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={aset.status} /></td>
                        {renderMetricCells(aset)}
                      </tr>

                      {/* Ad sub-rows */}
                      {expanded[`as-${aset.adSetId}`] && (adRows[aset.adSetId] ?? []).map(ad => (
                        <tr key={ad.adId} className="bg-blue-50/30 hover:bg-blue-50/60 transition-colors">
                          <td className="pl-20 pr-5 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                              <span>
                                <p className="text-xs text-gray-600 truncate max-w-xs">{ad.name}</p>
                                <p className="text-xs text-gray-400">{ad.deliveryStatus ?? ad.status}</p>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2"><StatusBadge status={ad.status} /></td>
                          {renderMetricCells(ad)}
                        </tr>
                      ))}
                    </>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
