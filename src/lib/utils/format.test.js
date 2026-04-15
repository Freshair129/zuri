import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  formatRelativeTime,
} from '@/lib/utils/format'

// ─────────────────────────────────────────────────────────────────────────────
// formatCurrency
// ─────────────────────────────────────────────────────────────────────────────
describe('formatCurrency', () => {
  it('should format whole number as Thai Baht with 2 decimal places', () => {
    const result = formatCurrency(1234)
    expect(result).toContain('1,234')
    expect(result).toContain('00') // minimumFractionDigits: 2
  })

  it('should format decimal amount correctly', () => {
    const result = formatCurrency(99.5)
    expect(result).toContain('99')
    expect(result).toContain('50')
  })

  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0')
  })

  it('should include THB currency symbol or code', () => {
    const result = formatCurrency(500)
    // th-TH locale may render ฿ or THB depending on Node ICU data
    expect(result).toMatch(/฿|THB/)
  })

  it('should format large amounts with thousand separators', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain('1,000,000')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('should accept a Date object', () => {
    const result = formatDate(new Date('2026-03-28T00:00:00Z'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should accept an ISO string', () => {
    const result = formatDate('2026-01-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('should include the Buddhist Era year 2569 for a 2026 CE date (th-TH locale)', () => {
    const result = formatDate('2026-03-28')
    // th-TH locale uses Buddhist Era: 2026 CE = 2569 BE
    expect(result).toContain('2569')
  })

  it('should include the day number', () => {
    const result = formatDate('2026-03-28')
    expect(result).toContain('28')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatDateTime
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDateTime', () => {
  it('should include both date and time parts', () => {
    const result = formatDateTime('2026-03-28T07:30:00Z')
    // th-TH locale uses Buddhist Era: 2026 CE = 2569 BE
    expect(result).toContain('2569')
    expect(result).toContain('28')
  })

  it('should include hour and minute segments', () => {
    const result = formatDateTime(new Date('2026-06-15T10:05:00'))
    // Result should have at least one colon (time separator)
    expect(result).toContain(':')
  })

  it('should be longer than formatDate alone', () => {
    const d = '2026-05-20T12:00:00'
    expect(formatDateTime(d).length).toBeGreaterThan(formatDate(d).length)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatPhone
// ─────────────────────────────────────────────────────────────────────────────
describe('formatPhone', () => {
  it('should convert E.164 +66 to local 0XX-XXX-XXXX format', () => {
    expect(formatPhone('+66812345678')).toBe('081-234-5678')
  })

  it('should handle E.164 starting with +660 (landline area code)', () => {
    // '0' + '021234567' = '0021234567' — 10 digits → XXX-XXX-XXXX
    expect(formatPhone('+66021234567')).toBe('002-123-4567')
  })

  it('should handle another mobile number', () => {
    expect(formatPhone('+66987654321')).toBe('098-765-4321')
  })

  it('should return empty string for null/undefined/empty input', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
    expect(formatPhone('')).toBe('')
  })

  it('should return original value if not 10 local digits after conversion', () => {
    // 8-digit number after stripping +66 = only 9 local digits
    const short = '+6681234567' // 8 digits after +66 = 9 local
    const result = formatPhone(short)
    expect(result).toBe(short) // falls through to return original
  })

  it('should strip non-digit chars and return raw string if not starting with +66', () => {
    // non-+66 input: digits extracted, if not 10 chars, return original
    expect(formatPhone('0812345678')).toBe('081-234-5678')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatRelativeTime
// ─────────────────────────────────────────────────────────────────────────────
describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Pin "now" to a fixed timestamp
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-08T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "เมื่อกี้" for events less than 60 seconds ago', () => {
    const date = new Date('2026-04-08T11:59:30Z') // 30 seconds ago
    expect(formatRelativeTime(date)).toBe('เมื่อกี้')
  })

  it('should return minutes for events 1–59 minutes ago', () => {
    const date = new Date('2026-04-08T11:57:00Z') // 3 minutes ago
    expect(formatRelativeTime(date)).toBe('3 นาทีที่แล้ว')
  })

  it('should return hours for events 1–23 hours ago', () => {
    const date = new Date('2026-04-08T10:00:00Z') // 2 hours ago
    expect(formatRelativeTime(date)).toBe('2 ชม.')
  })

  it('should return days for events 1–6 days ago', () => {
    const date = new Date('2026-04-05T12:00:00Z') // 3 days ago
    expect(formatRelativeTime(date)).toBe('3 วันที่แล้ว')
  })

  it('should fall back to formatDate for events 7+ days ago', () => {
    const date = new Date('2026-03-28T12:00:00Z') // 11 days ago
    const result = formatRelativeTime(date)
    // Should be a formatted date string — th-TH uses Buddhist Era (2569 not 2026)
    expect(result).toContain('2569')
    expect(result).not.toContain('นาที')
    expect(result).not.toContain('ชม.')
    expect(result).not.toContain('วันที่แล้ว')
  })

  it('should return "เมื่อกี้" for event happening right now', () => {
    const date = new Date('2026-04-08T12:00:00Z') // exact same time (0s diff)
    expect(formatRelativeTime(date)).toBe('เมื่อกี้')
  })
})
