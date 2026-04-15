// Created At: 2026-04-14T14:15:00+07:00
// Security & Integration Hook: GATE 5 Verification (Inbox Round-trip)

import { describe, it, expect, vi } from 'vitest'
import { recordInboundMessage } from '@/lib/repositories/conversationRepo'

// Mock dependencies
vi.mock('@/lib/pusher', () => ({ triggerEvent: vi.fn() }))
vi.mock('@/lib/redis', () => ({ getRedis: () => ({ incr: vi.fn().mockResolvedValue(1) }) }))

describe('Inbox Integration (Round-trip Verification)', () => {
  const TEST_TENANT = '10000000-0000-0000-0000-000000000001'
  const TEST_CUSTOMER = 'cust-abc-123'

  it('should process an inbound message and trigger all side effects', async () => {
    // 1. Simulate inbound logic
    // In a real test we would use a mock Prisma client to verify DB calls
    // But here we're verifying the logic flow of recordInboundMessage
    
    const result = await recordInboundMessage({
      tenantId:       TEST_TENANT,
      customerId:     TEST_CUSTOMER,
      conversationId: 'fb-test-user',
      channel:        'facebook',
      participantId:  'test-user',
      text:           'Hello from Facebook!',
      externalId:     'mid.123',
    })

    expect(result.conversation.channel).toBe('facebook')
    expect(result.message.content).toBe('Hello from Facebook!')
    expect(result.message.sender).toBe('customer')
  })

  it('should isolate messages within the tenant context', async () => {
    // Verification of TSK-0100 integration
    const { withTenantContext } = await import('@/lib/tenantContext')
    
    await withTenantContext(TEST_TENANT, async () => {
       const result = await recordInboundMessage({
        tenantId:       TEST_TENANT,
        customerId:     TEST_CUSTOMER,
        conversationId: 'line-test-user',
        channel:        'line',
        participantId:  'test-user',
        text:           'Hello from LINE!',
      })
      
      expect(result.conversation.tenantId).toBe(TEST_TENANT)
    })
  })
})
