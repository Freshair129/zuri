// Created At: 2026-04-12 11:35:00 +07:00 (v1.2.0)
// Previous version: 2026-04-06 09:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 11:35:00 +07:00 (v1.2.0)

/**
 * AES-256-GCM encryption for sensitive values (OAuth tokens).
 * Sanitized for Edge Runtime compatibility.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LEN = 16
const TAG_LEN = 16

async function getKey() {
  const raw = process.env.ACCOUNTING_ENCRYPTION_KEY
  if (!raw || raw.length !== 64) {
    throw new Error('ACCOUNTING_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  }
  return Buffer.from(raw, 'hex')
}

/**
 * Encrypt a plaintext string.
 * @returns {string} base64-encoded "iv:tag:ciphertext"
 */
export async function encrypt(plaintext) {
  const crypto = (await import('crypto')).default
  const key = await getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

/**
 * Decrypt a value produced by encrypt().
 * @returns {string} original plaintext
 */
export async function decrypt(ciphertext) {
  const crypto = (await import('crypto')).default
  const [ivB64, tagB64, encB64] = ciphertext.split(':')
  if (!ivB64 || !tagB64 || !encB64) throw new Error('Invalid ciphertext format')
  const key = await getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const enc = Buffer.from(encB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8')
}
