'use client'

import { useState } from 'react'
import { X, Printer, Download, Building2, FileText, Receipt, CheckCircle } from 'lucide-react'
import { formatTHB } from './constants'
import { useTenant } from '@/context/TenantContext'

export default function ReceiptModal({ order, onClose }) {
  const { tenant } = useTenant()
  const [companyName, setCompanyName] = useState('')
  const [companyTaxId, setCompanyTaxId] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [printed, setPrinted] = useState(false)

  if (!order) return null

  const isCompanyInvoice = order.invoiceType === 'COMPANY'
  const isTaxInvoice = order.invoiceType === 'TAX_INVOICE' || isCompanyInvoice

  const handlePrint = () => {
    window.print()
    setPrinted(true)
  }

  return (
    <div className="fixed inset-0 z-[55] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="font-bold">
            {isTaxInvoice ? 'ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Company info form for COMPANY invoice */}
          {isCompanyInvoice && (
            <div className="space-y-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-blue-600" />
                <p className="text-sm font-bold text-blue-700">ข้อมูลบริษัท (สำหรับออกใบกำกับภาษี)</p>
              </div>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="ชื่อบริษัท / ห้างหุ้นส่วน"
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={companyTaxId}
                onChange={e => setCompanyTaxId(e.target.value)}
                placeholder="เลขประจำตัวผู้เสียภาษี (13 หลัก)"
                maxLength={13}
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={companyAddress}
                onChange={e => setCompanyAddress(e.target.value)}
                placeholder="ที่อยู่บริษัท"
                className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          {/* Receipt preview */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 font-mono text-xs space-y-3" id="receipt-print">
            <div className="text-center border-b border-dashed border-gray-300 pb-3">
              {tenant?.logoUrl && (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-10 mx-auto mb-2 object-contain" />
              )}
              <p className="font-bold text-sm">{tenant?.name ?? '—'}</p>
              {tenant?.businessHours?.address && (
                <p className="text-gray-500">{tenant.businessHours.address}</p>
              )}
              {isTaxInvoice && <p className="text-blue-600 font-bold mt-1">— ใบกำกับภาษี —</p>}
            </div>

            {isCompanyInvoice && companyName && (
              <div className="border-b border-dashed border-gray-300 pb-3">
                <p className="text-gray-500">ออกให้:</p>
                <p className="font-bold">{companyName}</p>
                {companyTaxId && <p>TAX ID: {companyTaxId}</p>}
                {companyAddress && <p className="text-gray-500">{companyAddress}</p>}
              </div>
            )}

            <div className="border-b border-dashed border-gray-300 pb-3 space-y-1">
              <div className="flex justify-between">
                <span>เลขที่:</span>
                <span className="font-bold">{order.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>วันที่:</span>
                <span>{new Date().toLocaleDateString('th-TH')}</span>
              </div>
              <div className="flex justify-between">
                <span>ชำระ:</span>
                <span>{order.paymentMethod === 'CASH' ? 'เงินสด' : order.paymentMethod === 'QR' ? 'โอนเงิน' : 'บัตร'}</span>
              </div>
              {order.member && (
                <div className="flex justify-between">
                  <span>สมาชิก:</span>
                  <span>{order.member.name || order.member.phonePrimary}</span>
                </div>
              )}
            </div>

            <div className="border-b border-dashed border-gray-300 pb-3 space-y-1">
              {order.items?.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="flex-1 truncate">{item.name} x{item.qty}</span>
                  <span>฿{formatTHB(item.unitPrice * item.qty)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>รวม:</span>
                <span>฿{formatTHB(order.subtotal || order.totalAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>ส่วนลด:</span>
                  <span>-฿{formatTHB(order.discountAmount)}</span>
                </div>
              )}
              {order.vatAmount > 0 && (
                <div className="flex justify-between">
                  <span>VAT 7%:</span>
                  <span>+฿{formatTHB(order.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-gray-300">
                <span>ยอดสุทธิ:</span>
                <span>฿{formatTHB(order.totalAmount)}</span>
              </div>
              {order.paymentMethod === 'CASH' && order.cashReceived && (
                <>
                  <div className="flex justify-between">
                    <span>รับเงิน:</span>
                    <span>฿{formatTHB(order.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>เงินทอน:</span>
                    <span>฿{formatTHB(order.cashReceived - order.totalAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {order.member && (
              <div className="text-center pt-3 border-t border-dashed border-gray-300">
                <p className="text-gray-500">แต้มสะสม: +{Math.floor(order.totalAmount / 100)} pts</p>
                <p className="text-gray-500">คงเหลือ: {(order.member.walletPoints || 0) + Math.floor(order.totalAmount / 100)} pts</p>
              </div>
            )}

            <div className="text-center pt-3 border-t border-dashed border-gray-300">
              <p className="text-gray-400">ขอบคุณที่ใช้บริการ 🙏</p>
            </div>
          </div>

          {/* QR on receipt for transfer payment */}
          {order.paymentMethod === 'QR' && (
            <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
              <p className="text-sm font-bold text-blue-700 mb-2">QR สำหรับจ่ายเงิน (อยู่ในใบเสร็จ)</p>
              <p className="text-xs text-blue-500">พิมพ์ใบเสร็จนี้แล้วนำไปให้ลูกค้าสแกนจ่าย</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2 flex-shrink-0">
          <button
            onClick={handlePrint}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {printed ? <CheckCircle size={20} /> : <Printer size={20} />}
            {printed ? 'พิมพ์อีกครั้ง' : 'พิมพ์ใบเสร็จ'}
          </button>
        </div>
      </div>
    </div>
  )
}
