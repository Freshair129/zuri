// Created At: 2026-04-12 11:45:00 +07:00 (v1.4.0)
// Previous version: 2026-04-12 04:35:00 +07:00 (v1.3.6)
// Last Updated: 2026-04-12 11:45:00 +07:00 (v1.4.0)

import { getPrisma } from '@/lib/db'

const VALID_TRANSITIONS = {
  DRAFT: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'CANCELLED'],
  ORDERED: ['RECEIVING', 'CANCELLED'],
  RECEIVING: ['RECEIVED', 'PARTIAL'],
  PARTIAL: ['RECEIVING', 'RECEIVED', 'CLOSED'],
  RECEIVED: ['CLOSED'],
  CANCELLED: [],
  CLOSED: [],
}

const VAT_RATE = 0.07

export async function findMany(tenantId, { status, supplierId, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }

  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }

  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.purchaseOrderV2.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { supplierId: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.purchaseOrderV2.count({ where }),
  ])

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.purchaseOrderV2.findFirst({
    where: { tenantId, poId: id },
    include: {
      items: true,
      approvals: { orderBy: { createdAt: 'asc' } },
      grns: {
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      },
      tracking: { orderBy: { createdAt: 'desc' } },
      supplier: true,
    },
  })
}

export async function create(tenantId, { supplierId, requestedById, warehouseId, expectedDeliveryDate, items, notes }) {
  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todayCount = await tx.purchaseOrderV2.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    })

    const seq = todayCount + 1
    const poId = `PO-${dateStr}-${String(seq).padStart(3, '0')}`

    const enrichedItems = items.map((item) => {
      const lineTotal = item.qtyOrdered * item.unitCost
      return { ...item, lineTotal }
    })

    const totalAmount = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const vatAmount = parseFloat((totalAmount * VAT_RATE).toFixed(2))
    const grandTotal = parseFloat((totalAmount + vatAmount).toFixed(2))

    const po = await tx.purchaseOrderV2.create({
      data: {
        poId,
        tenantId,
        supplierId,
        requestedById,
        warehouseId,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        totalAmount,
        vatAmount,
        grandTotal,
        notes,
        items: {
          create: enrichedItems.map((item) => ({
            productId: item.productId,
            productType: item.productType,
            productName: item.productName,
            unit: item.unit ?? 'unit',
            qtyOrdered: item.qtyOrdered,
            unitCost: item.unitCost,
            vatPct: item.vatPct ?? 7,
            lineTotal: item.lineTotal,
            note: item.note ?? null,
          })),
        },
      },
      include: { items: true },
    })

    return po
  })
}

export async function updateStatus(tenantId, id, newStatus) {
  const prisma = await getPrisma()
  const po = await prisma.purchaseOrderV2.findFirst({
    where: { tenantId, poId: id },
    select: { status: true },
  })

  if (!po) {
    throw new Error(`[poRepo] PO not found: ${id}`)
  }

  const allowedTransitions = VALID_TRANSITIONS[po.status] ?? []
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`[poRepo] Invalid status transition: ${po.status} → ${newStatus}`)
  }

  return prisma.purchaseOrderV2.update({
    where: { poId: id },
    data: { status: newStatus, updatedAt: new Date() },
  })
}

export async function approve(tenantId, id, approverId, action, note) {
  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrderV2.findFirst({
      where: { tenantId, poId: id },
      select: { id: true, status: true },
    })

    if (!po) {
      throw new Error(`[poRepo] PO not found: ${id}`)
    }

    await tx.pOApproval.create({
      data: {
        poId: id,
        tenantId,
        approverId,
        action,
        note: note ?? null,
      },
    })

    if (action === 'APPROVE') {
      const allowedTransitions = VALID_TRANSITIONS[po.status] ?? []
      const nextStatus = allowedTransitions.find((s) => s !== 'CANCELLED')
      if (nextStatus) {
        await tx.purchaseOrderV2.update({
          where: { poId: id },
          data: { status: nextStatus, updatedAt: new Date() },
        })
      }
    } else if (action === 'REJECT') {
      await tx.purchaseOrderV2.update({
        where: { poId: id },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      })
    }

    return tx.purchaseOrderV2.findFirst({
      where: { poId: id },
      include: { approvals: { orderBy: { createdAt: 'asc' } } },
    })
  })
}

export async function recordGRN(tenantId, poId, { warehouseId, receivedById, items, note }) {
  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todayGrnCount = await tx.goodsReceivedNote.count({
      where: {
        tenantId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    })

    const seq = todayGrnCount + 1
    const grnId = `GRN-${dateStr}-${String(seq).padStart(3, '0')}`

    const grn = await tx.goodsReceivedNote.create({
      data: {
        grnId,
        tenantId,
        poId,
        warehouseId,
        receivedById,
        note: note ?? null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productType: item.productType,
            qtyReceived: item.qtyReceived,
            unitCost: item.unitCost,
            batchNumber: item.batchNumber ?? null,
            expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
            note: item.note ?? null,
          })),
        },
      },
      include: { items: true },
    })

    for (const item of items) {
      await tx.pOItem.updateMany({
        where: { poId, productId: item.productId, productType: item.productType },
        data: { qtyReceived: { increment: item.qtyReceived } },
      })
    }

    const poItems = await tx.pOItem.findMany({
      where: { poId },
      select: { qtyOrdered: true, qtyReceived: true },
    })

    const allReceived = poItems.every((i) => i.qtyReceived >= i.qtyOrdered)

    if (allReceived) {
      await tx.purchaseOrderV2.update({
        where: { poId },
        data: { status: 'RECEIVED', updatedAt: new Date() },
      })
    }

    return grn
  })
}

export async function findSuppliers(tenantId, { isActive, limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  try {
    const where = { tenantId }
    if (isActive !== undefined) where.isActive = isActive
    return await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip,
    })
  } catch (error) {
    console.error('[poRepo]', error)
    throw error
  }
}

export async function findSupplierById(tenantId, id) {
  const prisma = await getPrisma()
  try {
    return await prisma.supplier.findFirst({
      where: { id, tenantId },
    })
  } catch (error) {
    console.error('[poRepo]', error)
    throw error
  }
}

export async function createSupplier(tenantId, data) {
  const prisma = await getPrisma()
  try {
    const crypto = (await import('crypto')).default
    const supplierId = `SUP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    return await prisma.supplier.create({
      data: { supplierId, tenantId, ...data },
    })
  } catch (error) {
    console.error('[poRepo]', error)
    throw error
  }
}

export async function updateSupplier(tenantId, id, data) {
  const prisma = await getPrisma()
  try {
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
    return await prisma.supplier.updateMany({
      where: { id, tenantId },
      data: patch,
    })
  } catch (error) {
    console.error('[poRepo]', error)
    throw error
  }
}

export async function deactivateSupplier(tenantId, id) {
  const prisma = await getPrisma()
  try {
    return await prisma.supplier.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    })
  } catch (error) {
    console.error('[poRepo]', error)
    throw error
  }
}
