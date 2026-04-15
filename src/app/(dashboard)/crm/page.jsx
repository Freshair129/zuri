'use client'

/**
 * CRM — Customer List Page (FEAT05-CRM)
 *
 * Features: search (debounce 300ms), lifecycle stage filter, paginated list,
 * KPI cards, new-customer modal, quick open-inbox action.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UserPlus, ChevronLeft, ChevronRight,
  MessageCircle, MoreHorizontal, X, Phone, Mail,
  Facebook, Loader2, ShieldCheck, Bot,
} from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { can } from '@/lib/permissionMatrix'
import ApprovalList from '@/components/crm/ApprovalList'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { key: null,          label: 'ทั้งหมด' },
  { key: 'NEW',         label: 'New',        color: 'bg-gray-100 text-gray-700' },
  { key: 'CONTACTED',   label: 'Contacted',  color: 'bg-blue-100 text-blue-700' },
  { key: 'INTERESTED',  label: 'Interested', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'ENROLLED',    label: 'Enrolled',   color: 'bg-purple-100 text-purple-700' },
  { key: 'PAID',        label: 'Paid',       color: 'bg-green-100 text-green-700' },
  { key: 'LOST',        label: 'Lost',       color: 'bg-red-100 text-red-700' },
]

const STAGE_MAP = Object.fromEntries(STAGES.filter(s => s.key).map(s => [s.key, s]))

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 8 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors = ['bg-orange-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400']
  const color = colors[initials.charCodeAt(0) % colors.length]
  return (
    <div className={`h-${size} w-${size} rounded-full ${color} flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-semibold">{initials}</span>
    </div>
  )
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  const s = STAGE_MAP[stage]
  if (!s) return <span className="text-xs text-gray-400">{stage}</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      {loading
        ? <div className="h-7 w-16 bg-gray-100 rounded mt-2 animate-pulse" />
        : <p className="text-2xl font-bold text-gray-900 mt-1">{value?.toLocaleString() ?? '—'}</p>}
    </div>
  )
}

// ─── Pending Approvals Card (M4-A3 Human Gate) ───────────────────────────────

function PendingApprovalsCard({ count, loading, onClick }) {
  const hasPending = count > 0
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={`
        relative text-left rounded-xl p-4 shadow-sm border transition-colors
        ${hasPending
          ? 'bg-gradient-to-br from-orange-50 to-white border-orange-300 hover:border-orange-400'
          : 'bg-white border-gray-100 hover:border-gray-200'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <ShieldCheck size={12} className={hasPending ? 'text-orange-500' : 'text-gray-400'} />
            รออนุมัติ
          </p>
          {loading
            ? <div className="h-7 w-16 bg-gray-100 rounded mt-2 animate-pulse" />
            : (
              <p className={`text-2xl font-bold mt-1 ${hasPending ? 'text-orange-600' : 'text-gray-900'}`}>
                {count.toLocaleString()}
              </p>
            )}
        </div>
        {hasPending && (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center"
          >
            <Bot size={14} className="text-orange-600" />
          </motion.div>
        )}
      </div>
      {hasPending && (
        <p className="mt-2 text-[11px] text-orange-600 font-medium">
          คลิกเพื่อตรวจสอบออเดอร์ AI →
        </p>
      )}
    </motion.button>
  )
}

// ─── New Customer Modal ────────────────────────────────────────────────────────

function NewCustomerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', lifecycleStage: 'NEW' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name && !form.phone && !form.email) {
      setError('กรุณากรอกชื่อหรือเบอร์โทร')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'เกิดข้อผิดพลาด')
      onCreated(json.data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">เพิ่มลูกค้าใหม่</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ชื่อ-นามสกุล"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0812345678"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lifecycle Stage</label>
            <select
              value={form.lifecycleStage}
              onChange={e => setForm(f => ({ ...f, lifecycleStage: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {STAGES.filter(s => s.key).map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Customer Row ──────────────────────────────────────────────────────────────

function CustomerRow({ customer, onOpenInbox, onView, onEdit }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = customer.displayName || customer.name || customer.facebookName || 'ลูกค้า'

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-gray-50 hover:bg-orange-50/40 transition-colors items-center">
      {/* Name + avatar */}
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <Avatar name={displayName} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-400 truncate">{customer.customerId}</p>
        </div>
      </div>

      {/* Contact */}
      <div className="col-span-3 space-y-0.5 min-w-0">
        {customer.phonePrimary && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone size={11} className="flex-shrink-0" />
            <span className="truncate">{customer.phonePrimary}</span>
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Mail size={11} className="flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        {customer.facebookId && !customer.phonePrimary && !customer.email && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Facebook size={11} className="flex-shrink-0" />
            <span className="truncate">Facebook</span>
          </div>
        )}
      </div>

      {/* Stage */}
      <div className="col-span-2">
        <StageBadge stage={customer.lifecycleStage} />
      </div>

      {/* Tags */}
      <div className="col-span-2 flex flex-wrap gap-1">
        {(customer.tags ?? []).slice(0, 2).map(tag => (
          <span key={tag} className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
            {tag}
          </span>
        ))}
        {(customer.tags ?? []).length > 2 && (
          <span className="text-xs text-gray-400">+{customer.tags.length - 2}</span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          onClick={() => onOpenInbox(customer)}
          title="เปิด Inbox"
          className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
        >
          <MessageCircle size={15} />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-36">
              <button
                onClick={() => { onView(customer); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                ดูรายละเอียด
              </button>
              <button
                onClick={() => { onEdit(customer); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                แก้ไข
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const router = useRouter()
  const { roles } = useSession()

  // State
  const [customers, setCustomers] = useState([])
  const [kpi, setKpi] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeStage, setActiveStage] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  // M4-A3: Human Approval Gate
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [approvalsLoading, setApprovalsLoading] = useState(true)
  const [showApprovalList, setShowApprovalList] = useState(false)

  // RBAC: only roles with Approve on orders (OWNER, MANAGER, DEV) see the card
  const canApproveOrders = can(roles, 'orders', 'A')

  const LIMIT = 20
  const totalPages = Math.ceil(total / LIMIT)

  // Debounced search ref
  const searchTimerRef = useRef(null)

  // ─── Fetch customers ─────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async ({ p = 1, s = search, stage = activeStage } = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT })
      if (s)     params.set('search', s)
      if (stage) params.set('stage', stage)

      const res = await fetch(`/api/customers?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setCustomers(json.data.customers)
      setTotal(json.data.total)
      setPage(p)
    } catch (err) {
      console.error('[CRM] fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [search, activeStage])

  // ─── Fetch KPI ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadKpi() {
      try {
        const res = await fetch('/api/customers?kpi=1')
        const json = await res.json()
        if (res.ok) setKpi(json.data)
      } catch (err) {
        console.error('[CRM] kpi error', err)
      } finally {
        setKpiLoading(false)
      }
    }
    loadKpi()
  }, [])

  // ─── Fetch Pending Approvals count (M4-A3) ──────────────────────────────────
  useEffect(() => {
    if (!canApproveOrders) {
      setApprovalsLoading(false)
      return
    }
    async function loadPending() {
      try {
        const res = await fetch('/api/ai/sales-closer/approve?limit=1')
        const json = await res.json()
        if (res.ok) {
          setPendingApprovals(json.total ?? json.orders?.length ?? 0)
        }
      } catch (err) {
        console.error('[CRM] pending approvals error', err)
      } finally {
        setApprovalsLoading(false)
      }
    }
    loadPending()
  }, [canApproveOrders])

  // ─── Initial load + stage filter change ──────────────────────────────────────
  useEffect(() => {
    fetchCustomers({ p: 1, stage: activeStage })
  }, [activeStage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Debounced search ─────────────────────────────────────────────────────────
  function handleSearchChange(val) {
    setSearch(val)
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      fetchCustomers({ p: 1, s: val, stage: activeStage })
    }, 300)
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function handleOpenInbox(customer) {
    // Deep link to inbox with customer filter — FEAT04 integration
    router.push(`/inbox?customerId=${customer.id}`)
  }

  function handleView(customer) {
    router.push(`/crm/${customer.id}`)
  }

  function handleEdit(customer) {
    router.push(`/crm/${customer.id}?edit=true`)
  }

  function handleCreated(newCustomer) {
    setCustomers(prev => [newCustomer, ...prev])
    setTotal(prev => prev + 1)
    setKpi(prev => prev ? { ...prev, total: prev.total + 1, newThisMonth: prev.newThisMonth + 1 } : null)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">จัดการลูกค้า, lead และ alumni ทั้งหมด</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus size={15} />
          เพิ่มลูกค้า
        </button>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 gap-4 ${canApproveOrders ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <KpiCard label="ลูกค้าทั้งหมด"    value={kpi?.total}        loading={kpiLoading} />
        <KpiCard label="เพิ่มเดือนนี้"     value={kpi?.newThisMonth} loading={kpiLoading} />
        <KpiCard label="Enrolled"           value={kpi?.enrolled}     loading={kpiLoading} />
        <KpiCard label="Paid"               value={kpi?.paid}         loading={kpiLoading} />
        {canApproveOrders && (
          <PendingApprovalsCard
            count={pendingApprovals}
            loading={approvalsLoading}
            onClick={() => setShowApprovalList(true)}
          />
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, อีเมล..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Stage Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {STAGES.map(s => (
          <button
            key={s.key ?? 'all'}
            onClick={() => setActiveStage(s.key)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeStage === s.key
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-4">ลูกค้า</div>
          <div className="col-span-3">ติดต่อ</div>
          <div className="col-span-2">Stage</div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1" />
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-gray-50 animate-pulse">
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="space-y-1.5">
                  <div className="h-3 w-28 bg-gray-200 rounded" />
                  <div className="h-2.5 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="col-span-3"><div className="h-3 w-32 bg-gray-100 rounded" /></div>
              <div className="col-span-2"><div className="h-5 w-16 bg-gray-100 rounded-full" /></div>
              <div className="col-span-2"><div className="h-4 w-20 bg-gray-100 rounded" /></div>
              <div className="col-span-1" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">ไม่พบลูกค้า</p>
            {search && <p className="text-xs mt-1">ลอง search ด้วยคำค้นอื่น</p>}
          </div>
        ) : (
          customers.map(customer => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onOpenInbox={handleOpenInbox}
              onView={handleView}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            แสดง {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} จาก {total?.toLocaleString()} รายการ
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchCustomers({ p: page - 1 })}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> ก่อนหน้า
            </button>
            <button
              onClick={() => fetchCustomers({ p: page + 1 })}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ถัดไป <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewModal && (
        <NewCustomerModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Pending Approvals Modal (M4-A3 Human Gate) */}
      <AnimatePresence>
        {showApprovalList && (
          <ApprovalList
            onClose={() => setShowApprovalList(false)}
            onCountChange={(n) => setPendingApprovals(n)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
