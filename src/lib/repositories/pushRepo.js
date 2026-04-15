// Created At: 2026-04-12 05:05:00 +07:00 (v1.3.12)
// Previous version: 2026-04-11 20:33:38 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:05:00 +07:00 (v1.3.12)

import { getPrisma } from '@/lib/db'

/**
 * Save or update a web push subscription
 */
export async function upsertSubscription(tenantId, userId, subscription) {
  const prisma = await getPrisma()
  const { endpoint, keys } = subscription
  const { p256dh, auth } = keys

  return prisma.webPushSubscription.upsert({
    where: { endpoint },
    create: {
      tenantId,
      userId,
      endpoint,
      p256dh,
      auth,
      isActive: true,
    },
    update: {
      tenantId,
      userId,
      p256dh,
      auth,
      isActive: true,
      updatedAt: new Date(),
    },
  })
}

/**
 * Get active subscriptions for a specific user
 */
export async function getSubscriptions(tenantId, userId) {
  const prisma = await getPrisma()
  return prisma.webPushSubscription.findMany({
    where: {
      tenantId,
      userId,
      isActive: true,
    },
  })
}

/**
 * Deactivate a subscription (e.g. on 410 Gone error from push service)
 */
export async function deactivateSubscription(endpoint) {
  const prisma = await getPrisma()
  return prisma.webPushSubscription.update({
    where: { endpoint },
    data: { isActive: false },
  })
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(endpoint) {
  const prisma = await getPrisma()
  return prisma.webPushSubscription.delete({
    where: { endpoint },
  })
}
