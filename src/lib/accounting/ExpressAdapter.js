/**
 * Express (ESG) X-import Adapter
 * Ref: FEAT17-ACCOUNTING-PLATFORM.md § 6.3
 * Sanitized for Edge Runtime compatibility.
 */
import * as XLSX from 'xlsx'
import { getPrisma } from '@/lib/db'

const INVOICE_COLUMNS = [
  'เลขที่อ้างอิง',    // ZRI-{orderId}
  'วันที่เอกสาร',     // documentDate
  'ชื่อลูกค้า',       // contactName
  'รายการสินค้า',     // items (comma-separated)
  'ยอดรวมก่อน VAT',  // subtotalAmount
  'ภาษีมูลค่าเพิ่ม', // vatAmount
  'ส่วนลด',          // discountAmount
  'ยอดรวม',          // totalAmount
  'วิธีชำระเงิน',     // paymentMethod
  'หมายเหตุ',        // notes
]

const EXPENSE_COLUMNS = [
  'เลขที่อ้างอิง',   // ZRI-PO-{poId}
  'วันที่เอกสาร',    // documentDate
  'ผู้จำหน่าย',      // supplier name
  'หมวดบัญชี',      // expense category (mapped)
  'จำนวนเงิน',       // totalAmount
  'ภาษีมูลค่าเพิ่ม', // vatAmount
  'หมายเหตุ',        // notes
]

const CONTACT_COLUMNS = [
  'ชื่อ-นามสกุล',    // name
  'อีเมล',           // email
  'เบอร์โทรศัพท์',   // phone
  'หมายเหตุ',        // Zuri CRM ID
]

// ─────────────────────────────────────────────────────────────────────────────
// Data fetchers
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOrdersForDate(tenantId, date) {
  const prisma = await getPrisma()
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return prisma.order.findMany({
    where: {
      tenantId,
      status: 'PAID',
      date: { gte: start, lte: end },
    },
    include: {
      customer: { select: { name: true, email: true, phonePrimary: true } },
      items: { select: { name: true, qty: true, unitPrice: true, discount: true } },
    },
  })
}

async function fetchExpensesForDate(tenantId, date) {
  const prisma = await getPrisma()
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return prisma.purchaseOrderV2.findMany({
    where: {
      tenantId,
      status: 'RECEIVED',
      createdAt: { gte: start, lte: end },
    },
    include: {
      supplier: { select: { name: true } },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Row builders
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear() + 543}` // Buddhist Era
}

function buildInvoiceRows(orders) {
  return orders.map((o) => [
    `ZRI-${o.orderId}`,
    formatDate(o.date),
    o.customer?.name ?? 'Walk-in Customer',
    o.items.map((i) => `${i.name} x${i.qty}`).join(', '),
    o.subtotalAmount,
    o.vatAmount,
    o.discountAmount,
    o.totalAmount,
    o.paymentMethod ?? 'CASH',
    o.notes ?? '',
  ])
}

function buildExpenseRows(purchaseOrders, accountMapping = {}) {
  return purchaseOrders.map((po) => [
    `ZRI-PO-${po.poId}`,
    formatDate(po.createdAt),
    po.supplier?.name ?? 'Unknown',
    accountMapping[po.category] ?? 'ต้นทุนสินค้า',
    po.totalAmount,
    po.vatAmount,
    po.notes ?? '',
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: generate XLSX buffer
// ─────────────────────────────────────────────────────────────────────────────

export async function generateXImportFile(tenantId, date, config) {
  const targetDate = date ? new Date(date) : (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  })()

  const accountMapping = config.accountMappingJson ?? {}

  const [orders, expenses] = await Promise.all([
    fetchOrdersForDate(tenantId, targetDate),
    fetchExpensesForDate(tenantId, targetDate),
  ])

  const wb = XLSX.utils.book_new()

  // Sheet 1: Invoices
  const invoiceRows = [INVOICE_COLUMNS, ...buildInvoiceRows(orders)]
  const wsInvoice = XLSX.utils.aoa_to_sheet(invoiceRows)
  XLSX.utils.book_append_sheet(wb, wsInvoice, 'ใบกำกับภาษี')

  // Sheet 2: Expenses
  const expenseRows = [EXPENSE_COLUMNS, ...buildExpenseRows(expenses, accountMapping)]
  const wsExpense = XLSX.utils.aoa_to_sheet(expenseRows)
  XLSX.utils.book_append_sheet(wb, wsExpense, 'รายจ่าย')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return { buffer, ordersCount: orders.length, expensesCount: expenses.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email delivery via Resend API
// ─────────────────────────────────────────────────────────────────────────────

export async function sendToAccountant(buffer, config, dateLabel) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[ExpressAdapter] RESEND_API_KEY not set — skipping email delivery')
    return { sent: false, reason: 'RESEND_API_KEY not configured' }
  }

  const accountantEmail = config.accountantEmail
  if (!accountantEmail) {
    return { sent: false, reason: 'accountant_email not configured' }
  }

  const fileName = `zuri-export-${dateLabel}.xlsx`
  const base64Content = Buffer.from(buffer).toString('base64')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Zuri <noreply@zuri.app>',
      to: [accountantEmail],
      subject: `รายงานบัญชี Zuri ประจำวัน ${dateLabel}`,
      html: `<p>สวัสดีครับ/ค่ะ</p>
<p>ไฟล์รายงานบัญชีสำหรับวันที่ <strong>${dateLabel}</strong> พร้อมแล้ว</p>
<p>กรุณา X-import ไฟล์แนบเข้าโปรแกรม Express</p>
<br/>
<p>ขอบคุณครับ/ค่ะ</p>
<p>ระบบ Zuri</p>`,
      attachments: [
        {
          filename: fileName,
          content: base64Content,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Resend email failed: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return { sent: true, emailId: data.id }
}
