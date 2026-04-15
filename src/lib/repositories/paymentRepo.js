// Created At: 2026-04-14T14:30:00+07:00
// Part of ZRI-IMP-0102 (Billing Implementation)

import { getPrisma } from '@/lib/db'
import { generateTransactionId } from '@/lib/idGenerator'

/**
 * Payment Repository (Nuclear Hardened)
 * Handles transactions, slip verification records, and invoicing logic.
 */

/**
 * Records a payment slip verification attempt and applies it to the order if valid.
 * 
 * @param {string} tenantId 
 * @param {string} orderId 
 * @param {object} slipData - Extract from Gemini (refNumber, amount, date, etc.)
 */
export async function verifyAndApplySlip(tenantId, orderId, slipData) {
  const prisma = await getPrisma()
  
  if (!slipData.isVerified) {
    throw new Error('[paymentRepo] Cannot apply an unverified slip')
  }

  // 1. Transaction Duplication Check (Security Gate)
  if (slipData.refNumber) {
    const existingTx = await prisma.transaction.findUnique({
      where: { refNumber: slipData.refNumber }
    })
    if (existingTx) {
      throw new Error(`[paymentRepo] Duplicate Slip: refNumber ${slipData.refNumber} already used.`)
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 2. Fetch Order to verify amount
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId },
      select: { totalAmount: true, status: true }
    })

    if (!order) throw new Error('[paymentRepo] Order not found')
    if (order.status === 'PAID') throw new Error('[paymentRepo] Order already paid')

    // 3. Amount tolerance check (Optional but recommended)
    const diff = Math.abs(order.totalAmount - slipData.amount)
    if (diff > 1) { // ฿1 margin of error for rounding
       throw new Error(`[paymentRepo] Amount Mismatch: Order(฿${order.totalAmount}) vs Slip(฿${slipData.amount})`)
    }

    // 4. Create Transaction
    const transactionId = await generateTransactionId()
    const transaction = await tx.transaction.create({
      data: {
        transactionId,
        tenantId,
        orderId,
        amount: slipData.amount,
        type: 'PAYMENT',
        method: 'QR_PROMPTPAY',
        slipStatus: 'VERIFIED',
        slipData: slipData,
        refNumber: slipData.refNumber || `OPQ-${Date.now()}`,
      }
    })

    // 5. Update Order Status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAmount: slipData.amount,
        paymentMethod: 'QR_PROMPTPAY'
      }
    })

    return transaction
  })
}

/**
 * List transactions with isolation and filtering
 */
export async function findTransactions(tenantId, { limit = 50, orderId = null } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }
  if (orderId) where.orderId = orderId

  return prisma.transaction.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: { orderId: true, totalAmount: true }
      }
    }
  })
}

/**
 * Implementation of INV-YYYYMMDD-NNN sequence might need a dedicated Sequence table,
 * but for MVP we can use a daily count or Order count.
 */
export async function generateInvoiceNumber(tenantId) {
  const prisma = await getPrisma()
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  const count = await prisma.order.count({
    where: { 
      tenantId, 
      createdAt: {
        gte: new Date(new Date().setHours(0,0,0,0))
      }
    }
  })

  const seq = (count + 1).toString().padStart(3, '0')
  return `INV-${dateStr}-${seq}`
}
