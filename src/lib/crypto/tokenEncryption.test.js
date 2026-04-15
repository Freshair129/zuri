// Created At: 2026-04-11 19:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 19:30:00 +07:00 (v1.0.0)

import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from './tokenEncryption'

describe('tokenEncryption', () => {
  const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY
  })

  describe('encryptToken', () => {
    it('should return null for null/empty input', () => {
      expect(encryptToken(null)).toBeNull()
      expect(encryptToken('')).toBeNull()
    })

    it('should return a string in iv:ciphertext format', () => {
      const plaintext = 'hello-world'
      const encrypted = encryptToken(plaintext)
      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    })

    it('should use different IVs for same plaintext (randomness)', () => {
      const plaintext = 'same-text'
      const enc1 = encryptToken(plaintext)
      const enc2 = encryptToken(plaintext)
      expect(enc1).not.toBe(enc2)
    })
  })

  describe('decryptToken', () => {
    it('should return null for null/undefined input', () => {
      expect(decryptToken(null)).toBeNull()
      expect(decryptToken(undefined)).toBeNull()
    })

    it('should decrypt a correctly encrypted token', () => {
      const plaintext = 'secret-sauce-123'
      const encrypted = encryptToken(plaintext)
      const decrypted = decryptToken(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should return raw input if it lacks a colon (migration safety)', () => {
      const plaintext = 'already-unencrypted'
      expect(decryptToken(plaintext)).toBe(plaintext)
    })

    it('should return raw input if format is invalid (single colon at start/end)', () => {
      expect(decryptToken(':abc')).toBe(':abc')
      expect(decryptToken('abc:')).toBe('abc:')
    })

    it('should return null if decryption fails (invalid hex or key mismatch)', () => {
      // Valid-ish format but corrupted hex
      expect(decryptToken('1234:5678')).toBeNull()
    })
  })
})
