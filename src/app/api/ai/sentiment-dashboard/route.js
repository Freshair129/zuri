import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { redis } from '@/lib/redis'

const prisma = getPrisma()

const SENTIMENT_ORDER = { very_negative: 4, negative: 3, neutral: 2, positive: 1 }

/**
 * GET /api/ai/sentiment-dashboard
 * M3b A5.4 — Real-time Sentiment Dashboard data
 * Returns today's conversation analysis merged with Redis real-time cache.
 * RBAC: inbox R (OWNER, MANAGER, SALES, STAFF, DEV)
 */
export const GET = withAuth(async (req, { session }) => {
  try {
    const tenantId = session.user.tenantId

    // 1. Fetch today's ConversationAnalysis from DB
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dbAnalyses = await prisma.conversationAnalysis.findMany({
      where: {
        tenantId,
        analyzedDate: { gte: today }
      },
      orderBy: { purchaseIntent: 'desc' },
      take: 50,
      include: {
        conversation: {
          include: {
            customer: {
              select: { name: true, facebookName: true, lineId: true }
            }
          }
        }
      }
    })

    // 2. Build map from DB data
    const analysisMap = {}
    for (const a of dbAnalyses) {
      analysisMap[a.conversationId] = {
        conversationId: a.conversationId,
        tenantId: a.tenantId,
        customerName:
          a.conversation?.customer?.name ||
          a.conversation?.customer?.facebookName ||
          'Customer',
        purchaseIntent: a.purchaseIntent ?? 0,
        sentiment: a.sentiment ?? 'neutral',
        pdadStage: a.pdadStage ?? 'PROBLEM',
        suggestedCta: a.suggestedCta ?? 'FOLLOW_UP',
        intent: a.intent ?? null,
        tags: a.tags ?? [],
        summary: a.summary ?? null,
        source: 'db',
        updatedAt: a.updatedAt?.toISOString() ?? null
      }
    }

    // 3. Overlay with fresher Redis real-time data (A5.4)
    try {
      const redisKeys = await redis.keys(`conv:analysis:*`)
      if (redisKeys && redisKeys.length > 0) {
        const rawValues = await Promise.all(redisKeys.map((k) => redis.get(k)))
        for (const raw of rawValues) {
          if (!raw) continue
          const entry = typeof raw === 'string' ? JSON.parse(raw) : raw
          // Only overlay if same tenant
          if (entry.tenantId !== tenantId) continue
          // Redis is more recent — overwrite DB entry
          if (analysisMap[entry.conversationId]) {
            const dbUpdated = new Date(analysisMap[entry.conversationId].updatedAt || 0)
            const redisUpdated = new Date(entry.updatedAt || 0)
            if (redisUpdated > dbUpdated) {
              analysisMap[entry.conversationId] = { ...entry, source: 'realtime' }
            }
          } else {
            analysisMap[entry.conversationId] = { ...entry, source: 'realtime' }
          }
        }
      }
    } catch (redisErr) {
      console.error('[sentiment-dashboard] Redis overlay failed (non-fatal):', redisErr.message)
    }

    // 4. Sort: purchaseIntent DESC, then sentiment severity DESC
    const results = Object.values(analysisMap).sort((a, b) => {
      if (b.purchaseIntent !== a.purchaseIntent) return b.purchaseIntent - a.purchaseIntent
      return (SENTIMENT_ORDER[b.sentiment] ?? 0) - (SENTIMENT_ORDER[a.sentiment] ?? 0)
    })

    return NextResponse.json({
      status: 'ok',
      total: results.length,
      analyses: results
    })
  } catch (error) {
    console.error('[sentiment-dashboard] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}, { domain: 'inbox', action: 'R' })
