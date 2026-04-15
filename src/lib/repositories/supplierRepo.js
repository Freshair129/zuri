// Created At: 2026-04-12 11:40:00 +07:00 (v1.4.0)
// Previous version: 2026-04-12 04:45:00 +07:00 (v1.3.8)
// Last Updated: 2026-04-12 11:40:00 +07:00 (v1.4.0)

import { getPrisma } from '@/lib/db'

export async function findMany(tenantId, { search, isActive, limit = 50, skip = 0 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }

  if (typeof isActive === 'boolean') where.isActive = isActive

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.supplier.findMany({
    where,
    skip,
    take: limit,
    orderBy: { name: 'asc' },
  })
}

export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.supplier.findFirst({
    where: { tenantId, supplierId: id },
  })
}

export async function create(tenantId, { name, contactName, phone, email, address, taxId, paymentTerms, notes }) {
  const prisma = await getPrisma()
  const crypto = (await import('crypto')).default
  const supplierId = `SUP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

  return prisma.supplier.create({
    data: {
      supplierId,
      tenantId,
      name,
      contactName: contactName ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      taxId: taxId ?? null,
      paymentTerms: paymentTerms ?? 'NET_30',
      notes: notes ?? null,
    },
  })
}

export async function update(tenantId, id, data) {
  const prisma = await getPrisma()
  const existing = await prisma.supplier.findFirst({
    where: { tenantId, supplierId: id },
    select: { id: true },
  })

  if (!existing) {
    throw new Error(`[supplierRepo] Supplier not found: ${id}`)
  }

  const { supplierId: _supplierId, tenantId: _tenantId, id: _id, ...safeData } = data

  return prisma.supplier.update({
    where: { id: existing.id },
    data: { ...safeData, updatedAt: new Date() },
  })
}

export async function deactivate(tenantId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.supplier.findFirst({
    where: { tenantId, supplierId: id },
    select: { id: true },
  })

  if (!existing) {
    throw new Error(`[supplierRepo] Supplier not found: ${id}`)
  }

  return prisma.supplier.update({
    where: { id: existing.id },
    data: { isActive: false, updatedAt: new Date() },
  })
}
