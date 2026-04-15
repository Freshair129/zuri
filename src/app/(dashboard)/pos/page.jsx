'use client'

/**
 * POS Page — Point of Sale (FEAT06-POS)
 *
 * Full-screen POS: product grid (left) + cart panel (right)
 * Features: category filter, search, cart management,
 *           discount (amount or percent), promotion code,
 *           cashier name from session, payment modal (cash/QR/card).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { motion } from 'framer-motion'
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, QrCode, X, Loader2,
  CheckCircle, ChevronDown, BarChart2, Tag, User,
  Percent, DollarSign, UtensilsCrossed, Smartphone, Truck,
  MapPin, Users, Bike, Package, Snowflake
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: 'CASH', label: 'เงินสด',    icon: Banknote  },
  { key: 'QR',   label: 'QR/โอน',   icon: QrCode    },
  { key: 'CARD', label: 'บัตร',      icon: CreditCard },
]

const ORDER_TYPES = [
  { key: 'DINE_IN',  label: 'กินที่ร้าน', icon: UtensilsCrossed, desc: 'Onsite' },
  { key: 'TAKEAWAY', label: 'กลับบ้าน', icon: Smartphone, desc: 'Take-away' },
  { key: 'DELIVERY', label: 'Delivery', icon: Truck, desc: 'Delivery' },
]

const DELIVERY_SUBTYPES = [
  { key: 'DELIVERY_INSTANT', label: 'สด (LineMan)', icon: Bike, desc: 'Fresh/Instant' },
  { key: 'DELIVERY_POSTAL',  label: 'พัสดุ (Postal)', icon: Package, desc: 'Dry/Parcel' },
  { key: 'DELIVERY_COLD',    label: 'แช่เย็น (Cold)', icon: Snowflake, desc: 'Temp Controlled' },
]

const formatTHB = (n) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)

// ─── Category color helper ────────────────────────────────────────────────────
const CAT_COLORS = ['bg-orange-100 text-orange-700', 'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700']

function catColor(cat, idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onAdd }) {
  const [imgError, setImgError] = useState(false)
  const price = product.posPrice ?? product.basePrice
  const hasImage = product.imageUrl && !imgError

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onAdd(product)}
      className="relative w-full rounded-[20px] overflow-hidden shadow-md hover:shadow-xl transition-all text-left"
      style={{ height: '160px' }}
    >
      {/* Background — full image or gradient placeholder */}
      <div className="absolute inset-0 z-0">
        {hasImage ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fed7aa 0%, #fb923c 55%, #ea580c 100%)' }}
          >
            <ShoppingCart size={32} className="text-white/50" />
          </div>
        )}
      </div>

      {/* Gradient overlay — MangoCards Card 2 style */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1A1710]/90 via-[#1A1710]/25 to-black/5" />

      {/* Content overlaid at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3.5">
        <p className="text-white text-[13px] font-semibold line-clamp-1 leading-tight">{product.name}</p>
        <p className="text-[#E8820C] text-sm font-bold mt-0.5">฿{formatTHB(price)}</p>
      </div>
    </motion.button>
  )
}

// ─── Cart Item ────────────────────────────────────────────────────────────────

function CartItem({ item, onQty, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-gray-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-400">฿{formatTHB(item.unitPrice)} / ชิ้น</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onQty(item.id, item.qty - 1)}
          className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-400 hover:text-orange-500"
        >
          <Minus size={10} />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-900">{item.qty}</span>
        <button
          onClick={() => onQty(item.id, item.qty + 1)}
          className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-400 hover:text-orange-500"
        >
          <Plus size={10} />
        </button>
      </div>
      <p className="text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0">
        ฿{formatTHB(item.unitPrice * item.qty - (item.discount ?? 0))}
      </p>
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-400 ml-1">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ total, discountAmount, promoCode, onConfirm, onClose, loading }) {
  const [method, setMethod]       = useState('CASH')
  const [cashInput, setCashInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifiedData, setVerifiedData] = useState(null)
  const fileInputRef = useRef(null)

  const cashReceived = parseFloat(cashInput) || (verifiedData?.amount ? verifiedData.amount : 0)
  const change = method === 'CASH' ? Math.max(0, cashReceived - total) : 0

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsVerifying(true)
    setVerifiedData(null)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result
        const res = await fetch('/api/payments/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: base64, mimeType: file.type }),
        })
        const json = await res.json()
        if (json.data?.isVerified) {
          setVerifiedData(json.data)
          if (json.data.amount) setCashInput(json.data.amount.toString())
        } else {
          alert('ไม่สามารถตรวจสอบสลิปได้ หรือข้อมูลไม่ถูกต้อง')
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">ชำระเงิน</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">ยอดรวมทั้งหมด</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">฿{formatTHB(total)}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-green-600 mt-1">ส่วนลด -฿{formatTHB(discountAmount)}</p>
            )}
            {promoCode && (
              <p className="text-xs text-blue-600 mt-0.5">โค้ด: {promoCode}</p>
            )}
          </div>

          {/* Method select */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">วิธีชำระ</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setMethod(key); setVerifiedData(null); setCashInput(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    method === key
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Slip Verification */}
          {method === 'QR' && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">ตรวจสอบสลิป (AI)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              {!verifiedData ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVerifying}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={24} className="animate-spin text-orange-500" />
                      <span className="text-xs">กำลังตรวจสอบด้วย AI...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={24} />
                      <span className="text-xs">อัปโหลดรูปสลิป</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <div>
                      <p className="text-xs font-bold text-green-700">ยืนยันแล้ว: ฿{formatTHB(verifiedData.amount)}</p>
                      <p className="text-[10px] text-green-600">{verifiedData.receiverName || 'ไม่ระบุชื่อผู้รับ'}</p>
                    </div>
                  </div>
                  <button onClick={() => setVerifiedData(null)} className="text-xs text-green-600 underline">เปลี่ยน</button>
                </div>
              )}
            </div>
          )}

          {/* Cash change calculator */}
          {method === 'CASH' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">รับเงินมา</label>
              <input
                type="number"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-right text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {cashReceived >= total && (
                <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-green-700">เงินทอน</span>
                  <span className="text-lg font-bold text-green-600">฿{formatTHB(change)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onConfirm({ method, cashReceived: cashReceived || undefined, slipData: verifiedData })}
            disabled={loading || isVerifying || (method === 'CASH' && (!cashInput || cashReceived < total)) || (method === 'QR' && !verifiedData)}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            ยืนยันชำระเงิน
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Success Toast ──────────────────────────────────────────────────────

function SuccessToast({ orderId, onReceipt, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white border border-green-200 rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between gap-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <CheckCircle size={24} className="text-green-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">ชำระเงินสำเร็จ!</p>
          <p className="text-xs text-gray-500">{orderId}</p>
        </div>
      </div>
      <button
        onClick={onReceipt}
        className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors"
      >
        ดูใบเสร็จ
      </button>
    </div>
  )
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ order, cashierName, onClose }) {
  if (!order) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">ใบเสร็จรับเงิน</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 text-center font-mono text-sm text-gray-800">
          <h2 className="text-xl font-bold mb-1">Zuri Platform</h2>
          <p className="text-xs text-gray-500 mb-6">Tax ID: 0-1234-56789-01-2</p>

          <div className="flex justify-between text-xs mb-1">
            <span>เลขที่:</span>
            <span>{order.orderId}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span>วันที่:</span>
            <span>{new Date().toLocaleString('th-TH')}</span>
          </div>
          {cashierName && (
            <div className="flex justify-between text-xs mb-4">
              <span>พนักงาน:</span>
              <span className="font-medium">{cashierName}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-300 my-4" />

          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-left flex-1">{item.name} x{item.qty}</span>
                <span className="ml-2">฿{formatTHB(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-4" />

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>รวมเงิน</span>
              <span>฿{formatTHB(order.subtotalAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>ส่วนลด</span>
                <span>-฿{formatTHB(order.discountAmount)}</span>
              </div>
            )}
            {order.promoCode && (
              <div className="flex justify-between text-xs text-blue-600">
                <span>โค้ดส่วนลด</span>
                <span>{order.promoCode}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base mt-2">
              <span>ยอดรวมทั้งสิ้น</span>
              <span>฿{formatTHB(order.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-8 text-[10px] text-gray-400">
            <p>ขอบคุณที่ใช้บริการ</p>
            <p>ZURI — THE AI BUSINESS PLATFORM</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => window.print()}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main POS Page ─────────────────────────────────────────────────────────────

export default function POSPage() {
  const router = useRouter()
  
  // Auto-redirect to mobile on small screens
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        router.push('/pos/mobile')
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [router])
  
  // Session — cashier info
  const { user } = useSession()
  const cashierName = user?.name ?? ''

  // Products
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [search,     setSearch]     = useState('')
  const [prodLoading, setProdLoading] = useState(true)
  const [error,        setError]        = useState(null)

  // Cart
  const [cart, setCart] = useState([]) // [{id, productId, name, unitPrice, qty, discount}]

  // Discount state
  const [discountType,  setDiscountType]  = useState('amount') // 'amount' | 'percent'
  const [discountInput, setDiscountInput] = useState('')

  // Promotion Code
  const [promoCode, setPromoCode] = useState('')

  // UI state
  const [showPayment,  setShowPayment]  = useState(false)
  const [paying,       setPaying]       = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [receiptData,  setReceiptData]  = useState(null)

  // --- Table & Seating State ---
  const [orderType, setOrderType] = useState('TAKEAWAY')
  const [selectedTable, setSelectedTable] = useState(null)
  const [guestCount, setGuestCount] = useState(1)
  const [extraSeats, setExtraSeats] = useState(0)
  const [memberPhone, setMemberPhone] = useState('')

  // Modals
  const [showTableModal, setShowTableModal] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)

  // Search debounce
  const searchTimer = useRef(null)

  // ─── VAT config (from tenant config — hardcode 7% for now) ─────────────────
  const VAT_RATE = 7
  const VAT_INCLUDED = true

  // ─── Derived discount amount ──────────────────────────────────────────────
  const rawInput = parseFloat(discountInput) || 0
  const subtotalRaw = cart.reduce((s, i) => s + (i.unitPrice * i.qty - (i.discount ?? 0)), 0)
  const discount = discountType === 'percent'
    ? Math.round(subtotalRaw * rawInput) / 100
    : rawInput

  // ─── Derived cart totals ──────────────────────────────────────────────────
  const subtotal = subtotalRaw
  const discountedSubtotal = Math.max(0, subtotal - discount)
  const vatAmount = VAT_INCLUDED
    ? discountedSubtotal * VAT_RATE / (100 + VAT_RATE)
    : discountedSubtotal * VAT_RATE / 100
  const total = VAT_INCLUDED ? discountedSubtotal : discountedSubtotal + vatAmount

  // ─── Fetch products ───────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (cat, q) => {
    setProdLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ isPosVisible: 'true', limit: '100' })
      if (cat) params.set('category', cat)
      if (q)   params.set('search', q)
      const res = await fetch(`/api/products?${params}`)
      const json = await res.json()
      if (res.ok) {
        setProducts(json.data.products ?? [])
      } else {
        setError(json.error || 'Failed to load products')
      }
    } catch (err) {
      console.error('[POS] products error', err)
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setProdLoading(false)
    }
  }, [])

  // Category labels from system_config.yaml (simplified for UI)
  const [catLabels, setCatLabels] = useState({})

   // Fetch categories once
  useEffect(() => {
    async function loadCats() {
      try {
        // Fetch categories list
        const res = await fetch('/api/products?categories=1')
        const json = await res.json()
        if (res.ok) setCategories(json.data ?? [])

        // In a real app, we'd fetch these from a config API
        // For now, we'll use a mapping based on system_config.yaml
        setCatLabels({
          'japanese_culinary': 'อาหารญี่ปุ่น',
          'specialty': 'พิเศษ',
          'management': 'การจัดการ',
          'arts': 'ศิลปะ',
          'package': 'แพ็คเกจ',
          'full_course': 'คอร์สเต็ม',
          'course': 'คอร์สทั่วไป',
          'food': 'เมนูหลัก',
          'side_dish': 'เครื่องเคียง',
          'beverage': 'เครื่องดื่ม',
          'snack': 'ของว่าง',
          'dessert': 'ของหวาน',
          'knife': 'มีด',
          'kitchen': 'อุปกรณ์ครัว',
        })
      } catch {}
    }
    loadCats()
    fetchProducts(null, null)
  }, [fetchProducts])

  // ─── Cart handlers ────────────────────────────────────────────────────────
  function addToCart(product) {
    const price = product.posPrice ?? product.basePrice ?? 0
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        id:        crypto.randomUUID(),
        productId: product.id,   // use UUID for DB FK, not the custom productId string
        name:      product.name,
        unitPrice: price,
        qty:       1,
        discount:  0,
      }]
    })
  }

  function addQuickSale() {
    const name = window.prompt('ระบุชื่อรายการขายด่วน', 'รายการพิเศษ')
    if (!name) return
    const priceStr = window.prompt('ระบุราคาสินค้า', '0')
    const price = parseFloat(priceStr)
    if (isNaN(price)) return

    setCart(prev => [
      ...prev,
      {
        id:        crypto.randomUUID(),
        productId: null,
        name:      name,
        unitPrice: price,
        qty:       1,
        discount:  0,
      }
    ])
  }

  function updateQty(itemId, newQty) {
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.id !== itemId))
    } else {
      setCart(prev => prev.map(i => i.id === itemId ? { ...i, qty: newQty } : i))
    }
  }

  function removeItem(itemId) {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  function clearCart() {
    setCart([])
    setDiscountInput('')
    setPromoCode('')
  }

  // ─── Search debounce ──────────────────────────────────────────────────────
  function handleSearch(val) {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchProducts(activeCategory, val), 300)
  }

  function handleCategory(cat) {
    setActiveCategory(cat)
    fetchProducts(cat, search)
  }

  // ─── Payment ──────────────────────────────────────────────────────────────
  async function handlePay({ method, cashReceived }) {
    setPaying(true)
    try {
      // 1. Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: orderType,
          tableId:   selectedTable?.id,
          guestCount: guestCount,
          extraSeats: extraSeats,
          items: cart.map(i => ({
            productId: i.productId,
            name:      i.name,
            unitPrice: i.unitPrice,
            qty:       i.qty,
            discount:  i.discount ?? 0,
          })),
          discountAmount: discount,
          notes: promoCode ? `PROMO:${promoCode}` : undefined,
          vatRate: VAT_RATE,
          vatIncluded: VAT_INCLUDED,
        }),
      })
      const orderJson = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderJson.error ?? 'สร้าง order ไม่ได้')

      // 2. Process payment
      const payRes = await fetch(`/api/orders/${orderJson.data.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, cashReceived }),
      })
      const payJson = await payRes.json()
      if (!payRes.ok) throw new Error(payJson.error ?? 'ชำระเงินไม่ได้')

      setShowPayment(false)
      setSuccessOrder(payJson.data.orderId)
      setReceiptData({ ...payJson.data, promoCode })
      clearCart()
      setSelectedTable(null)
      setGuestCount(1)
      setExtraSeats(0)
      setOrderType('TAKEAWAY')
      setMemberPhone('')
    } catch (err) {
      alert(err.message)
    } finally {
      setPaying(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-gray-50">

      {/* ── LEFT: Product Browser ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <button
            onClick={addQuickSale}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-100 text-orange-600 rounded-lg text-sm hover:bg-orange-200 transition-colors font-medium"
          >
            <Plus size={14} />
            ขายด่วน
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
            <BarChart2 size={14} />
            สรุปยอด
          </button>
        </div>

        {/* Category pills */}
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => handleCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              !activeCategory ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {catLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {prodLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 animate-pulse">
                  <div className="h-24 bg-gray-100 rounded-lg mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-red-50 rounded-2xl border border-red-100">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <X size={24} />
              </div>
              <p className="text-red-700 font-bold mb-1">พบปัญหาการเชื่อมต่อฐานข้อมูล</p>
              <p className="text-red-500 text-xs mb-4">{error}</p>
              <button 
                onClick={() => fetchProducts(activeCategory, search)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-lg"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <ShoppingCart size={40} className="mb-2 opacity-30" />
              <p className="text-sm font-bold">ไม่พบสินค้า</p>
              <p className="text-xs mt-1 text-gray-300">ลองเปลี่ยนการค้นหาหรือหมวดหมู่</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart Panel ── */}
      <div className="w-80 xl:w-96 bg-white border-l border-gray-100 flex flex-col flex-shrink-0">

        {/* Cart header + cashier name */}
        <div className="px-4 py-3 border-b border-gray-100">
          {/* Order Type + Table Row */}
          <div className="flex items-center gap-2 mb-2">
            {ORDER_TYPES.map(t => {
              const isActive = orderType === t.key || (t.key === 'DELIVERY' && orderType.startsWith('DELIVERY'))
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    if (t.key === 'DELIVERY') setOrderType('DELIVERY_INSTANT')
                    else setOrderType(t.key)
                  }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                    isActive ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  <t.icon size={16} />
                  <span className="text-[10px] font-bold uppercase">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Delivery Subtypes */}
          {orderType.startsWith('DELIVERY') && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl mb-4 border border-gray-100"
            >
              {DELIVERY_SUBTYPES.map(st => (
                <button
                  key={st.key}
                  onClick={() => setOrderType(st.key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${
                    orderType === st.key ? 'bg-white shadow-sm text-orange-600 ring-1 ring-orange-200' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <st.icon size={12} />
                  <span className="text-[9px] font-bold">{st.label}</span>
                </button>
              ))}
            </motion.div>
          )}

          {orderType === 'DINE_IN' && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowTableModal(true)}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all ${
                  selectedTable ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="text-xs font-bold">{selectedTable ? selectedTable.name : 'เลือกโต๊ะ'}</span>
                </div>
                <ChevronDown size={12} />
              </button>
              <button
                onClick={() => setShowGuestModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-100 text-gray-600 hover:border-gray-200"
              >
                <Users size={14} />
                <span className="text-xs font-bold">{guestCount}{extraSeats > 0 ? `+${extraSeats}` : ''}</span>
              </button>
            </div>
          )}

          {/* Member Number Input */}
          <div className="mb-4 relative">
            <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={memberPhone}
              onChange={e => setMemberPhone(e.target.value)}
              placeholder="เบอร์โทรศัพท์สมาชิก..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-medium"
            />
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-orange-500" />
              <span className="text-sm font-semibold text-gray-900">
                ตะกร้า {cart.length > 0 && <span className="text-orange-500">({cart.reduce((s, i) => s + i.qty, 0)})</span>}
              </span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1">
                <Trash2 size={11} /> ล้าง
              </button>
            )}
          </div>
          {/* Cashier name */}
          {cashierName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <User size={11} className="text-gray-400" />
              <span>ผู้ออกบิล: <span className="font-medium text-gray-700">{cashierName}</span></span>
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300">
              <ShoppingCart size={32} className="mb-2" />
              <p className="text-sm">เพิ่มสินค้าเพื่อเริ่มออเดอร์</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.id}
                item={item}
                onQty={updateQty}
                onRemove={removeItem}
              />
            ))
          )}
        </div>

        {/* Discount + Promo Code section */}
        {cart.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 space-y-2.5">

            {/* Discount row */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                <Tag size={11} />
                ส่วนลดท้ายบิล
              </p>
              <div className="flex items-center gap-2">
                {/* Toggle type */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                  <button
                    onClick={() => setDiscountType('amount')}
                    className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                      discountType === 'amount'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign size={10} />
                    ฿
                  </button>
                  <button
                    onClick={() => setDiscountType('percent')}
                    className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                      discountType === 'percent'
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Percent size={10} />
                    %
                  </button>
                </div>
                {/* Input */}
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : undefined}
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  placeholder={discountType === 'percent' ? '0 %' : '0.00 ฿'}
                  className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {discountInput && (
                  <button
                    onClick={() => setDiscountInput('')}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {/* Show computed discount when percent mode */}
              {discountType === 'percent' && rawInput > 0 && (
                <p className="text-xs text-green-600 mt-1 text-right">
                  = -฿{formatTHB(discount)}
                </p>
              )}
            </div>

            {/* Promotion Code row */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                <Tag size={11} />
                โค้ดโปรโมชัน
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="กรอก CODE ที่นี่"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                />
                {promoCode && (
                  <button
                    onClick={() => setPromoCode('')}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>ยอดรวม</span>
            <span>฿{formatTHB(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>
                ส่วนลด
                {discountType === 'percent' && rawInput > 0 && ` (${rawInput}%)`}
              </span>
              <span>-฿{formatTHB(discount)}</span>
            </div>
          )}
          {promoCode && (
            <div className="flex justify-between text-blue-500 text-xs">
              <span>โค้ด: {promoCode}</span>
              <span className="text-gray-400">บันทึกแล้ว</span>
            </div>
          )}
          <div className="flex justify-between text-gray-500">
            <span>VAT 7% (รวม)</span>
            <span>฿{formatTHB(vatAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
            <span>รวมทั้งสิ้น</span>
            <span className="text-orange-600">฿{formatTHB(total)}</span>
          </div>
        </div>

        {/* Pay button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl font-bold text-base transition-colors"
          >
            ชำระเงิน
          </button>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          discountAmount={discount}
          promoCode={promoCode}
          loading={paying}
          onConfirm={handlePay}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Success toast */}
      {successOrder && (
        <SuccessToast
          orderId={successOrder}
          onReceipt={() => {}}
          onClose={() => setSuccessOrder(null)}
        />
      )}

      {/* Receipt modal */}
      {receiptData && (
        <ReceiptModal
          order={receiptData}
          cashierName={cashierName}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Table Selection Modal */}
      {showTableModal && (
        <TableModal
          onClose={() => setShowTableModal(false)}
          onSelectTable={(t) => { setSelectedTable(t); setShowTableModal(false); }}
          currentTableId={selectedTable?.id}
        />
      )}

      {/* Guest Count Modal */}
      {showGuestModal && (
        <GuestCountModal
          onClose={() => setShowGuestModal(false)}
          onConfirm={(gc, es) => { setGuestCount(gc); setExtraSeats(es); setShowGuestModal(false); }}
          initialCount={guestCount}
          initialExtra={extraSeats}
        />
      )}
    </div>
  )
}

// --- Helper Components for Table/Guest ---

function TableModal({ onClose, onSelectTable, currentTableId }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch('/api/pos/tables')
        const json = await res.json()
        if (res.ok) setTables(json.data || [])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetchTables()
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm border-0">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold">เลือกโต๊ะ</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="animate-spin text-orange-500" /></div>
          ) : tables.length === 0 ? (
             <div className="text-center py-12 text-gray-400">ไม่พบโต๊ะที่พร้อมใช้งาน</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {tables.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTable(t)}
                  className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                    currentTableId === t.id ? 'border-orange-500 bg-orange-50 text-orange-600' :
                    t.status === 'OCCUPIED' ? 'border-red-100 bg-red-50 text-red-500 opacity-60' : 'border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {t.name}
                  <div className="text-[10px] font-normal opacity-50">{t.status === 'OCCUPIED' ? 'มีลูกค้า' : 'ว่าง'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GuestCountModal({ onClose, onConfirm, initialCount, initialExtra }) {
  const [gc, setGc] = useState(initialCount)
  const [es, setEs] = useState(initialExtra)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm border-0">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">ระบุจำนวนคน</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-left">จำนวนลูกค้า</p>
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <button onClick={() => setGc(Math.max(1, gc - 1))} className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center shadow-sm"><Minus size={16} /></button>
               <span className="text-3xl font-black">{gc}</span>
               <button onClick={() => setGc(gc + 1)} className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center shadow-sm"><Plus size={16} /></button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-left">เสริมเก้าอี้</p>
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <button onClick={() => setEs(Math.max(0, es - 1))} className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center shadow-sm"><Minus size={16} /></button>
               <span className="text-3xl font-black">{es}</span>
               <button onClick={() => setEs(es + 1)} className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center shadow-sm"><Plus size={16} /></button>
            </div>
          </div>
          <button
            onClick={() => onConfirm(gc, es)}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-100 mt-4 active:scale-95 transition-all"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  )
}
