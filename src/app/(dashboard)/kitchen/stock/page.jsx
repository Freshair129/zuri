'use client'

/**
 * Kitchen — Stock / Ingredient Lots page
 * Lists ingredient lots sorted FEFO (First Expired First Out).
 * Data: GET /api/inventory/lots
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Package, AlertTriangle, Clock, Calendar,
  TrendingDown, RefreshCw, Loader2, CheckCircle2, XCircle,
} from 'lucide-react'

const EXPIRY_FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'today',   label: 'Expiring Today' },
  { key: '3d',      label: 'Expiring in 3 Days' },
  { key: 'week',    label: 'Expiring This Week' },
  { key: 'expired', label: 'Expired' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

function StatusBadge({ daysUntil, status }) {
  if (status === 'EXPIRED' || daysUntil < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200">
        <XCircle size={10} /> Expired
      </span>
    )
  }
  if (daysUntil <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200">
        <Clock size={10} /> Critical
      </span>
    )
  }
  if (daysUntil <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-yellow-50 text-yellow-700 border border-yellow-200">
        <Clock size={10} /> Soon
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 size={10} /> Fresh
    </span>
  )
}

function KpiCard({ label, value, tone = 'default', icon: Icon, loading }) {
  const tones = {
    default: 'bg-white border-gray-100',
    red:     'bg-red-50 border-red-100 text-red-700',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
    green:   'bg-emerald-50 border-emerald-100 text-emerald-700',
  }
  return (
    <div className={`${tones[tone]} rounded-xl border p-4 shadow-sm`}>
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </div>
      {loading ? (
        <div className="h-7 w-12 bg-gray-100 rounded mt-2 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold mt-1">{(value ?? 0).toLocaleString()}</p>
      )}
    </div>
  )
}

export default function StockPage() {
  const [lots, setLots] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchLots = useCallback(async (filter = expiryFilter) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inventory/lots?expiry=${filter}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setLots(Array.isArray(json.lots) ? json.lots : [])
      setSummary(json.summary ?? null)
    } catch (err) {
      console.error('[StockPage]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [expiryFilter])

  useEffect(() => { fetchLots(expiryFilter) }, [expiryFilter, fetchLots])

  // Client-side search (cheap, since we cap at 500 lots server-side)
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return lots
    return lots.filter((l) =>
      l.ingredientName?.toLowerCase().includes(s) ||
      l.lotId?.toLowerCase().includes(s) ||
      l.ingredientCode?.toLowerCase().includes(s)
    )
  }, [lots, search])

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ingredient lots with FEFO tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLots(expiryFilter)}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total SKUs"        value={summary?.totalSkus}    icon={Package}        loading={loading && !summary} />
        <KpiCard label="Low Stock Items"   value={summary?.lowStock}     icon={TrendingDown} tone="red"   loading={loading && !summary} />
        <KpiCard label="Expiring in 3 Days" value={summary?.expiringIn3d} icon={Clock}         tone="amber" loading={loading && !summary} />
        <KpiCard label="Expired"           value={summary?.expired}      icon={AlertTriangle} tone="red"   loading={loading && !summary} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาด้วย ชื่อวัตถุดิบ, lot ID, รหัส..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Expiry quick filters */}
      <div className="flex gap-2 flex-wrap">
        {EXPIRY_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setExpiryFilter(f.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              expiryFilter === f.key
                ? 'bg-orange-500 text-white shadow-sm'
                : f.key === 'expired' || f.key === 'today'
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lots table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-4">Ingredient</div>
          <div className="col-span-2">Lot ID</div>
          <div className="col-span-2">Received</div>
          <div className="col-span-2">Expires</div>
          <div className="col-span-1 text-right">Remaining</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {loading && filtered.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-50 animate-pulse">
              <div className="col-span-4 flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-100 rounded-lg" />
                <div className="space-y-1.5">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-2.5 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className={`col-span-${j === 0 || j === 1 || j === 2 ? 2 : 1}`}>
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">ไม่พบ lot ที่ตรงเงื่อนไข</p>
            {search && <p className="text-xs mt-1">ลองคำค้นอื่น หรือเปลี่ยน filter</p>}
          </div>
        ) : (
          filtered.map((lot) => {
            const isExpired = lot.daysUntilExpiry < 0
            const isCritical = lot.daysUntilExpiry >= 0 && lot.daysUntilExpiry <= 3
            const lowQty = lot.remainingQty < lot.initialQty * 0.3
            return (
              <div
                key={lot.id}
                className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-50 hover:bg-orange-50/20 transition-colors items-center ${
                  isExpired ? 'bg-red-50/30' : isCritical ? 'bg-amber-50/30' : ''
                }`}
              >
                {/* Ingredient name */}
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 bg-orange-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <Package size={14} className="text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate" title={lot.ingredientName}>
                      {lot.ingredientName}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono">{lot.ingredientCode}</p>
                  </div>
                </div>

                {/* Lot ID */}
                <div className="col-span-2">
                  <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{lot.lotId}</span>
                </div>

                {/* Received date */}
                <div className="col-span-2 text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={11} />
                  {fmtDate(lot.createdAt)}
                </div>

                {/* Expires */}
                <div className="col-span-2 text-xs">
                  <div className={isExpired ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                    {fmtDate(lot.expiresAt)}
                  </div>
                  <div className={`text-[10px] ${isExpired ? 'text-red-500' : isCritical ? 'text-amber-600' : 'text-gray-400'}`}>
                    {isExpired
                      ? `เลยกำหนด ${Math.abs(lot.daysUntilExpiry)} วัน`
                      : lot.daysUntilExpiry === 0
                      ? 'หมดอายุวันนี้'
                      : `อีก ${lot.daysUntilExpiry} วัน`}
                  </div>
                </div>

                {/* Remaining qty */}
                <div className="col-span-1 text-right">
                  <p className={`text-sm font-bold tabular-nums ${lowQty ? 'text-amber-600' : 'text-gray-900'}`}>
                    {lot.remainingQty.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">{lot.unit}</p>
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-end">
                  <StatusBadge daysUntil={lot.daysUntilExpiry} status={lot.status} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FEFO info callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <div className="h-5 w-5 bg-blue-500 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-white text-xs font-bold">i</div>
        <div>
          <p className="text-sm font-semibold text-blue-800">FEFO Ordering Active</p>
          <p className="text-xs text-blue-600 mt-0.5">
            วัตถุดิบเรียงตามวันหมดอายุก่อนหลัง (First Expired, First Out) เพื่อลด waste — ดึงตัวที่ใกล้หมดออกก่อน
          </p>
        </div>
      </div>
    </div>
  )
}
