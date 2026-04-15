// Created At: 2026-04-12 03:55:00 +07:00 (v1.2.7)
// Previous version: 2026-04-10 03:30:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 03:55:00 +07:00 (v1.2.7)

/**
 * Token Encryption Utility — AES-256-CBC
 * Isolated from Edge Runtime module evaluation to prevent crashes.
 */

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

async function getCrypto() {
  // Use dynamic import to keep 'crypto' out of the Edge module graph
  return (await import('crypto')).default
}

function getKey() {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt a plaintext token.
 */
export async function encryptToken(plaintext) {
  if (!plaintext) return null

  const crypto = await getCrypto()
  const key = getKey()
  const iv  = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt an encrypted token.
 */
export async function decryptToken(ciphertext) {
  if (!ciphertext) return null

  // Migration safety: if it doesn't look like "hex:hex", treat as plaintext
  if (!ciphertext.includes(':')) return ciphertext

  const [ivHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !encryptedHex) return ciphertext

  try {
    const crypto = await getCrypto()
    const key = getKey()
    const iv  = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[tokenEncryption] decryptToken failed:', err.message)
    return null
  }
}
