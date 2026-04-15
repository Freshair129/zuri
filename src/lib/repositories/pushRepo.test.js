import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'
const USER_ID = 'user-1'
const SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  keys: {
    p256dh: 'BNcR6S9M433...',
    auth: 'BT7247c.'
  }
}

describe('pushRepo', () => {
  let mockPrisma

  beforeEach(async () => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  describe('upsertSubscription', () => {
    it('should upsert subscription using endpoint as unique key', async () => {
      const { upsertSubscription } = await import('./pushRepo.js')

      mockPrisma.webPushSubscription.upsert.mockResolvedValue({ id: 'uuid-1', endpoint: SUBSCRIPTION.endpoint })

      await upsertSubscription(TENANT, USER_ID, SUBSCRIPTION)

      expect(mockPrisma.webPushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: SUBSCRIPTION.endpoint },
          create: expect.objectContaining({
            tenantId: TENANT,
            userId: USER_ID,
            endpoint: SUBSCRIPTION.endpoint,
            p256dh: SUBSCRIPTION.keys.p256dh,
            auth: SUBSCRIPTION.keys.auth
          })
        })
      )
    })
  })

  describe('getSubscriptions', () => {
    it('should find active subscriptions for a user', async () => {
      const { getSubscriptions } = await import('./pushRepo.js')
      mockPrisma.webPushSubscription.findMany.mockResolvedValue([])

      await getSubscriptions(TENANT, USER_ID)

      expect(mockPrisma.webPushSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER_ID, isActive: true }
        })
      )
    })
  })

  describe('deactivateSubscription', () => {
    it('should set isActive to false', async () => {
      const { deactivateSubscription } = await import('./pushRepo.js')
      const endpoint = SUBSCRIPTION.endpoint
      mockPrisma.webPushSubscription.update.mockResolvedValue({ endpoint, isActive: false })

      await deactivateSubscription(endpoint)

      expect(mockPrisma.webPushSubscription.update).toHaveBeenCalledWith({
        where: { endpoint },
        data: { isActive: false }
      })
    })
  })
})
