import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  return {
    generateContent: vi.fn()
  }
})

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: mocks.generateContent
        }
      }
    },
  }
})

import { analyzeCustomerConversation, generateFollowUpDraft } from './gemini'

describe('gemini AI logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('analyzeCustomerConversation', () => {
    it('should format message history and parse JSON response from Gemini', async () => {
      const messages = [
        { sender: 'customer', content: 'Interest in cake course' },
        { sender: 'staff', content: 'Sure, here is the price.' }
      ]
      
      const mockAiResponse = {
        response: {
          text: () => '```json\n{"intentScore": 80, "interests": ["cake"], "summary": "Wants cake"}\n```'
        }
      }
      mocks.generateContent.mockResolvedValue(mockAiResponse)

      const result = await analyzeCustomerConversation(messages)

      expect(mocks.generateContent).toHaveBeenCalledWith(expect.stringContaining('Customer: Interest in cake course'))
      expect(result.intentScore).toBe(80)
      expect(result.interests).toContain('cake')
    })

    it('should return null if Gemini fails or returns invalid JSON', async () => {
      mocks.generateContent.mockRejectedValue(new Error('AI Error'))
      const result = await analyzeCustomerConversation([])
      expect(result).toBeNull()
    })
  })

  describe('generateFollowUpDraft', () => {
    it('should generate a friendly draft message', async () => {
      const mockAiResponse = {
        response: {
          text: () => 'Hello John, thanks for asking about cake.'
        }
      }
      mocks.generateContent.mockResolvedValue(mockAiResponse)

      const result = await generateFollowUpDraft('John', 'Wants cake', { cake: true })

      expect(mocks.generateContent).toHaveBeenCalledWith(expect.stringContaining('John'))
      expect(result).toBe('Hello John, thanks for asking about cake.')
    })
  })
})
