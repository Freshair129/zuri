// Created At: 2026-04-10 03:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:30:00 +07:00 (v1.0.0)

/**
 * One-time migration: Encrypt existing plaintext integration tokens.
 * Run: doppler run -- node scripts/migrate-encrypt-tokens.mjs
 *
 * Safe to re-run — skips already-encrypted tokens (detected by ":" separator).
 */

import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getKey() {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }
  return Buffer.from(keyHex, 'hex')
}

function isEncrypted(value) {
  if (!value) return false
  // Already encrypted: "iv_hex:ciphertext_hex"
  return value.includes(':') && value.split(':').length === 2
}

function encryptToken(plaintext) {
  if (!plaintext) return null
  const key = getKey()
  const iv  = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

async function main() {
  console.log('🔐 Migrating plaintext tokens to AES-256-CBC encrypted format...\n')

  const tenants = await prisma.tenant.findMany({
    select: {
      id:                true,
      tenantSlug:        true,
      fbPageToken:       true,
      lineChannelToken:  true,
      lineChannelSecret: true,
    },
  })

  let migrated = 0
  let skipped  = 0

  for (const tenant of tenants) {
    const updates = {}

    if (tenant.fbPageToken && !isEncrypted(tenant.fbPageToken)) {
      updates.fbPageToken = encryptToken(tenant.fbPageToken)
    }
    if (tenant.lineChannelToken && !isEncrypted(tenant.lineChannelToken)) {
      updates.lineChannelToken = encryptToken(tenant.lineChannelToken)
    }
    if (tenant.lineChannelSecret && !isEncrypted(tenant.lineChannelSecret)) {
      updates.lineChannelSecret = encryptToken(tenant.lineChannelSecret)
    }

    if (Object.keys(updates).length > 0) {
      await prisma.tenant.update({ where: { id: tenant.id }, data: updates })
      console.log(`  ✅ ${tenant.tenantSlug} — encrypted: ${Object.keys(updates).join(', ')}`)
      migrated++
    } else {
      console.log(`  ⏭  ${tenant.tenantSlug} — no plaintext tokens (skipped)`)
      skipped++
    }
  }

  console.log(`\nDone. ${migrated} tenants migrated, ${skipped} skipped.`)
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
