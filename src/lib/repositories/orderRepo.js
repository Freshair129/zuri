// Created At: 2026-04-12 04:15:00 +07:00 (v1.3.2)
// Previous version: 2026-04-12 04:15:00 +07:00 (v1.3.2)
// Last Updated: 2026-04-15 00:00:00 +07:00 (v1.5.0)

/**
 * orderRepo — POS order data access layer (FEAT06-POS)
 * All functions receive tenantId for multi-tenant isolation.
 */

import { getPrisma } from '@/lib/db'
import { getOrSet, redis } from '@/lib/redis'
import { generateOrderId, generateTransactionId } from '@/lib/idGenerator'
import { triggerEvent } from '@/lib/pusher'

// ─── Totals calculation ───────────────────────────────────────────────────────
export function calculateTotals(items, {
  discountAmount = 0,
  vatRate = 7,
  vatIncluded = true,
  serviceChargeRate = 0,
} = {}) {
  const subtotalBeforeDiscount = items.reduce((sum, item) => {
    const itemTotal = (item.unitPrice * item.qty) - (item.discount ?? 0)
    return sum + itemTotal
  }, 0)

  const subtotal = Math.max(0, subtotalBeforeDiscount - discountAmount)

  let vatAmount = 0
  let serviceCharge = 0

  if (serviceChargeRate > 0) {
    serviceCharge = Math.round(subtotal * serviceChargeRate) / 100
  }

  const baseForVat = subtotal + serviceCharge

  if (vatIncluded) {
    vatAmount = Math.round((baseForVat * vatRate / (100 + vatRate)) * 100) / 100
  } else {
    vatAmount = Math.round(baseForVat * vatRate) / 100
  }

  const total = vatIncluded ? baseForVat : baseForVat + vatAmount

  return {
    subtotalAmount: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    serviceCharge:  Math.round(serviceCharge * 100) / 100,
    vatAmount:      Math.round(vatAmount * 100) / 100,
    totalAmount:    Math.round(total * 100) / 100,
  }
}

// ─── Cache helpers ─────────────────────────────────────────────────────────────
async function bustOrderCache(tenantId) {
  try {
    const keys = await redis.keys(`orders:${tenantId}:*`)
    if (keys.length > 0) await redis.del(...keys)
  } catch (err) {
    console.error('[orderRepo] bustOrderCache', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────────────────────────────────────
export async function createOrder(tenantId, {
  customerId,
  tableId,
  orderType = 'TAKEAWAY',
  items = [],
  discountAmount = 0,
  notes,
  closedById,
  vatRate = 7,
  vatIncluded = true,
  serviceChargeRate = 0,
  guestCount = 1,
  extraSeats = 0,
  isMerged = false,
  mergeGroupId = null,
  createdBy = null,
  requiresApproval = false,
  conversationId = null,
}) {
  const prisma = await getPrisma()
  const orderId = await generateOrderId()

  const totals = calculateTotals(items, { discountAmount, vatRate, vatIncluded, serviceChargeRate })

  const HIGH_VALUE_THRESHOLD = 5000
  const needsApproval = requiresApproval ||
    createdBy === 'AI' ||
    totals.totalAmount > HIGH_VALUE_THRESHOLD

  const orderItems = items.map(item => ({
    tenantId,
    productId:  item.productId ?? null,
    name:       item.name,
    qty:        item.qty,
    unitPrice:  item.unitPrice,
    discount:   item.discount ?? 0,
    totalPrice: Math.round(((item.unitPrice * item.qty) - (item.discount ?? 0)) * 100) / 100,
    note:       item.note ?? null,
  }))

  const order = await prisma.order.create({
    data: {
      orderId,
      tenantId,
      customerId:      customerId ?? null,
      tableId:         tableId   ?? null,
      guestCount:      Math.max(1, guestCount),
      extraSeats:      Math.max(0, extraSeats),
      isMerged,
      mergeGroupId:    mergeGroupId ?? null,
      orderType,
      notes,
      closedById:      closedById ?? null,
      conversationId:  conversationId ?? null,
      createdBy:       createdBy ?? null,
      requiresApproval: needsApproval,
      ...totals,
      items: { create: orderItems },
    },
    include: { items: true, customer: true },
  })

  await bustOrderCache(tenantId)
  return order
}

// ─────────────────────────────────────────────────────────────────────────────
// AI SALES CLOSER — Human Gate Approval
// ─────────────────────────────────────────────────────────────────────────────
export async function approveOrder(tenantId, orderId, approvedById) {
  const prisma = await getPrisma()
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, requiresApproval: true },
  })
  if (!order) throw new Error('Order not found or does not require approval')

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      requiresApproval: false,
      approvedById,
      approvedAt: new Date(),
    },
    include: { items: true, customer: true },
  })

  await bustOrderCache(tenantId)
  return updated
}

export async function listPendingApprovalOrders(tenantId, { page = 1, limit = 20 } = {}) {
  const prisma = await getPrisma()
  const offset = (page - 1) * limit

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, requiresApproval: true, status: 'PENDING' },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, facebookName: true } },
        items: true,
      },
    }),
    prisma.order.count({ where: { tenantId, requiresApproval: true, status: 'PENDING' } }),
  ])

  return { orders, total, page, limit, pages: Math.ceil(total / limit) }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export async function listOrders(tenantId, {
  status,
  orderType,
  customerId,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) {
  const cacheKey = `orders:${tenantId}:${JSON.stringify({ status, orderType, customerId, from, to, page, limit })}`

  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const where = { tenantId }
    if (status)     where.status    = status
    if (orderType)  where.orderType = orderType
    if (customerId) where.customerId = customerId
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to)   where.date.lte = new Date(to)
    }

    const offset = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, facebookName: true, phonePrimary: true } },
          items: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total, page, limit, pages: Math.ceil(total / limit) }
  }, 30)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrderById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.order.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      table: true,
      items: { orderBy: { kitchenStatus: 'asc' } },
      transactions: { orderBy: { createdAt: 'desc' } },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE ORDER (add/remove items, change discount)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateOrderItems(tenantId, id, {
  items,
  discountAmount,
  notes,
  vatRate = 7,
  vatIncluded = true,
  serviceChargeRate = 0,
}) {
  const prisma = await getPrisma()
  const existing = await prisma.order.findFirst({
    where: { id, tenantId, status: 'PENDING' },
  })
  if (!existing) throw new Error('Order not found or already closed')

  const effectiveDiscount = discountAmount ?? existing.discountAmount

  const totals = calculateTotals(items, {
    discountAmount: effectiveDiscount,
    vatRate,
    vatIncluded,
    serviceChargeRate,
  })

  const [order] = await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: id } }),
    prisma.order.update({
      where: { id },
      data: {
        ...totals,
        notes: notes ?? existing.notes,
        items: {
          create: items.map(item => ({
            tenantId,
            productId:  item.productId ?? null,
            name:       item.name,
            qty:        item.qty,
            unitPrice:  item.unitPrice,
            discount:   item.discount ?? 0,
            totalPrice: Math.round(((item.unitPrice * item.qty) - (item.discount ?? 0)) * 100) / 100,
            note:       item.note ?? null,
          })),
        },
      },
      include: { items: true },
    }),
  ])

  await bustOrderCache(tenantId)
  return order
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS PAYMENT — create transaction + update order status (atomic)
// ─────────────────────────────────────────────────────────────────────────────
export async function processPayment(tenantId, id, {
  method,
  cashReceived,
}) {
  const prisma = await getPrisma()
  const order = await prisma.order.findFirst({
    where: { id, tenantId, status: 'PENDING' },
    include: { items: true },
  })
  if (!order) throw new Error('Order not found or already paid')

  const txId = await generateTransactionId()
  const paidAmount = order.totalAmount

  const result = await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        transactionId: txId,
        tenantId,
        orderId: id,
        amount: paidAmount,
        type: 'PAYMENT',
        method,
      },
    })

    // Generate Formal Invoice ID (Revenue Attribution)
    const { generateInvoiceId } = await import('@/lib/idGenerator')
    const invoiceId = await generateInvoiceId()

    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        orderId: invoiceId, // Transition from ORD to INV
        status: 'PAID',
        paymentMethod: method,
        paidAmount,
        cashReceived: cashReceived ?? null,
      },
      include: { items: true },
    })

    if (order.tableId) {
      await tx.posTable.update({
        where: { id: order.tableId },
        data: { status: 'CLEANING' },
      })
    }

    return updatedOrder
  })

  try {
    await deductOrderInventory(tenantId, order, null)
  } catch (invErr) {
    console.error('[orderRepo] processPayment: inventory deduction failed (non-fatal)', invErr)
  }

  await bustOrderCache(tenantId)
  return result
}

export async function deductOrderInventory(tenantId, order, tx) {
  const prisma = await getPrisma()
  const prismaTx = tx || prisma
  
  for (const item of order.items) {
    if (!item.productId) continue

    const product = await prismaTx.product.findFirst({
      where: { id: item.productId, tenantId },
      include: {
        recipes: {
          include: {
            recipe: {
              include: { ingredients: true }
            }
          }
        }
      }
    })

    if (!product || !product.recipes.length) continue

    for (const prodRecipe of product.recipes) {
      for (const recipeIngredient of prodRecipe.recipe.ingredients) {
        const totalToDeduct = recipeIngredient.qty * item.qty
        await deductIngredientFEFO(tenantId, recipeIngredient.ingredientId, totalToDeduct, prismaTx)
      }
    }
  }
}

/**
 * Hardened FEFO deduction engine (ZRI-IMP-0104 v2)
 *
 * Safety guarantees (ref: ALGO--fefo-stock-deduction, SAFETY--tenant-isolation):
 *  1. tenantId is always applied — no cross-tenant lot access possible
 *  2. Expired lots (expiresAt < now) are flagged EXPIRED and skipped, not silently ignored
 *  3. Pusher events fire for expired lots and for "last lot consumed" (critical stock)
 *  4. strictInventoryMode: if enabled, throws when stock is insufficient (no negative stock)
 */
async function deductIngredientFEFO(tenantId, ingredientId, totalNeeded, tx) {
  const now = new Date()

  const ingredient = await tx.ingredient.findFirst({
    // ✅ SAFETY: tenantId scoped — never cross-tenant (ADR-056)
    where: { id: ingredientId, tenantId },
    include: {
      lots: {
        // Fetch both expired and active with remaining qty so we can handle each case
        where: { remainingQty: { gt: 0 } },
        orderBy: { expiresAt: 'asc' },
      },
    },
  })

  if (!ingredient) return

  // ── Step 1: Detect & flag expired lots ─────────────────────────────────────
  const expiredLots = ingredient.lots.filter(
    (lot) => lot.expiresAt && lot.expiresAt < now && lot.status !== 'EXPIRED'
  )

  for (const expiredLot of expiredLots) {
    await tx.ingredientLot.update({
      where: { id: expiredLot.id },
      data: { status: 'EXPIRED' },
    })
    // Fire-and-forget Pusher alert — non-fatal if Pusher is down
    triggerEvent(`private-tenant-${tenantId}`, 'inventory.lot.expired', {
      ingredientId,
      ingredientName: ingredient.name,
      lotId: expiredLot.id,
      expiresAt: expiredLot.expiresAt,
    }).catch((err) => console.error('[orderRepo] Pusher inventory.lot.expired failed', err))
  }

  // ── Step 2: Collect only ACTIVE, non-expired lots sorted FEFO ──────────────
  const activeLots = ingredient.lots.filter(
    (lot) => !lot.expiresAt || lot.expiresAt >= now
  )

  // ── Step 3: Check strictInventoryMode before deduction ─────────────────────
  const tenant = await tx.tenant.findFirst({
    where: { id: tenantId },
    select: { config: true },
  })
  const strictMode = tenant?.config?.strictInventoryMode ?? false

  const totalAvailable = activeLots.reduce((sum, lot) => sum + lot.remainingQty, 0)
  if (strictMode && totalAvailable < totalNeeded) {
    throw new Error(
      `[STRICT_INVENTORY] Insufficient stock for ingredient "${ingredient.name}": ` +
      `need ${totalNeeded}, available ${totalAvailable}`
    )
  }

  // ── Step 4: FEFO deduction loop ─────────────────────────────────────────────
  let remainingToDeduct = totalNeeded
  for (const lot of activeLots) {
    if (remainingToDeduct <= 0) break

    const deductFromThisLot = Math.min(lot.remainingQty, remainingToDeduct)
    const newRemainingQty = lot.remainingQty - deductFromThisLot
    const isLastLot = activeLots.indexOf(lot) === activeLots.length - 1

    await tx.ingredientLot.update({
      where: { id: lot.id },
      data: {
        remainingQty: { decrement: deductFromThisLot },
        status: newRemainingQty <= 0 ? 'EXHAUSTED' : 'ACTIVE',
      },
    })

    // Alert if this was the last active lot and it's now exhausted
    if (newRemainingQty <= 0 && isLastLot) {
      triggerEvent(`private-tenant-${tenantId}`, 'inventory.lot.critical', {
        ingredientId,
        ingredientName: ingredient.name,
        message: `Last lot for "${ingredient.name}" has been exhausted.`,
      }).catch((err) => console.error('[orderRepo] Pusher inventory.lot.critical failed', err))
    }

    remainingToDeduct -= deductFromThisLot
  }

  // ── Step 5: Denormalize currentStock on Ingredient (for dashboard speed) ───
  const actuallyDeducted = totalNeeded - remainingToDeduct
  await tx.ingredient.update({
    where: { id: ingredient.id },
    data: { currentStock: { decrement: actuallyDeducted } },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// VOID ORDER
// ─────────────────────────────────────────────────────────────────────────────
export async function voidOrder(tenantId, id, { voidedBy } = {}) {
  const prisma = await getPrisma()
  const order = await prisma.order.findFirst({
    where: { id, tenantId, status: 'PENDING' },
  })
  if (!order) throw new Error('Order not found or already closed')

  await prisma.order.update({
    where: { id },
    data: { status: 'VOID', closedById: voidedBy ?? null },
  })

  await bustOrderCache(tenantId)
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
export async function getDailySummary(tenantId, date = new Date()) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const cacheKey = `orders:${tenantId}:daily:${startOfDay.toISOString().slice(0, 10)}`

  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const [paid, voided, byType] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId, status: 'PAID', date: { gte: startOfDay, lte: endOfDay } },
        _sum: { totalAmount: true, discountAmount: true, vatAmount: true },
        _count: true,
      }),
      prisma.order.count({
        where: { tenantId, status: 'VOID', date: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.order.groupBy({
        by: ['orderType'],
        where: { tenantId, status: 'PAID', date: { gte: startOfDay, lte: endOfDay } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ])

    return {
      date: startOfDay.toISOString().slice(0, 10),
      totalRevenue:   paid._sum.totalAmount  ?? 0,
      totalDiscount:  paid._sum.discountAmount ?? 0,
      totalVat:       paid._sum.vatAmount    ?? 0,
      orderCount:     paid._count,
      voidedCount:    voided,
      byType:         byType.reduce((acc, r) => ({ ...acc, [r.orderType]: { total: r._sum.totalAmount, count: r._count } }), {}),
    }
  }, 60)
}

// ─── Backward compat aliases ─────────────────────────────────────────────────
export const listOrdersWrapper = (opts) => listOrders(opts?.tenantId, opts)
export const updateOrderStatus  = async (tenantId, id, status) => {
  const prisma = await getPrisma()
  return prisma.order.update({ where: { id, tenantId }, data: { status } })
}
export const createOrderRaw = async (data) => {
  const prisma = await getPrisma()
  return prisma.order.create({ data })
}
