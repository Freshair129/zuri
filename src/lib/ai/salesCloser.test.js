// Created At: 2026-04-11 19:50:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 19:50:00 +07:00 (v1.0.0)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { closeSale } from './salesCloser'

// 1. Mock Gemini (GoogleGenerativeAI)
const mockGenerateContent = vi.fn()
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent
      }))
    }))
  }
})

// 2. Mock Redis
vi.mock('@/lib/redis', () => ({
  getOrSet: vi.fn((key, cb) => cb())
}))

// 3. Mock Objection Playbook
vi.mock('@/lib/ai/objectionPlaybook', () => ({
  getPlaybook: vi.fn(() => []),
  detectObjections: vi.fn(() => [])
}))

describe('salesCloser AI Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup generic mock prisma
    globalThis.__mockPrisma = {
      tenant: { findUnique: vi.fn() },
      product: { findMany: vi.fn() },
      conversation: { findFirst: vi.fn() }
    }
  })

  it('should return a valid reply and action when Gemini succeeds', async () => {
    // Setup Context Mocks
    globalThis.__mockPrisma.tenant.findUnique.mockResolvedValue({ tenantName: 'Test School' })
    globalThis.__mockPrisma.product.findMany.mockResolvedValue([])
    globalThis.__mockPrisma.conversation.findFirst.mockResolvedValue({ messages: [], customer: {} })

    // Mock Gemini response (JSON)
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          reply: 'สวัสดีค่ะ สนใจคอร์สไหนคะ?',
          action: 'REPLY',
          reasoning: 'Customer greeted'
        })
      }
    })

    const result = await closeSale('t1', 'c1', 'สวัสดี')

    expect(result.reply).toBe('สวัสดีค่ะ สนใจคอร์สไหนคะ?')
    expect(result.action).toBe('REPLY')
    expect(mockGenerateContent).toHaveBeenCalled()
  })

  it('should handle CREATE_ORDER action and resolve product', async () => {
    globalThis.__mockPrisma.tenant.findUnique.mockResolvedValue({ tenantName: 'Test School' })
    globalThis.__mockPrisma.product.findMany.mockResolvedValue([
      { name: 'Sushi 101', posPrice: 2500, category: 'Culinary' }
    ])
    globalThis.__mockPrisma.conversation.findFirst.mockResolvedValue({ messages: [], customer: {} })

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          reply: 'ได้ค่ะ จัดให้เลย คอร์ส Sushi 101 นะคะ',
          action: 'CREATE_ORDER',
          productName: 'Sushi',
          reasoning: 'Customer wants sushi'
        })
      }
    })

    const result = await closeSale('t1', 'c1', 'อยากเรียนทำซูชิ')

    expect(result.action).toBe('CREATE_ORDER')
    expect(result.orderDraft).not.toBeNull()
    expect(result.orderDraft.productName).toBe('Sushi 101')
    expect(result.orderDraft.estimatedTotal).toBe(2500)
  })

  it('should fallback to ESCALATE if Gemini fails or JSON is malformed', async () => {
    globalThis.__mockPrisma.tenant.findUnique.mockResolvedValue({})
    globalThis.__mockPrisma.product.findMany.mockResolvedValue([])
    globalThis.__mockPrisma.conversation.findFirst.mockResolvedValue({})

    // Simulate error
    mockGenerateContent.mockRejectedValue(new Error('Quota limit exceeded'))

    const result = await closeSale('t1', 'c1', 'hello')

    expect(result.action).toBe('ESCALATE')
    expect(result.reply).toContain('ขออภัย')
  })
})
