// Created At: 2026-04-10 06:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 06:30:00 +07:00 (v1.0.0)

/**
 * Migration PDAD Re-linking — M7 Task G3 (ZDEV-TSK-20260410-030)
 *
 * After migrate-zuri-v1.js, conversations exist but have no
 * ConversationAnalysis row → SentimentDashboard, PDAD chips and the Daily
 * Brief all see "unknown stage". This script walks every migrated
 * conversation and creates a fresh ConversationAnalysis using the existing
 * `tagConversation()` (Gemini Flash, PDAD framework).
 *
 * Design notes:
 *  - Resumable: skips conversations that already have a ConversationAnalysis
 *    for today, so the script can be killed + re-run without re-spending
 *    Gemini credits.
 *  - Concurrency-limited: 4 in flight by default to respect Gemini quotas
 *    and avoid hammering the source DB.
 *  - Tenant-scoped: only touches conversations whose `id` is recorded in
 *    `MigrationLog` for the default tenant — won't analyze hand-entered data.
 *
 * Usage:
 *   GEMINI_API_KEY=... DATABASE_URL=... \
 *     node scripts/migration-relink-pdad.mjs [options]
 *
 * Options:
 *   --migration-id=<id>   Only relink conversations from this migration run
 *   --concurrency=<n>     Parallel Gemini calls (default: 4)
 *   --limit=<n>           Stop after this many conversations (default: all)
 *   --dry-run             Preview which conversations would be analyzed
 *
 * Exit codes:
 *   0  — all eligible conversations now have a ConversationAnalysis
 *   1  — at least one Gemini call failed (re-run to retry)
 *   2  — script crashed
 */

import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_TENANT_ID = '10000000-0000-0000-0000-000000000001'

const argFor = (name, def) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? a.split('=')[1] : def
}

const MIGRATION_ID = argFor('migration-id', null)
const CONCURRENCY = parseInt(argFor('concurrency', '4'), 10)
const LIMIT = argFor('limit', null) ? parseInt(argFor('limit', '0'), 10) : null
const DRY_RUN = process.argv.includes('--dry-run')

const prisma = new PrismaClient()

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set')
  process.exit(2)
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// ─── Inline PDAD prompt (mirrors src/lib/ai/conversationTagger.js) ────────────
// Duplicated here so the script doesn't depend on Next.js path aliases.
async function tagConversation(messages, context = {}) {
  if (!messages || messages.length === 0) {
    return { tags: [], intent: 'unknown', pdadStage: 'PROBLEM', sentiment: 'neutral', purchaseIntent: 0, suggestedCta: 'FOLLOW_UP', summary: 'No messages.' }
  }

  const messageDialog = messages
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are an expert sales analyst for a Thai business platform (Industry: ${context.industry || 'Culinary/Service'}).
Analyze the conversation history and classify it using the PDAD Framework.

**PDAD Framework Stages:**
1. PROBLEM: Customer mentions a pain point or need.
2. DESIRE: Customer shows interest in a specific solution/course.
3. ACTION: Customer asks for details to move forward (price, schedule).
4. DECISION: Customer is making a final choice or has decided.

**Taxonomy:**
- Intents: purchase_inquiry | complaint | information_request | booking | cancellation | feedback | upsell_opportunity
- Sentiments: positive | neutral | negative | very_negative
- CTAs: PUSH_TO_CLOSE | FOLLOW_UP | EDUCATE | NURTURE | RE_ENGAGE

**Conversation:**
${messageDialog}

Return ONLY a valid JSON object:
{
  "tags": ["..."],
  "intent": "...",
  "pdadStage": "PROBLEM|DESIRE|ACTION|DECISION",
  "sentiment": "...",
  "purchaseIntent": 0.0,
  "suggestedCta": "...",
  "summary": "1-sentence Thai summary"
}
JSON ONLY. No markdown.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().replace(/```json|```/g, '').trim()
  return JSON.parse(text)
}

// ─── Concurrency limiter ──────────────────────────────────────────────────────
async function runWithConcurrency(items, n, worker) {
  const results = []
  let idx = 0
  let failed = 0

  async function next() {
    while (idx < items.length) {
      const i = idx++
      try {
        results[i] = await worker(items[i], i)
      } catch (e) {
        failed++
        results[i] = { error: e.message, id: items[i]?.id }
      }
    }
  }

  await Promise.all(Array(Math.min(n, items.length)).fill(0).map(next))
  return { results, failed }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🧠 Zuri Migration PDAD Re-linking')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Tenant:        ${DEFAULT_TENANT_ID}`)
  console.log(`Migration ID:  ${MIGRATION_ID ?? '(all migrations)'}`)
  console.log(`Concurrency:   ${CONCURRENCY}`)
  console.log(`Limit:         ${LIMIT ?? '(no limit)'}`)
  console.log(`Dry run:       ${DRY_RUN}\n`)

  // 1. Find conversations created by this migration that need analysis
  const logWhere = {
    tenantId: DEFAULT_TENANT_ID,
    entityType: 'conversation',
    ...(MIGRATION_ID ? { migrationId: MIGRATION_ID } : {}),
  }

  const convLogs = await prisma.migrationLog.findMany({
    where: logWhere,
    select: { entityId: true },
    ...(LIMIT ? { take: LIMIT } : {}),
  })
  const convIds = convLogs.map((l) => l.entityId)
  console.log(`Found ${convIds.length} migrated conversation(s) in MigrationLog`)

  if (convIds.length === 0) {
    console.log('Nothing to do.')
    process.exit(0)
  }

  // 2. Skip conversations that already have a recent analysis (resumable)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingAnalyses = await prisma.conversationAnalysis.findMany({
    where: {
      conversationId: { in: convIds },
      analyzedDate: { gte: today },
    },
    select: { conversationId: true },
  })
  const alreadyDone = new Set(existingAnalyses.map((a) => a.conversationId))
  const todo = convIds.filter((id) => !alreadyDone.has(id))

  console.log(`  ${alreadyDone.size} already analyzed today (skipping)`)
  console.log(`  ${todo.length} to analyze\n`)

  if (DRY_RUN) {
    console.log('[DRY RUN] Would analyze:', todo.slice(0, 5), todo.length > 5 ? `… +${todo.length - 5} more` : '')
    process.exit(0)
  }

  // 3. Fetch each conversation + messages and analyze
  let processed = 0
  const startedAt = Date.now()

  const { failed } = await runWithConcurrency(todo, CONCURRENCY, async (conversationId) => {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { customer: { select: { name: true, lifecycleStage: true } } },
    })
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 30,
      select: { sender: true, content: true, createdAt: true },
    })

    if (messages.length === 0) {
      // Empty conversation — skip silently
      return { conversationId, status: 'empty' }
    }

    const analysis = await tagConversation(messages, {
      industry: 'Culinary School',
      customerName: conv.customer?.name || 'Customer',
    })

    await prisma.conversationAnalysis.upsert({
      where: {
        conversationId_analyzedDate: { conversationId, analyzedDate: today },
      },
      create: {
        conversationId,
        tenantId: DEFAULT_TENANT_ID,
        analyzedDate: today,
        contactType: analysis.pdadStage === 'DECISION' ? 'CUSTOMER' : 'LEAD',
        pdadStage: analysis.pdadStage,
        sentiment: analysis.sentiment,
        purchaseIntent: analysis.purchaseIntent,
        intent: analysis.intent,
        suggestedCta: analysis.suggestedCta,
        state: analysis.pdadStage,
        cta: analysis.suggestedCta,
        tags: analysis.tags,
        summary: analysis.summary,
        rawOutput: analysis,
      },
      update: {
        pdadStage: analysis.pdadStage,
        sentiment: analysis.sentiment,
        purchaseIntent: analysis.purchaseIntent,
        intent: analysis.intent,
        suggestedCta: analysis.suggestedCta,
        tags: analysis.tags,
        summary: analysis.summary,
        rawOutput: analysis,
        updatedAt: new Date(),
      },
    })

    processed++
    if (processed % 25 === 0) {
      const rate = (processed / ((Date.now() - startedAt) / 1000)).toFixed(2)
      console.log(`  ✓ ${processed}/${todo.length}  (${rate} convs/sec)`)
    }

    return { conversationId, status: 'tagged', pdadStage: analysis.pdadStage }
  })

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Processed: ${processed}/${todo.length}  in ${elapsed}s`)
  if (failed > 0) {
    console.log(`❌ ${failed} failure(s) — re-run this script to retry`)
    process.exit(1)
  }
  console.log('✅ PDAD re-linking complete')
  process.exit(0)
}

main()
  .catch((err) => {
    console.error('\n💥 Re-linking crashed:', err)
    process.exit(2)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
