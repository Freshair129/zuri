'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/useSession'
import {
  Search, ShoppingCart, Plus, ChevronLeft, X,
  Loader2, Minus, UserPlus, Phone, User,
  CheckCircle, MapPin, Printer
} from 'lucide-react'
import { ORDER_TYPES, DELIVERY_SUBTYPES, CAT_LABELS, formatTHB } from '@/components/pos/mobile/constants'
import CartDrawer from '@/components/pos/mobile/CartDrawer'
import PaymentFlow from '@/components/pos/mobile/PaymentFlow'
import ReceiptModal from '@/components/pos/mobile/ReceiptModal'

// ── Header ──
function Header({ member, onOpenMember, cashierName, selectedTable, onOpenTableSelection, orderType }) {
  const isDelivery = orderType.startsWith('DELIVERY')
  const typeInfo = isDelivery
    ? (DELIVERY_SUBTYPES.find(s => s.key === orderType) || ORDER_TYPES.find(t => t.key === 'DELIVERY'))
    : ORDER_TYPES.find(t => t.key === orderType)

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 overflow-hidden">
        <button className="p-1 -ml-1 flex-shrink-0" onClick={() => window.history.back()}><ChevronLeft size={24} /></button>
        <div className="flex flex-col overflow-hidden">
          <h1 className="font-bold text-base truncate">POS Mobile</h1>
          <p className="text-[10px] text-gray-400 truncate">ผู้ออกบิล: {cashierName || '...'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-bold border ${
          typeInfo?.key === 'ONSITE' ? 'bg-orange-50 border-orange-200 text-orange-700' :
          typeInfo?.key === 'DELIVERY' ? 'bg-blue-50 border-blue-200 text-blue-700' :
          'bg-green-50 border-green-200 text-green-700'
        }`}>
          {typeInfo && <typeInfo.icon size={12} />}
          <span className="truncate max-w-[60px]">{typeInfo?.label}</span>
        </div>
        {orderType === 'ONSITE' && (
          <button onClick={onOpenTableSelection}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-bold transition-colors border ${
              selectedTable ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
            <MapPin size={12} />
            <span className="truncate max-w-[60px]">{selectedTable ? selectedTable.name : 'เลือกโต๊ะ'}</span>
          </button>
        )}
        <button onClick={onOpenMember}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-bold transition-colors border ${
            member ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
          {member ? <CheckCircle size={12} /> : <UserPlus size={12} />}
          <span className="truncate max-w-[60px]">{member ? (member.name || member.phonePrimary) : 'สมาชิก'}</span>
        </button>
      </div>
    </div>
  )
}

// ── Order Type Selector ──
function OrderTypeSelector({ orderType, onSelectType }) {
  const isDelivery = orderType.startsWith('DELIVERY')
  return (
    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">ประเภทการขาย</p>
        <div className="grid grid-cols-3 gap-2">
          {ORDER_TYPES.map(type => (
            <button key={type.key}
              onClick={() => type.key === 'DELIVERY' ? onSelectType('DELIVERY_INSTANT') : onSelectType(type.key)}
              className={`p-3 rounded-2xl border-2 transition-all text-center ${
                (orderType === type.key || (type.key === 'DELIVERY' && isDelivery))
                  ? 'bg-white border-orange-500 shadow-lg shadow-orange-100'
                  : 'bg-white border-gray-100 text-gray-600'
              }`}>
              <type.icon size={20} className="mx-auto mb-1" />
              <p className="text-xs font-bold">{type.label}</p>
              <p className="text-[9px] text-gray-400">{type.desc}</p>
            </button>
          ))}
        </div>
      </div>
      {isDelivery && (
        <div className="animate-fade-in">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">ประเภทการจัดส่ง</p>
          <div className="grid grid-cols-3 gap-2">
            {DELIVERY_SUBTYPES.map(st => (
              <button key={st.key} onClick={() => onSelectType(st.key)}
                className={`p-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                  orderType === st.key ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500'
                }`}>
                <st.icon size={14} />
                <p className="text-[10px] font-bold leading-tight">{st.label.split(' (')[0]}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Table Modal ──
function TableModal({ onClose, onSelectTable, currentTableId, orderType }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (orderType !== 'ONSITE') return
    fetch('/api/pos/tables').then(r => r.json()).then(j => setTables(j.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [orderType])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">เลือกโต๊ะ / สถานที่</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto pb-6">
          {loading ? <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
          : tables.length === 0 ? <div className="py-12 text-center text-gray-400">ไม่พบข้อมูลโต๊ะ</div>
          : (
            <div className="grid grid-cols-3 gap-3">
              {tables.map(t => (
                <button key={t.id} onClick={() => { onSelectTable(t); onClose() }}
                  className={`p-4 rounded-2xl border text-sm font-bold transition-all ${
                    currentTableId === t.id ? 'bg-orange-500 border-orange-500 text-white shadow-lg' :
                    t.status === 'OCCUPIED' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-white border-gray-100 text-gray-800'
                  }`}>
                  {t.name}
                  <div className="text-[10px] opacity-60 font-normal">{t.status === 'OCCUPIED' ? 'มีลูกค้า' : 'ว่าง'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Guest Count Modal ──
function GuestCountModal({ onClose, onConfirm, initialCount = 1 }) {
  const [guestCount, setGuestCount] = useState(initialCount)
  const [extraSeats, setExtraSeats] = useState(0)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">ระบุจำนวนคน</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="space-y-6">
          {[
            { label: 'จำนวนลูกค้า', value: guestCount, setter: setGuestCount, min: 1 },
            { label: 'เสริมเก้าอี้เพิ่มเติม', value: extraSeats, setter: setExtraSeats, min: 0 },
          ].map((f, i) => (
            <div key={i}>
              <p className="text-sm font-bold text-gray-600 mb-3">{f.label}</p>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <button onClick={() => f.setter(Math.max(f.min, f.value - 1))} className="p-2 bg-white rounded-lg border active:bg-gray-100"><Minus size={20} /></button>
                <input type="number" value={f.value} onChange={e => f.setter(Math.max(f.min, parseInt(e.target.value) || f.min))}
                  className="flex-1 text-center text-3xl font-black bg-transparent outline-none" />
                <button onClick={() => f.setter(f.value + 1)} className="p-2 bg-white rounded-lg border active:bg-gray-100"><Plus size={20} /></button>
              </div>
            </div>
          ))}
          <button onClick={() => onConfirm(guestCount, extraSeats)}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg">ยืนยัน</button>
        </div>
      </div>
    </div>
  )
}

// ── Member Modal (phone search + quick registration) ──
function MemberModal({ onClose, onSelectMember }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [showQuickReg, setShowQuickReg] = useState(false)
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')

  const searchMember = async () => {
    if (!phone) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?search=${phone}`)
      const json = await res.json()
      if (json.data?.customers?.length > 0) { onSelectMember(json.data.customers[0]); onClose() }
      else { setShowQuickReg(true); setRegPhone(phone) }
    } catch (err) { console.error('[MemberModal]', err) }
    finally { setLoading(false) }
  }

  const quickRegister = async () => {
    if (!regName && !regPhone) return
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName || 'ลูกค้าใหม่', phonePrimary: regPhone })
      })
      const json = await res.json()
      if (res.ok) { onSelectMember(json.data); onClose() }
    } catch (err) { console.error('[MemberModal]', err) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">ระบบสมาชิก</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        {!showQuickReg ? (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">กรอกเบอร์โทรศัพท์เพื่อตรวจสอบสมาชิกสำหรับสะสมแต้ม</p>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="เบอร์โทรศัพท์"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none text-lg" />
            </div>
            <button onClick={searchMember} disabled={loading || !phone}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'ตรวจสอบ'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-4">
              <p className="text-orange-700 text-sm font-medium">ไม่พบข้อมูลสมาชิก! ลงทะเบียนเร่งด่วนได้ที่นี่</p>
              <p className="text-orange-500 text-xs mt-1">กรอกแค่ชื่อหรือเบอร์โทร — แก้ไขข้อมูลทีหลังได้</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="ชื่อ (ไม่บังคับ)"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="เบอร์โทรศัพท์"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <button onClick={quickRegister} disabled={loading}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'ลงทะเบียนและใช้งาน'}
            </button>
            <button onClick={() => setShowQuickReg(false)} className="w-full py-2 text-gray-500 text-sm">กลับไปค้นหา</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Product Grid (Lineman-style) ──
function ProductGrid({ products, onAdd, loading }) {
  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
  if (products.length === 0) return (
    <div className="p-12 text-center space-y-4">
      <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-gray-300"><ShoppingCart size={40} /></div>
      <div className="space-y-1"><p className="text-gray-500 font-bold">ไม่พบสินค้า</p></div>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pb-48">
      {products.map(p => (
        <div
          key={p.id}
          onClick={() => onAdd(p)}
          className="relative rounded-[20px] overflow-hidden shadow-md active:scale-95 transition-transform cursor-pointer"
          style={{ height: '160px' }}
        >
          {/* Full-bleed background */}
          <div className="absolute inset-0 z-0">
            {p.imageUrl
              ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#fed7aa 0%,#fb923c 55%,#ea580c 100%)' }}>
                  <ShoppingCart size={28} className="text-white/50" />
                </div>
            }
          </div>
          {/* Gradient overlay from bottom */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1A1710]/90 via-[#1A1710]/25 to-black/5" />
          {/* Content at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
            <p className="text-white text-[12px] font-semibold line-clamp-1 leading-tight">{p.name}</p>
            <p className="text-[#E8820C] text-[13px] font-bold mt-0.5">฿{formatTHB(p.posPrice || p.basePrice)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Success Screen ──
function SuccessScreen({ orderId, orderData, onNewOrder, onOpenReceipt }) {
  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-8 animate-bounce-in">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={56} />
      </div>
      <h2 className="text-3xl font-black mb-2">ชำระเงินสำเร็จ!</h2>
      <p className="text-gray-500 mb-12">ออเดอร์เลขที่: <span className="font-bold text-gray-900">{orderId}</span></p>
      <div className="w-full space-y-3">
        <button onClick={onOpenReceipt}
          className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2">
          <Printer size={20} /> พิมพ์ใบเสร็จ / ใบกำกับภาษี
        </button>
        <button onClick={onNewOrder}
          className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-orange-200">
          รับออเดอร์ใหม่
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN PAGE ORCHESTRATOR
// ══════════════════════════════════════════
export default function POSMobile() {
  const { user } = useSession()

  // Products & categories
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Cart
  const [cart, setCart] = useState([])

  // Order state
  const [member, setMember] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [orderType, setOrderType] = useState('ONSITE')
  const [guestCount, setGuestCount] = useState(1)
  const [extraSeats, setExtraSeats] = useState(0)
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('AMOUNT')
  const [promoCode, setPromoCode] = useState('')

  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [showGuestCountModal, setShowGuestCountModal] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [successOrder, setSuccessOrder] = useState(null)
  const [lastOrderData, setLastOrderData] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const cashierName = user?.name || '...'

  // ── Product fetching ──
  const fetchProducts = useCallback(async (cat, q) => {
    setLoading(true)
    try {
      let url = '/api/products?isPosVisible=true'
      if (cat) url += `&category=${cat}`
      if (q) url += `&search=${q}`
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) setProducts(json.data?.products || [])
    } catch (err) { console.error('[POSMobile]', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/products?categories=1').then(r => r.json()).then(j => setCategories(j.data ?? [])).catch(() => {})
    fetchProducts(null, null)
  }, [fetchProducts])

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(activeCategory, search), 400)
    return () => clearTimeout(timer)
  }, [search, activeCategory, fetchProducts])

  // ── Cart operations ──
  const addToCart = (product) => {
    const existing = cart.find(item => item.productId === product.id)
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id, // UUID FK — matches OrderItem.productId (ADR-075)
        name: product.name,
        category: product.category,
        unitPrice: product.posPrice || product.basePrice,
        qty: 1,
        scheduleId: null,
      }])
    }
  }

  const updateCartItem = (id, updates) => {
    if (updates.qty === 0) { setCart(cart.filter(item => item.id !== id)); return }
    setCart(cart.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id))
  const total = cart.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0)

  // ── Payment handler ──
  const handlePayment = async (paymentData) => {
    setIsPaying(true)
    try {
      const orderPayload = {
        customerId: paymentData.memberId,
        tableId: paymentData.tableId,
        orderType: paymentData.orderType,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          scheduleId: item.scheduleId,
        })),
        subtotalAmount: paymentData.subtotal,
        totalAmount: paymentData.total,
        discountAmount: paymentData.discount,
        vatAmount: paymentData.vatAmount,
        paymentMethod: paymentData.method,
        cashReceived: paymentData.cashReceived,
        notes: paymentData.promoCode ? `PROMO:${paymentData.promoCode}` : undefined,
        status: 'PAID',
        guestCount: paymentData.guestCount,
        extraSeats: paymentData.extraSeats,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      const json = await res.json()
      if (res.ok) {
        const receiptData = {
          orderId: json.data.orderId,
          items: cart,
          member,
          paymentMethod: paymentData.method,
          totalAmount: paymentData.total,
          subtotal: paymentData.subtotal,
          discountAmount: paymentData.discount,
          vatAmount: paymentData.vatAmount,
          cashReceived: paymentData.cashReceived,
          invoiceType: paymentData.invoiceType,
        }
        setLastOrderData(receiptData)
        setSuccessOrder(json.data.orderId)
        setCart([])
        setMember(null)
        setSelectedTable(null)
        setDiscount('')
        setPromoCode('')
        setGuestCount(1)
        setExtraSeats(0)
        setShowPayment(false)
      } else {
        alert(json.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('[POSMobile] Payment error:', err)
      alert('เกิดข้อผิดพลาดในการบันทึกออเดอร์')
    } finally {
      setIsPaying(false)
    }
  }

  // ── Render ──
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans selection:bg-orange-100 overflow-hidden">
      <Header
        member={member} onOpenMember={() => setShowMemberModal(true)}
        cashierName={cashierName} selectedTable={selectedTable}
        onOpenTableSelection={() => setShowTableModal(true)} orderType={orderType}
      />

      <OrderTypeSelector orderType={orderType} onSelectType={setOrderType} />

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาเมนู..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-orange-500/20" />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
          <button onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              !activeCategory ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100' : 'bg-white border-gray-200 text-gray-500'
            }`}>ทั้งหมด</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                activeCategory === cat ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100' : 'bg-white border-gray-200 text-gray-500'
              }`}>{CAT_LABELS[cat] || cat}</button>
          ))}
        </div>

        <ProductGrid products={products} onAdd={addToCart} loading={loading} />
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        cart={cart} updateCartItem={updateCartItem} removeFromCart={removeFromCart} total={total}
        onCheckout={() => orderType === 'ONSITE' ? setShowGuestCountModal(true) : setShowPayment(true)}
      />

      {/* Modals */}
      {showMemberModal && <MemberModal onClose={() => setShowMemberModal(false)} onSelectMember={setMember} />}
      {showTableModal && <TableModal onClose={() => setShowTableModal(false)} onSelectTable={setSelectedTable} currentTableId={selectedTable?.id} orderType={orderType} />}
      {showGuestCountModal && (
        <GuestCountModal onClose={() => setShowGuestCountModal(false)} initialCount={guestCount}
          onConfirm={(gc, es) => { setGuestCount(gc); setExtraSeats(es); setShowGuestCountModal(false); setShowPayment(true) }} />
      )}
      {showPayment && (
        <PaymentFlow
          total={total} member={member} selectedTable={selectedTable}
          discount={discount} discountType={discountType} setDiscount={setDiscount} setDiscountType={setDiscountType}
          promoCode={promoCode} setPromoCode={setPromoCode}
          guestCount={guestCount} extraSeats={extraSeats} orderType={orderType}
          onClose={() => setShowPayment(false)} onConfirm={handlePayment} loading={isPaying}
        />
      )}
      {successOrder && (
        <SuccessScreen orderId={successOrder} orderData={lastOrderData}
          onNewOrder={() => { setSuccessOrder(null); setLastOrderData(null) }}
          onOpenReceipt={() => setShowReceipt(true)} />
      )}
      {showReceipt && lastOrderData && (
        <ReceiptModal order={lastOrderData} onClose={() => setShowReceipt(false)} />
      )}

      <style jsx global>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
