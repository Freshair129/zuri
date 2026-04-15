'use client'

import { useState, useEffect } from 'react'
import {
  ShoppingCart, Minus, Plus, Trash2, ChevronDown,
  Calendar, Loader2
} from 'lucide-react'
import { formatTHB } from './constants'

// ── Schedule dropdown per cart item ──
function ScheduleDropdown({ productId, selectedId, onChange }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/pos/schedules?productId=${productId}`)
      .then(res => res.json())
      .then(json => {
        if (!cancelled) setSchedules(json.data || [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  const selected = schedules.find(s => s.id === selectedId)
  const label = selected
    ? `${new Date(selected.scheduledDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${selected.startTime}-${selected.endTime}`
    : 'ไม่ระบุรอบ'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Calendar size={10} />
        <span className="max-w-[100px] truncate">{loading ? '...' : label}</span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-200 min-w-[200px] max-h-48 overflow-y-auto">
            {/* ไม่ระบุ option */}
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 border-b ${
                !selectedId ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-600'
              }`}
            >
              ไม่ระบุรอบ
            </button>

            {loading ? (
              <div className="p-4 text-center"><Loader2 size={16} className="animate-spin mx-auto text-gray-400" /></div>
            ) : schedules.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">ไม่มีรอบเรียนสำหรับสินค้านี้</div>
            ) : (
              schedules.map(s => {
                const dateStr = new Date(s.scheduledDate).toLocaleDateString('th-TH', {
                  weekday: 'short', day: 'numeric', month: 'short'
                })
                const seats = s.maxStudents - s.confirmedStudents
                return (
                  <button
                    key={s.id}
                    onClick={() => { onChange(s.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedId === s.id ? 'bg-orange-50 text-orange-700 font-bold' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold">{dateStr}</span>
                        <span className="text-gray-400 ml-1">{s.startTime}-{s.endTime}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        seats > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {seats > 0 ? `ว่าง ${seats}` : 'เต็ม'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Cart Drawer (bottom sheet) ──
export default function CartDrawer({ cart, updateCartItem, removeFromCart, total, onCheckout }) {
  const itemCount = cart.reduce((a, b) => a + b.qty, 0)

  if (cart.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-40">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-black/5">
        {/* Cart items */}
        <div className="max-h-48 overflow-y-auto p-5 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate text-gray-800">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-orange-600 font-black">฿{formatTHB(item.unitPrice)}</p>
                    {/* Schedule dropdown for course items */}
                    {item.category && ['course', 'full_course', 'japanese_culinary', 'specialty', 'management', 'arts', 'package'].includes(item.category) && (
                      <ScheduleDropdown
                        productId={item.productId}
                        selectedId={item.scheduleId}
                        onChange={(scheduleId) => updateCartItem(item.id, { scheduleId })}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
                  <button
                    onClick={() => updateCartItem(item.id, { qty: Math.max(0, item.qty - 1) })}
                    className="text-gray-400 active:text-orange-500"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-black w-4 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                    className="text-green-600 active:text-green-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-gray-300 active:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout button */}
        <button
          onClick={onCheckout}
          className="w-full bg-orange-500 text-white p-5 flex items-center justify-between group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl">
              <ShoppingCart size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-orange-100 font-bold uppercase tracking-wider">{itemCount} รายการ</p>
              <p className="text-lg font-black">ชำระเงิน</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-orange-100 font-bold text-right uppercase tracking-wider">ยอดรวม</p>
            <p className="text-2xl font-black">฿{formatTHB(total)}</p>
          </div>
        </button>
      </div>
    </div>
  )
}
