import { describe, it, expect } from 'vitest'
import { maskValue, maskPii } from './masking'

describe('PII Masking Utilities', () => {
  describe('maskValue', () => {
    it('should mask phone numbers correctly', () => {
      expect(maskValue('0812345678', 'phone')).toBe('081-***-5678')
      expect(maskValue('+66812345678', 'phone')).toBe('+6681-***-5678')
    })

    it('should mask emails correctly', () => {
      expect(maskValue('john.doe@example.com', 'email')).toBe('j***e@example.com')
      expect(maskValue('ab@test.com', 'email')).toBe('***@test.com')
    })

    it('should mask generic IDs', () => {
      expect(maskValue('U1234567890', 'id')).toBe('U12***890')
    })
  })

  describe('maskPii', () => {
    const mockData = {
      id: 'cust-1',
      name: 'John Doe',
      phone: '0812345678',
      email: 'john@doe.com',
      metadata: {
        lineId: 'line-123456'
      }
    }

    it('should return raw data for OWNER/MANAGER/DEV roles', () => {
      expect(maskPii(mockData, ['OWNER'])).toEqual(mockData)
      expect(maskPii(mockData, ['MANAGER'])).toEqual(mockData)
      expect(maskPii(mockData, ['DEV'])).toEqual(mockData)
    })

    it('should mask data for SALES role', () => {
      const masked = maskPii(mockData, ['SALES'])
      expect(masked.phone).toBe('081-***-5678')
      expect(masked.email).toBe('j***n@doe.com')
      expect(masked.metadata.lineId).toBe('lin***456')
      expect(masked.name).toBe('John Doe') // Non-PII should remain
    })

    it('should mask array of objects', () => {
      const arrayData = [mockData, { ...mockData, id: 'cust-2' }]
      const masked = maskPii(arrayData, ['SALES'])
      expect(masked).toHaveLength(2)
      expect(masked[0].phone).toBe('081-***-5678')
    })
  })
})
