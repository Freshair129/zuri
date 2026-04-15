// Created At: 2026-04-13 01:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-13 01:00:00 +07:00 (v1.0.0)
//
// CI Gate: Verify Edge-safe imports in middleware files
// Prevents recurrence of INC-003/004 (MIDDLEWARE_INVOCATION_FAILED)
//
// Usage:
//   node scripts/check-edge-safe.js
//   npm run check:edge
//
// Exits 0 if safe, exits 1 if banned modules detected.

'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

// Node.js built-ins that are NOT available in the Vercel Edge Runtime
const BANNED_BUILTINS = [
  'async_hooks',
  'child_process',
  'cluster',
  'crypto',       // Node crypto — use Web Crypto (globalThis.crypto) instead
  'dgram',
  'dns',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',         // path/posix is also banned
  'readline',
  'stream',
  'tls',
  'vm',
  'worker_threads',
]

// npm packages known to pull in Node.js-only internals
const BANNED_PACKAGES = [
  'bcrypt',
  'bcryptjs',
  '@prisma/client',   // must use lazy getPrisma() — never static import at top level in middleware
  'prisma',
  '@sentry/node',
  '@sentry/nextjs',   // auto-instrumentation breaks Edge — disable in next.config.js
  'ioredis',          // uses net — use @upstash/redis instead
  'nodemailer',
  'pg',
  'mysql2',
  'mongodb',
  'typeorm',
  'sequelize',
]

// Files to audit — add any file that runs in the Edge Runtime
const FILES_TO_CHECK = [
  'src/middleware.js',
  'src/lib/middleware-safe-utils.js',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractImportLines(content) {
  return content
    .split('\n')
    .map((line, i) => ({ line: line.trim(), lineNum: i + 1 }))
    .filter(({ line }) =>
      line.startsWith('import ') ||
      line.startsWith('export ') && line.includes(' from ') ||
      line.includes('require(') ||
      line.includes('import(')
    )
}

function checkLine(line, banned, type) {
  const hits = []
  for (const mod of banned) {
    const patterns = [
      `'${mod}'`,
      `"${mod}"`,
      `'node:${mod}'`,
      `"node:${mod}"`,
    ]
    if (patterns.some(p => line.includes(p))) {
      hits.push({ mod, type })
    }
  }
  return hits
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let hasError = false
let checkedCount = 0

console.log('🔍 Edge Safety Check — scanning middleware files for banned imports...\n')

for (const relPath of FILES_TO_CHECK) {
  const filePath = path.join(ROOT, relPath)

  if (!fs.existsSync(filePath)) {
    console.log(`⚪ Skipped (not found): ${relPath}`)
    continue
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const importLines = extractImportLines(content)
  let fileClean = true
  checkedCount++

  for (const { line, lineNum } of importLines) {
    const builtinHits = checkLine(line, BANNED_BUILTINS, 'Node.js built-in')
    const packageHits = checkLine(line, BANNED_PACKAGES, 'banned package')

    for (const hit of [...builtinHits, ...packageHits]) {
      console.error(`❌  ${relPath}:${lineNum}`)
      console.error(`    ${hit.type}: '${hit.mod}'`)
      console.error(`    → ${line}\n`)
      hasError = true
      fileClean = false
    }
  }

  if (fileClean) {
    console.log(`✅  ${relPath} — clean`)
  }
}

console.log(`\n${checkedCount} file(s) checked.`)

if (hasError) {
  console.error('\n💥 Edge safety check FAILED — remove banned imports before deploying.')
  console.error('   See docs/decisions/adrs/ADR-079-edge-safety.md for the full banned list.')
  process.exit(1)
} else {
  console.log('\n✅ Edge safety check passed — no banned modules detected.')
  process.exit(0)
}
