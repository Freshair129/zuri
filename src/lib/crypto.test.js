import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Tests for AES-256-GCM token encryption utility
// ─────────────────────────────────────────────────────────────────────────────

// Valid 64-char hex key (32 bytes)
const TEST_KEY = 'a'.repeat(64)

describe('crypto — encrypt / decrypt', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNTING_ENCRYPTION_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should decrypt back to the original plaintext', async () => {
    const { encrypt, decrypt } = await import('./crypto.js')
    const plaintext = 'hello-secret-token'
    const cipher = encrypt(plaintext)
    expect(decrypt(cipher)).toBe(plaintext)
  })

  it('should produce different ciphertext on each call (random IV)', async () => {
    const { encrypt } = await import('./crypto.js')
    const c1 = encrypt('same-value')
    const c2 = encrypt('same-value')
    expect(c1).not.toBe(c2)
  })

  it('ciphertext should be in "iv:tag:data" format', async () => {
    const { encrypt } = await import('./crypto.js')
    const cipher = encrypt('test')
    const parts = cipher.split(':')
    expect(parts).toHaveLength(3)
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0))
  })

  it('should handle long strings (OAuth tokens)', async () => {
    const { encrypt, decrypt } = await import('./crypto.js')
    const longToken = 'eyJhbGciOiJSUzI1NiJ9.' + 'x'.repeat(300)
    expect(decrypt(encrypt(longToken))).toBe(longToken)
  })

  it('should throw on malformed ciphertext', async () => {
    const { decrypt } = await import('./crypto.js')
    expect(() => decrypt('not:valid')).toThrow()
    expect(() => decrypt('garbage')).toThrow()
  })

  it('should throw when ACCOUNTING_ENCRYPTION_KEY is missing', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('ACCOUNTING_ENCRYPTION_KEY', '')
    const { encrypt } = await import('./crypto.js')
    expect(() => encrypt('x')).toThrow(/ACCOUNTING_ENCRYPTION_KEY/)
  })

  it('should throw when key is wrong length', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('ACCOUNTING_ENCRYPTION_KEY', 'tooshort')
    const { encrypt } = await import('./crypto.js')
    expect(() => encrypt('x')).toThrow(/ACCOUNTING_ENCRYPTION_KEY/)
  })
})
