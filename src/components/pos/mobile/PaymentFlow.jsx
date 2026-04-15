'use client'

import { useState } from 'react'
import {
  X, ChevronLeft, Percent, Loader2, CheckCircle,
  Printer, Receipt, Building2, FileText
} from 'lucide-react'
import { PAYMENT_METHODS, CASH_BILLS, CASH_COINS, ORDER_TYPES, DELIVERY_SUBTYPES, formatTHB } from './constants'

// ── Cash denomination button with Thai banknote/coin styling ──
function CashButton({ item, onClick }) {
  const isBill = item.type === 'bill'
  return (
    <button
      onClick={() => onClick(item.value)}
      className="relative overflow-hidden rounded-2xl border-2 border-gray-100 active:scale-95 transition-all shadow-sm hover:shadow-md"
      style={{ background: item.color }}
    >
      <div className="py-4 px-2 text-center">
        {isBill && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1 left-1 w-6 h-6 border border-white/30 rounded-full" />
            <div className="absolute bottom-1 right-1 w-8 h-8 border border-white/30 rounded-full" />
          </div>
        )}
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70" style={{ color: item.textColor }}>
          {isBill ? 'แบงก์' : 'เหรียญ'}
        </p>
        <p className="text-2xl font-black" style={{ color: item.textColor }}>
          {isBill ? `฿${item.label}` : `${item.label}฿`}
        </p>
      </div>
    </button>
  )
}

// ── QR PromptPay screen ──
function QRPaymentScreen({ total, onConfirm, onPrintQR, loading }) {
  // Generate PromptPay QR data URL using a simple payload
  // In production, this should call /api/pos/promptpay-qr with amount
  const promptPayPhone = '0812345678' // TODO: read from tenant config
  const qrData = `https://promptpay.io/${promptPayPhone}/${total.toFixed(2)}`

  return (
    <div className="space-y-6">
      <div className="text-center py-2">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">ยอดชำระ</p>
        <h2 className="text-3xl font-black text-gray-900">฿{formatTHB(total)}</h2>
      </div>

      {/* QR Code display */}
      <div className="bg-white rounded-3xl border-2 border-blue-100 p-6 text-center shadow-inner">
        <div className="bg-blue-50 rounded-2xl p-6 mb-4">
          <img
            src={`https://promptpay.io/${promptPayPhone}/${total.toFixed(2)}.png`}
            alt="PromptPay QR"
            className="w-48 h-48 mx-auto rounded-xl"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextElementSibling.style.display = 'flex'
            }}
          />
          <div className="hidden w-48 h-48 mx-auto bg-gray-100 rounded-xl items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl">📱</div>
              <p className="text-xs text-gray-500">QR จะแสดงเมื่อตั้งค่า<br/>PromptPay แล้ว</p>
            </div>
          </div>
        </div>
        <p className="text-sm font-bold text-gray-600">สแกน QR เพื่อชำระเงิน</p>
        <p className="text-xs text-gray-400 mt-1">PromptPay: {promptPayPhone}</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onPrintQR}
          className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
        >
          <Printer size={18} />
          ปริ้นใบ QR
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
          ยืนยันเงินเข้า
        </button>
      </div>
    </div>
  )
}

// ── Card payment (EDC) screen ──
function CardPaymentScreen({ total, onConfirm, loading }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">ยอดชำระ</p>
        <h2 className="text-3xl font-black text-gray-900">฿{formatTHB(total)}</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 text-center border border-indigo-100">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-4xl">💳</span>
        </div>
        <h3 className="font-black text-xl mb-2">เสียบ/แตะบัตรที่เครื่อง EDC</h3>
        <p className="text-gray-500 text-sm">รอลูกค้ากรอก PIN หรือเซ็นรับ</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex gap-1">
            {['VISA', 'MC', 'JCB'].map(brand => (
              <span key={brand} className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-gray-500 border">{brand}</span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-lg active:scale-95 transition-transform"
      >
        {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'ยืนยัน — บัตรผ่านแล้ว'}
      </button>
    </div>
  )
}

// ── Cash input screen with banknote/coin images ──
function CashInputScreen({ total, cashInput, onAdd, onClear, onExact, onNext }) {
  const change = cashInput - total

  return (
    <div className="space-y-5">
      {/* Amount display */}
      <div className="text-center py-3 bg-gradient-to-br from-gray-50 to-orange-50 rounded-3xl border">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">ยอดชำระ ฿{formatTHB(total)}</p>
        <p className="text-xs text-gray-400 mt-1 mb-2">รับเงินมาแล้ว</p>
        <h2 className="text-4xl font-black text-green-600">฿{formatTHB(cashInput)}</h2>
        {cashInput >= total && (
          <div className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-green-100 text-green-700 rounded-full text-sm font-black animate-bounce-in">
            💰 เงินทอน: ฿{formatTHB(change)}
          </div>
        )}
      </div>

      {/* Banknotes */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">ธนบัตร</p>
        <div className="grid grid-cols-3 gap-2">
          {CASH_BILLS.map(bill => (
            <CashButton key={bill.value} item={bill} onClick={onAdd} />
          ))}
        </div>
      </div>

      {/* Coins */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">เหรียญ</p>
        <div className="grid grid-cols-4 gap-2">
          {CASH_COINS.map(coin => (
            <CashButton key={coin.value} item={coin} onClick={onAdd} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onClear} className="py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm active:scale-95">
          ล้างข้อมูล
        </button>
        <button onClick={onExact} className="py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm active:scale-95">
          พอดีเป๊ะ
        </button>
      </div>

      <button
        onClick={onNext}
        disabled={cashInput < total}
        className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-green-100 disabled:opacity-50 active:scale-95 transition-transform"
      >
        เปิดลิ้นชักเก็บเงิน 🔓
      </button>
    </div>
  )
}

// ── Main PaymentFlow component ──
export default function PaymentFlow({
  total, onConfirm, onClose, loading, member,
  discount, discountType, setDiscount, setDiscountType,
  promoCode, setPromoCode, selectedTable, guestCount, extraSeats, orderType,
  onOpenReceipt
}) {
  const [step, setStep] = useState('summary') // summary | method | cash_input | qr | card | confirm
  const [method, setMethod] = useState(null)
  const [useVat, setUseVat] = useState(false)
  const [cashInput, setCashInput] = useState(0)
  const [invoiceType, setInvoiceType] = useState('RECEIPT') // RECEIPT | TAX_INVOICE | COMPANY

  const discountVal = parseFloat(discount) || 0
  const calculatedDiscount = discountType === 'PERCENT' ? (total * discountVal / 100) : discountVal
  const subtotal = Math.max(0, total - calculatedDiscount)
  const vatRate = 0.07
  const vatAmount = useVat ? subtotal * vatRate : 0
  const finalTotal = subtotal + vatAmount

  const handleSelectMethod = (key) => {
    setMethod(key)
    if (key === 'CASH') setStep('cash_input')
    else if (key === 'QR') setStep('qr')
    else if (key === 'CARD') setStep('card')
  }

  const handleConfirmPayment = () => {
    onConfirm({
      method,
      total: finalTotal,
      subtotal,
      discount: calculatedDiscount,
      discountType,
      promoCode,
      vatAmount,
      useVat,
      cashReceived: method === 'CASH' ? cashInput : finalTotal,
      memberId: member?.id,
      tableId: selectedTable?.id,
      guestCount,
      extraSeats,
      orderType,
      invoiceType,
    })
  }

  const goBack = () => {
    if (step === 'summary') onClose()
    else if (['cash_input', 'qr', 'card'].includes(step)) setStep('method')
    else if (step === 'confirm') setStep(method === 'CASH' ? 'cash_input' : 'method')
    else setStep('summary')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[95vh] animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-full">
            {step === 'summary' ? <X size={20} /> : <ChevronLeft size={20} />}
          </button>
          <h2 className="font-bold">
            {step === 'summary' && 'สรุปออเดอร์'}
            {step === 'method' && 'เลือกวิธีชำระเงิน'}
            {step === 'cash_input' && 'รับเงินสด'}
            {step === 'qr' && 'โอนเงิน — PromptPay'}
            {step === 'card' && 'เครื่องรูดบัตร'}
            {step === 'confirm' && 'ยืนยันชำระเงิน'}
          </h2>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ── STEP: Order Summary ── */}
          {step === 'summary' && (
            <div className="space-y-6">
              {/* Total */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ยอดรวมสินค้า</span>
                  <span>฿{formatTHB(total)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>ส่วนลด</span>
                    <span>-฿{formatTHB(calculatedDiscount)}</span>
                  </div>
                )}
                {useVat && (
                  <div className="flex justify-between text-sm text-blue-500">
                    <span>VAT 7%</span>
                    <span>+฿{formatTHB(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-bold">ยอดสุทธิ</span>
                  <span className="text-2xl font-black text-orange-600">฿{formatTHB(finalTotal)}</span>
                </div>
              </div>

              {/* Order details */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">รายละเอียด</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-gray-100 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase">ประเภท</p>
                    <p className="font-bold text-sm leading-tight">
                      {orderType.startsWith('DELIVERY')
                        ? (DELIVERY_SUBTYPES.find(s => s.key === orderType)?.label || 'Delivery')
                        : (ORDER_TYPES.find(t => t.key === orderType)?.label || orderType)}
                    </p>
                  </div>
                  {orderType === 'ONSITE' && (
                    <div className="p-3 bg-white border border-gray-100 rounded-xl">
                      <p className="text-[10px] text-gray-400 uppercase">โต๊ะ</p>
                      <p className="font-bold text-sm">{selectedTable?.name || '-'}</p>
                    </div>
                  )}
                  <div className="p-3 bg-white border border-gray-100 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase">จำนวนคน</p>
                    <p className="font-bold text-sm">{guestCount} {extraSeats > 0 ? `+${extraSeats}` : ''}</p>
                  </div>
                  <div className="p-3 bg-white border border-gray-100 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase">ลูกค้า</p>
                    <p className="font-bold text-sm truncate">{member ? (member.name || member.phonePrimary) : 'ทั่วไป'}</p>
                  </div>
                </div>
              </div>

              {/* Discount & VAT */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">ส่วนลดและภาษี</h3>
                <div className="flex gap-2">
                  <div className="flex-1 flex bg-gray-50 rounded-xl p-1 border">
                    <button
                      onClick={() => setDiscountType('AMOUNT')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${discountType === 'AMOUNT' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}
                    >฿</button>
                    <button
                      onClick={() => setDiscountType('PERCENT')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${discountType === 'PERCENT' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}
                    >%</button>
                  </div>
                  <input
                    type="number"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="ส่วนลด"
                    className="flex-[2] bg-gray-50 border rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                {/* VAT toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg border shadow-sm"><Percent size={16} className="text-blue-500" /></div>
                    <span className="text-sm font-bold">VAT 7%</span>
                  </div>
                  <button
                    onClick={() => setUseVat(!useVat)}
                    className={`w-12 h-6 rounded-full transition-all relative ${useVat ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useVat ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {/* Invoice type selector */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">ประเภทเอกสาร</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'RECEIPT', label: 'ใบเสร็จ', icon: Receipt },
                      { key: 'TAX_INVOICE', label: 'ใบกำกับภาษี', icon: FileText },
                      { key: 'COMPANY', label: 'ออกหัวบริษัท', icon: Building2 },
                    ].map(t => (
                      <button
                        key={t.key}
                        onClick={() => setInvoiceType(t.key)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          invoiceType === t.key
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-100 bg-white text-gray-500'
                        }`}
                      >
                        <t.icon size={18} className="mx-auto mb-1" />
                        <p className="text-[10px] font-bold">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('method')}
                className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-orange-100 active:scale-95 transition-transform"
              >
                เลือกวิธีชำระเงิน
              </button>
            </div>
          )}

          {/* ── STEP: Method Selection ── */}
          {step === 'method' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">ยอดชำระทั้งสิ้น</p>
                <h2 className="text-4xl font-black text-gray-900">฿{formatTHB(finalTotal)}</h2>
              </div>
              <div className="grid gap-3">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => handleSelectMethod(m.key)}
                    className="flex items-center gap-4 p-5 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-500 transition-all active:scale-95 group"
                  >
                    <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <m.icon size={24} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-lg">{m.label}</span>
                      <p className="text-xs text-gray-400">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: Cash Input ── */}
          {step === 'cash_input' && (
            <CashInputScreen
              total={finalTotal}
              cashInput={cashInput}
              onAdd={(amt) => setCashInput(prev => prev + amt)}
              onClear={() => setCashInput(0)}
              onExact={() => setCashInput(finalTotal)}
              onNext={() => setStep('confirm')}
            />
          )}

          {/* ── STEP: QR PromptPay ── */}
          {step === 'qr' && (
            <QRPaymentScreen
              total={finalTotal}
              onConfirm={() => setStep('confirm')}
              onPrintQR={() => window.print()}
              loading={loading}
            />
          )}

          {/* ── STEP: Card (EDC) ── */}
          {step === 'card' && (
            <CardPaymentScreen
              total={finalTotal}
              onConfirm={() => setStep('confirm')}
              loading={loading}
            />
          )}

          {/* ── STEP: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-8 py-4">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-black">ยืนยันการชำระเงิน?</h2>
                <p className="text-gray-500">ตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน</p>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 space-y-4 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">วิธีชำระเงิน</span>
                  <span className="font-bold">{PAYMENT_METHODS.find(m => m.key === method)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">ยอดชำระทั้งสิ้น</span>
                  <span className="font-black text-xl">฿{formatTHB(finalTotal)}</span>
                </div>
                {method === 'CASH' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">รับเงินมา</span>
                      <span className="font-bold">฿{formatTHB(cashInput)}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t">
                      <span className="text-gray-400 text-sm">เงินทอน</span>
                      <span className="font-bold text-green-600 text-lg">฿{formatTHB(cashInput - finalTotal)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-4 border-t">
                  <span className="text-gray-400 text-sm">เอกสาร</span>
                  <span className="font-bold text-sm">
                    {invoiceType === 'RECEIPT' && 'ใบเสร็จรับเงิน'}
                    {invoiceType === 'TAX_INVOICE' && 'ใบกำกับภาษี'}
                    {invoiceType === 'COMPANY' && 'ใบกำกับภาษี (บริษัท)'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-green-200 active:scale-95 transition-transform"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'ยืนยันชำระเงินสำเร็จ'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
