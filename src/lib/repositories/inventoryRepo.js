// Created At: 2026-04-12 11:50:00 +07:00 (v1.4.0)
// Previous version: 2026-04-12 05:10:00 +07:00 (v1.3.13)
// Last Updated: 2026-04-12 11:50:00 +07:00 (v1.4.0)

import { getPrisma } from '@/lib/db'

// ── Warehouses ────────────────────────────────────────────────────────────────

export async function findWarehouses(tenantId, { isActive } = {}) {
  const prisma = await getPrisma()
  try {
    const where = { tenantId }
    if (isActive !== undefined) where.isActive = isActive
    return await prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

export async function findWarehouseById(tenantId, id) {
  const prisma = await getPrisma()
  try {
    return await prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: { stocks: true },
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

// ── Stock Levels ──────────────────────────────────────────────────────────────

export async function getStockLevels(
  tenantId,
  { warehouseId, productId, productType, lowStockOnly } = {}
) {
  const prisma = await getPrisma()
  try {
    if (lowStockOnly) {
      const params = [tenantId]
      let sql = `
        SELECT ws.*, w.name AS warehouse_name
        FROM warehouse_stocks ws
        JOIN warehouses w ON w.id = ws.warehouse_id
        WHERE ws.tenant_id = $1
          AND ws.reorder_point IS NOT NULL
          AND ws.qty <= ws.reorder_point
      `
      if (warehouseId) { params.push(warehouseId); sql += ` AND ws.warehouse_id = $${params.length}` }
      if (productId)   { params.push(productId);   sql += ` AND ws.product_id = $${params.length}` }
      if (productType) { params.push(productType);  sql += ` AND ws.product_type = $${params.length}` }
      sql += ' ORDER BY ws.qty ASC'
      return await prisma.$queryRawUnsafe(sql, ...params)
    }

    const where = { tenantId }
    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId
    if (productType) where.productType = productType

    return await prisma.warehouseStock.findMany({
      where,
      include: { warehouse: true },
      orderBy: [{ warehouseId: 'asc' }, { productType: 'asc' }, { productId: 'asc' }],
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

// ── Stock Movements ───────────────────────────────────────────────────────────

export async function createMovement(
  tenantId,
  {
    warehouseId,
    productId,
    productType,
    type,
    qty,
    unitCost,
    referenceId,
    referenceType,
    performedById,
    note,
  }
) {
  const prisma = await getPrisma()
  try {
    return await prisma.$transaction(async (tx) => {
      const crypto = (await import('crypto')).default
      const movementId = crypto.randomUUID()

      const movement = await tx.stockMovement.create({
        data: {
          movementId,
          tenantId,
          warehouseId,
          productId,
          productType,
          type,
          qty,
          unitCost,
          referenceId,
          referenceType,
          performedById,
          note,
        },
      })

      await tx.warehouseStock.upsert({
        where: {
          tenantId_warehouseId_productId_productType: {
            tenantId,
            warehouseId,
            productId,
            productType,
          },
        },
        create: {
          tenantId,
          warehouseId,
          productId,
          productType,
          qty,
          lastMovedAt: new Date(),
        },
        update: {
          qty: { increment: qty },
          lastMovedAt: new Date(),
        },
      })

      return movement
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

export async function adjustStock(
  tenantId,
  warehouseId,
  productId,
  productType,
  delta,
  { unitCost, note, performedById } = {}
) {
  return createMovement(tenantId, {
    warehouseId,
    productId,
    productType,
    type: 'ADJUSTMENT',
    qty: delta,
    unitCost,
    note,
    performedById,
  })
}

export async function getMovements(
  tenantId,
  { warehouseId, productId, dateFrom, dateTo, limit = 50, skip = 0 } = {}
) {
  const prisma = await getPrisma()
  try {
    const where = { tenantId }
    if (warehouseId) where.warehouseId = warehouseId
    if (productId) where.productId = productId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    return await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

// ── Stock Counts ──────────────────────────────────────────────────────────────

export async function createStockCount(
  tenantId,
  { warehouseId, scheduledDate, note, items }
) {
  const prisma = await getPrisma()
  try {
    return await prisma.$transaction(async (tx) => {
      const crypto = (await import('crypto')).default
      const countId = crypto.randomUUID()

      const stockCount = await tx.stockCount.create({
        data: {
          countId,
          tenantId,
          warehouseId,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          note,
          status: 'DRAFT',
          items: {
            create: items.map(({ productId, productType, expectedQty, note: itemNote }) => ({
              productId,
              productType,
              expectedQty,
              note: itemNote,
            })),
          },
        },
        include: { items: true },
      })

      return stockCount
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}

export async function completeStockCount(tenantId, countId, countedItems) {
  const prisma = await getPrisma()
  try {
    return await prisma.$transaction(async (tx) => {
      const stockCount = await tx.stockCount.findFirst({
        where: { countId, tenantId },
        include: { items: true },
      })

      if (!stockCount) throw new Error(`StockCount not found: ${countId}`)

      for (const counted of countedItems) {
        const existing = stockCount.items.find(
          (i) => i.productId === counted.productId && i.productType === counted.productType
        )
        if (!existing) continue

        const varianceQty = counted.countedQty - existing.expectedQty

        await tx.stockCountItem.update({
          where: { id: existing.id },
          data: {
            countedQty: counted.countedQty,
            varianceQty,
            note: counted.note ?? existing.note,
          },
        })

        await tx.warehouseStock.upsert({
          where: {
            tenantId_warehouseId_productId_productType: {
              tenantId,
              warehouseId: stockCount.warehouseId,
              productId: counted.productId,
              productType: counted.productType,
            },
          },
          create: {
            tenantId,
            warehouseId: stockCount.warehouseId,
            productId: counted.productId,
            productType: counted.productType,
            qty: counted.countedQty,
            lastMovedAt: new Date(),
          },
          update: {
            qty: counted.countedQty,
            lastMovedAt: new Date(),
          },
        })
      }

      return await tx.stockCount.update({
        where: { id: stockCount.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: { items: true },
      })
    })
  } catch (error) {
    console.error('[inventoryRepo]', error)
    throw error
  }
}
