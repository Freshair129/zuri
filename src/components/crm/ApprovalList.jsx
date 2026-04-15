'use client'

/**
 * ApprovalList — Human Approval Gate UI for AI Sales Closer (M4-A3)
 * Ref: ZDEV-TSK-20260410-015 · ZDEV-IMP-2640
 *
 * Displays orders with requiresApproval=true. Owners/Managers can
 * Approve (finalize payment) or Reject (void order).
 * API: GET/POST /api/ai/sales-closer/approve
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, XCircle, Loader2, Bot, User, ShoppingBag,
  AlertTriangle, Clock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'เมื่อสักครู่'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// ─── Created-By Badge ─────────────────────────────────────────────────────────

function CreatedByBadge({ createdBy }) {
  const isAi = createdBy === 'AI'
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
        ${isAi
          ? 'bg-[#D6ECFA] border border-sky-200 text-sky-700'
          : 'bg-gray-100 border border-gray-200 text-gray-600'
        }
      `}
    >
      {isAi ? <Bot size={10} /> : <User size={10} />}
      {isAi ? 'AI' : 'Staff'}
    </span>
  )
}

// ─── Order Review Modal ───────────────────────────────────────────────────────

function OrderReviewModal({ order, onClose, onDecided }) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleDecision = async (action) => {
    if (processing) return
    setProcessing(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/sales-closer/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'การดำเนินการล้มเหลว')
      onDecided(order.id, action)
      onClose()
    } catch (err) {
      console.error('[ApprovalList] decision error', err)
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: [0.68, -0.6, 0.32, 1.6] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">ตรวจสอบออเดอร์</h2>
              <p className="text-xs text-gray-500">{order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <CreatedByBadge createdBy={order.createdBy} />
            <span className="text-gray-500">
              <Clock size={12} className="inline mr-1" />
              {formatRelative(order.createdAt)}
            </span>
          </div>

          {/* Customer */}
          <div className="bg-[#F7F8FA] rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">ลูกค้า</p>
            <p className="text-sm font-semibold text-gray-900">
              {order.customer?.name || order.customer?.facebookName || 'Walk-in'}
            </p>
            {order.customer?.phonePrimary && (
              <p className="text-xs text-gray-500">{order.customer.phonePrimary}</p>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">รายการ</p>
            <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
              {(order.items ?? []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">× {item.qty}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 shrink-0 ml-3">
                    {formatCurrency(item.totalPrice ?? item.unitPrice * item.qty)}
                  </p>
                </div>
              ))}
              {(order.items ?? []).length === 0 && (
                <p className="px-4 py-3 text-xs text-gray-400">ไม่มีรายการ</p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm">
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>ส่วนลด</span>
                <span>−{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            {order.vatAmount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>VAT</span>
                <span>{formatCurrency(order.vatAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>ยอดรวม</span>
              <span className="text-orange-600">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {/* High-value warning */}
          {order.totalAmount >= 5000 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>ออเดอร์มูลค่าสูง (≥ ฿5,000) — กรุณาตรวจสอบรายการและลูกค้าให้ถูกต้องก่อนอนุมัติ</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-[#F7F8FA]">
          <button
            onClick={() => handleDecision('REJECT')}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            ปฏิเสธ
          </button>
          <button
            onClick={() => handleDecision('APPROVE')}
            disabled={processing}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
          >
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            อนุมัติ
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main ApprovalList ────────────────────────────────────────────────────────

/**
 * ApprovalList — Modal listing pending-approval orders.
 *
 * @param {Object} props
 * @param {Function} props.onClose - called when modal closes
 * @param {Function} [props.onCountChange] - called with remaining count after a decision
 */
export default function ApprovalList({ onClose, onCountChange = () => {} }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/sales-closer/approve?limit=50')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'โหลดรายการไม่สำเร็จ')
      const list = json.orders ?? json.data ?? []
      setOrders(list)
      onCountChange(list.length)
    } catch (err) {
      console.error('[ApprovalList] fetch error', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleDecided = (orderId) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId)
      onCountChange(next.length)
      return next
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">รายการรออนุมัติ</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ออเดอร์ AI หรือมูลค่าสูงที่ต้องการการยืนยันจากเจ้าของ/ผู้จัดการ
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={24} className="animate-spin mb-2" />
                <p className="text-sm">กำลังโหลด...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600 text-sm">{error}</div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Check size={32} className="mb-2 text-green-500" />
                <p className="text-sm font-medium text-gray-600">ไม่มีรายการรออนุมัติ</p>
                <p className="text-xs text-gray-400 mt-1">คุณจัดการออเดอร์เสร็จทั้งหมดแล้ว</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Column header */}
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 bg-[#F7F8FA] text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="col-span-3">Order ID</div>
                  <div className="col-span-3">ลูกค้า</div>
                  <div className="col-span-2 text-right">ยอด</div>
                  <div className="col-span-2">สร้างโดย</div>
                  <div className="col-span-2 text-right">การดำเนินการ</div>
                </div>

                <AnimatePresence>
                  {orders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-orange-50/40 transition-colors"
                    >
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{order.orderId}</p>
                        <p className="text-[11px] text-gray-400">{formatRelative(order.createdAt)}</p>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {order.customer?.name || order.customer?.facebookName || 'Walk-in'}
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <CreatedByBadge createdBy={order.createdBy} />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ตรวจสอบ
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Individual order review modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderReviewModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onDecided={handleDecided}
          />
        )}
      </AnimatePresence>
    </>
  )
}
