// Created At: 2026-04-12 05:00:00 +07:00 (v1.3.11)
// Previous version: 2026-04-12 05:00:00 +07:00 (v1.3.11)
// Last Updated: 2026-04-15 00:00:00 +07:00 (v1.5.0)

/**
 * tableRepo — POS table and floor plan management (FEAT06-POS)
 * All functions receive tenantId for multi-tenant isolation (ADR-056).
 */

import { getPrisma } from '@/lib/db'
import { getOrSet, redis } from '@/lib/redis'
import { triggerEvent } from '@/lib/pusher'

async function bustCache(tenantId) {
  try {
    const keys = await redis.keys(`tables:${tenantId}:*`)
    if (keys.length > 0) await redis.del(...keys)
  } catch (err) {
    console.error('[tableRepo] bustCache error', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
export async function listTables(tenantId, { floor, zoneId, includeExtra = false } = {}) {
  const cacheKey = `tables:${tenantId}:${JSON.stringify({ floor, zoneId, includeExtra })}`

  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const where = { tenantId }
    if (floor !== undefined) where.floor = parseInt(floor)
    if (zoneId) where.zoneId = zoneId
    if (!includeExtra) where.isExtra = false

    return prisma.posTable.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
      include: {
        zone: { select: { id: true, name: true, color: true } },
        orders: {
          where: { status: { in: ['PENDING', 'PAID'] } },
          select: { 
            id: true, 
            orderId: true, 
            totalAmount: true,
            guestCount: true,
            extraSeats: true,
            isMerged: true
          }
        }
      }
    })
  }, 60)
}

export async function getTableById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.posTable.findFirst({
    where: { id, tenantId },
    include: { zone: true }
  })
}

export async function createTable(tenantId, data) {
  const prisma = await getPrisma()
  const table = await prisma.posTable.create({
    data: { ...data, tenantId }
  })
  await bustCache(tenantId)
  return table
}

export async function listTablesWithOrders(tenantId, { floor, zoneId } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId, isExtra: false }
  if (floor)  where.floor  = parseInt(floor)
  if (zoneId) where.zoneId = zoneId

  const tables = await prisma.posTable.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      zone: true,
      orders: {
        where: { status: 'PENDING' },
        select: {
          id: true,
          guestCount: true,
          extraSeats: true,
          totalAmount: true,
          createdAt: true,
          orderId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    }
  })

  return tables.map(t => ({
    ...t,
    activeOrder: t.orders[0] || null,
    orders: undefined
  }))
}

export async function updateTable(tenantId, id, data) {
  const prisma = await getPrisma()
  const updated = await prisma.posTable.update({
    where: { id, tenantId },
    data
  })
  await bustCache(tenantId)
  return updated
}

/**
 * mergeTables — Atomically merge secondary tables into a main table group.
 *
 * Safety (ref: FEAT--pos-onsite, ALGO--table-merge, ADR-056):
 *  - All table IDs must belong to the same tenantId (isolation enforced)
 *  - Rejects if any table is already part of another merge group
 *  - Rejects if any table is not in AVAILABLE status
 *  - Sets mergeGroupId on the active order of the main table
 *  - Entire operation is atomic via Prisma $transaction
 */
export async function mergeTables(tenantId, mainTableId, secondaryTableIds) {
  const prisma = await getPrisma()
  const allTableIds = [mainTableId, ...secondaryTableIds]

  return prisma.$transaction(async (tx) => {
    // ── Validate all tables belong to tenant and are AVAILABLE ───────────────
    const tables = await tx.posTable.findMany({
      where: { id: { in: allTableIds }, tenantId },
    })

    if (tables.length !== allTableIds.length) {
      throw new Error('[mergeTables] One or more tables not found or cross-tenant access denied')
    }

    const blocked = tables.filter(
      (t) => t.status !== 'AVAILABLE' && t.status !== 'OCCUPIED'
    )
    if (blocked.length > 0) {
      const names = blocked.map((t) => t.name).join(', ')
      throw new Error(`[mergeTables] Tables cannot be merged — not available: ${names}`)
    }

    const alreadyMerged = tables.filter((t) => t.mergeGroupId)
    if (alreadyMerged.length > 0) {
      const names = alreadyMerged.map((t) => t.name).join(', ')
      throw new Error(
        `[mergeTables] Tables already part of a merge group: ${names}. ` +
        `Please unmerge first.`
      )
    }

    // ── Create a new mergeGroupId ────────────────────────────────────────────
    const { randomUUID } = await import('crypto')
    const mergeGroupId = randomUUID()

    // ── Mark all tables OCCUPIED with mergeGroupId ───────────────────────────
    await tx.posTable.updateMany({
      where: { id: { in: allTableIds }, tenantId },
      data: { status: 'OCCUPIED', mergeGroupId },
    })

    // ── Attach mergeGroupId to the main table's active order (if exists) ─────
    await tx.order.updateMany({
      where: { tableId: mainTableId, tenantId, status: 'PENDING' },
      data: { isMerged: true, mergeGroupId },
    })

    await bustCache(tenantId)

    // Notify all clients of floor plan change
    triggerEvent(`private-tenant-${tenantId}`, 'pos.table.merged', {
      mergeGroupId,
      mainTableId,
      secondaryTableIds,
    }).catch((err) => console.error('[tableRepo] Pusher pos.table.merged failed', err))

    return { mergeGroupId, mainTableId, secondaryTableIds }
  })
}

/**
 * unmergeTables — Release all tables in a merge group back to CLEANING.
 *
 * Tables go to CLEANING (not AVAILABLE) so staff can reset before next guests.
 * Clears mergeGroupId on both tables and their orders.
 */
export async function unmergeTables(tenantId, mergeGroupId) {
  const prisma = await getPrisma()

  return prisma.$transaction(async (tx) => {
    // Resolve tableIds from the mergeGroupId for safety — don't trust caller input blindly
    const tables = await tx.posTable.findMany({
      where: { mergeGroupId, tenantId },
      select: { id: true },
    })

    if (tables.length === 0) {
      throw new Error(`[unmergeTables] No tables found for mergeGroupId: ${mergeGroupId}`)
    }

    const tableIds = tables.map((t) => t.id)

    await tx.posTable.updateMany({
      where: { id: { in: tableIds }, tenantId },
      // CLEANING not AVAILABLE — staff must confirm table is reset (ref: FEAT--pos-onsite)
      data: { status: 'CLEANING', mergeGroupId: null },
    })

    // Clear merge flags on any associated orders
    await tx.order.updateMany({
      where: { tableId: { in: tableIds }, tenantId, status: 'PENDING' },
      data: { isMerged: false, mergeGroupId: null },
    })

    await bustCache(tenantId)

    triggerEvent(`private-tenant-${tenantId}`, 'pos.table.unmerged', {
      mergeGroupId,
      tableIds,
    }).catch((err) => console.error('[tableRepo] Pusher pos.table.unmerged failed', err))

    return { success: true, tableIds }
  })
}

export async function createExtraTable(tenantId, parentTableId, data) {
  const prisma = await getPrisma()
  const extraTable = await prisma.posTable.create({
    data: {
      ...data,
      tenantId,
      isExtra: true,
      parentId: parentTableId,
      status: 'OCCUPIED'
    }
  })
  await bustCache(tenantId)
  return extraTable
}

export async function deleteTable(tenantId, id) {
  const prisma = await getPrisma()
  const deleted = await prisma.posTable.delete({
    where: { id, tenantId }
  })
  await bustCache(tenantId)
  return deleted
}

export async function listZones(tenantId) {
  const cacheKey = `zones:${tenantId}`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    return prisma.posZone.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' }
    })
  }, 300)
}

export async function createZone(tenantId, data) {
  const prisma = await getPrisma()
  const zone = await prisma.posZone.create({
    data: { ...data, tenantId }
  })
  try { await redis.del(`zones:${tenantId}`) } catch (err) {}
  return zone
}

export async function updateZone(tenantId, id, data) {
  const prisma = await getPrisma()
  const updated = await prisma.posZone.update({
    where: { id, tenantId },
    data
  })
  try { await redis.del(`zones:${tenantId}`) } catch (err) {}
  return updated
}

export async function deleteZone(tenantId, id) {
  const prisma = await getPrisma()
  const deleted = await prisma.posZone.delete({
    where: { id, tenantId }
  })
  try { await redis.del(`zones:${tenantId}`) } catch (err) {}
  return deleted
}
