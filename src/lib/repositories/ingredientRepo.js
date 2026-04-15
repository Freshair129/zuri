// Created At: 2026-04-12 05:15:00 +07:00 (v1.3.14)
// Previous version: 2026-04-11 20:34:07 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:15:00 +07:00 (v1.3.14)

import { getPrisma } from '@/lib/db'

export async function findMany(tenantId, { search } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }
  return prisma.ingredient.findMany({
    where,
    orderBy: { name: 'asc' },
  })
}

export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.ingredient.findFirst({
    where: { id, tenantId },
    include: { lots: true },
  })
}

/**
 * Adjust stock quantity for an ingredient by delta (positive = add, negative = deduct).
 */
export async function updateStock(tenantId, id, delta) {
  const prisma = await getPrisma()
  return prisma.ingredient.update({
    where: { id, tenantId },
    data: {
      currentStock: { increment: delta },
    },
  })
}

/**
 * Deducts specified quantity from an ingredient's lots using First-Expire, First-Out (FEFO) logic.
 */
export async function deductFEFO(tenantId, id, totalNeeded) {
  const prisma = await getPrisma()
  if (totalNeeded <= 0) return { deducted: 0, lotsAffected: [] }

  return prisma.$transaction(async (tx) => {
    // 1. Get ingredient to check current stock
    const ingredient = await tx.ingredient.findFirst({
      where: { id, tenantId },
      include: {
        lots: {
          where: { remainingQty: { gt: 0 } },
          orderBy: { expiresAt: 'asc' },
        },
      },
    })

    if (!ingredient) throw new Error(`Ingredient not found: ${id}`)
    
    let remainingToDeduct = totalNeeded
    const lotsAffected = []

    for (const lot of ingredient.lots) {
      if (remainingToDeduct === 0) break

      const deductFromThisLot = Math.min(lot.remainingQty, remainingToDeduct)

      await tx.ingredientLot.update({
        where: { id: lot.id },
        data: {
          remainingQty: { decrement: deductFromThisLot },
          status: lot.remainingQty === deductFromThisLot ? 'EXHAUSTED' : 'ACTIVE',
        },
      })

      lotsAffected.push({
        lotId: lot.id,
        qtyDeducted: deductFromThisLot,
      })

      remainingToDeduct -= deductFromThisLot
    }

    // 2. Update the main ingredient currentStock denormalized count
    const actuallyDeducted = totalNeeded - remainingToDeduct
    await tx.ingredient.update({
      where: { id: ingredient.id },
      data: {
        currentStock: { decrement: actuallyDeducted },
      },
    })

    return { deducted: actuallyDeducted, lotsAffected }
  })
}

/**
 * Find ingredient lots expiring within the next `days` days.
 */
export async function findExpiringLots(tenantId, days = 7) {
  const prisma = await getPrisma()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  return prisma.ingredientLot.findMany({
    where: {
      tenantId,
      expiresAt: {
        lte: cutoff,
        gte: new Date(),
      },
      remainingQty: { gt: 0 },
    },
    include: { ingredient: true },
    orderBy: { expiresAt: 'asc' },
  })
}
