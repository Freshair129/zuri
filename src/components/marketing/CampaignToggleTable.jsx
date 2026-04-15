'use client'

/**
 * CampaignToggleTable — ad-level performance list with status toggles.
 * Each row has a switch that flips ACTIVE ↔ PAUSED, with optimistic UI
 * and rollback on failure. Confirmation modal before pausing an ad
 * that's currently spending.
 *
 * Used by /marketing/campaign-tracker
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, Search, Filter, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

// ─── Toggle switch ─────────────────────────────────────────────────

function ToggleSwitch({ enabled, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
        ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}
        ${disabled ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-90'}
      `}
      aria-pressed={enabled}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform
          ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}

// ─── Status badge ─────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ACTIVE:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    PAUSED:  'bg-amber-100 text-amber-700 border-amber-200',
    ARCHIVED:'bg-gray-100 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${map[status] ?? map.ARCHIVED}`}>
      {status}
    </span>
  )
}

// ─── Confirm pause modal ──────────────────────────────────────────

function ConfirmPauseModal({ ad, onConfirm, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: [0.68, -0.6, 0.32, 1.6] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">หยุดการนำส่งโฆษณา?</h3>
            <p className="text-sm text-gray-500 mt-1 truncate">{ad.name}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Spend ในช่วงนี้</span>
            <span className="font-semibold text-gray-900">{formatCurrency(ad.spend)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Impressions</span>
            <span className="font-semibold text-gray-900">{ad.impressions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Leads</span>
            <span className="font-semibold text-gray-900">{ad.leads}</span>
          </div>
        </div>

        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          ⚠ การปิดโฆษณาจะหยุดการนำส่งทันที — ลูกค้าจะไม่เห็นโฆษณานี้อีกจนกว่าจะเปิดใหม่
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-semibold"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-sm"
          >
            ยืนยันปิด
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main table ───────────────────────────────────────────────────

export default function CampaignToggleTable({ ads: initialAds, loading, onAfterToggle }) {
  const [ads, setAds] = useState(initialAds || [])
  const [pendingId, setPendingId] = useState(null)
  const [confirmAd, setConfirmAd] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Sync incoming ads when parent reloads
  if (initialAds && initialAds !== ads && !pendingId) {
    setAds(initialAds)
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return ads.filter((ad) => {
      if (statusFilter !== 'ALL' && ad.status !== statusFilter) return false
      if (!s) return true
      return (ad.name?.toLowerCase().includes(s) || ad.campaignName?.toLowerCase().includes(s))
    })
  }, [ads, search, statusFilter])

  const doToggle = async (ad, nextEnabled) => {
    setPendingId(ad.adId)
    setError(null)

    // Optimistic
    const previousStatus = ad.status
    setAds((prev) => prev.map((a) => (a.adId === ad.adId ? { ...a, status: nextEnabled ? 'ACTIVE' : 'PAUSED' } : a)))

    try {
      const res = await fetch(`/api/marketing/ads/${ad.adId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Toggle failed')
      onAfterToggle?.()
    } catch (err) {
      console.error('[CampaignToggleTable]', err)
      // Rollback
      setAds((prev) => prev.map((a) => (a.adId === ad.adId ? { ...a, status: previousStatus } : a)))
      setError(`${ad.name}: ${err.message}`)
    } finally {
      setPendingId(null)
    }
  }

  const handleToggleClick = (ad) => {
    const nextEnabled = ad.status !== 'ACTIVE'
    // Confirm before pausing a spending ad
    if (!nextEnabled && ad.spend > 0) {
      setConfirmAd(ad)
      return
    }
    doToggle(ad, nextEnabled)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Campaign Performance</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            กดสวิตช์เพื่อเปิด / ปิดการนำส่งโฆษณา · {filtered.length} / {ads.length} โฆษณา
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {['ALL', 'ACTIVE', 'PAUSED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === s ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 w-44"
            />
          </div>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-3 sticky left-0 bg-gray-50">Campaign / Ad</th>
              <th className="text-center px-3 py-3">Status</th>
              <th className="text-right px-3 py-3">Spend</th>
              <th className="text-right px-3 py-3">ROAS</th>
              <th className="text-right px-3 py-3">Results</th>
              <th className="text-right px-3 py-3">CPL</th>
              <th className="text-right px-3 py-3">CTR</th>
              <th className="text-right px-4 py-3">CPC</th>
            </tr>
          </thead>
          <tbody>
            {loading && ads.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-6 w-11 bg-gray-100 rounded-full animate-pulse mx-auto" /></td>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">ไม่พบโฆษณา</td>
              </tr>
            ) : (
              filtered.map((ad) => {
                const isPending = pendingId === ad.adId
                const isActive  = ad.status === 'ACTIVE'
                return (
                  <tr key={ad.adId} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 sticky left-0 bg-white hover:bg-orange-50/30 max-w-[280px]">
                      <p className="font-semibold text-gray-900 truncate" title={ad.name}>{ad.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{ad.campaignName}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <ToggleSwitch
                          enabled={isActive}
                          disabled={isPending}
                          onClick={() => handleToggleClick(ad)}
                        />
                        {isPending ? (
                          <Loader2 size={12} className="animate-spin text-gray-400" />
                        ) : (
                          <StatusBadge status={ad.status} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatCurrency(ad.spend)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={ad.roas >= 1 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>
                        {ad.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-700">{ad.leads || ad.clicks || 0}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-500">{ad.cpl > 0 ? formatCurrency(ad.cpl) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-500">{ad.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{ad.cpc > 0 ? formatCurrency(ad.cpc) : '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmAd && (
          <ConfirmPauseModal
            ad={confirmAd}
            onClose={() => setConfirmAd(null)}
            onConfirm={() => {
              doToggle(confirmAd, false)
              setConfirmAd(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
