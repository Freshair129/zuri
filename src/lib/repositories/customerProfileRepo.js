// Created At: 2026-04-12 05:25:00 +07:00 (v1.3.16)
// Previous version: 2026-04-11 20:34:35 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:25:00 +07:00 (v1.3.16)

import { getPrisma } from '@/lib/db'

const UNKNOWN = 'UNKNOWN'

export async function findByCustomerId(customerId) {
  const prisma = await getPrisma()
  return prisma.customerProfile.findUnique({
    where: { customerId },
  })
}

/**
 * Upsert a customer profile, applying merge logic:
 * existing non-UNKNOWN values are never overwritten by UNKNOWN or null.
 */
export async function upsert(customerId, incoming) {
  const prisma = await getPrisma()
  const existing = await findByCustomerId(customerId)

  if (!existing) {
    return prisma.customerProfile.create({
      data: { customerId, ...incoming },
    })
  }

  const merged = {}
  for (const [key, value] of Object.entries(incoming)) {
    const existingValue = existing[key]
    const incomingIsUnknown = value === null || value === undefined || value === UNKNOWN
    const existingIsKnown = existingValue !== null && existingValue !== undefined && existingValue !== UNKNOWN

    if (existingIsKnown && incomingIsUnknown) {
      continue
    }

    merged[key] = value
  }

  return prisma.customerProfile.update({
    where: { customerId },
    data: merged,
  })
}
