import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db'
import { getMessages, getConversationById } from '@/lib/repositories/conversationRepo'
import { tagConversation } from '@/lib/ai/conversationTagger'
import { triggerEvent } from '@/lib/pusher'
import { redis } from '@/lib/redis'

const prisma = getPrisma()

/**
 * Worker: Auto Tag / Intent (PDAD)
 * Triggered by QStash after inbound message
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { conversationId, tenantId } = body

    if (!conversationId || !tenantId) {
      return NextResponse.json({ error: 'Missing conversationId or tenantId' }, { status: 400 })
    }

    // 1. Fetch data context
    const [conversation, messages] = await Promise.all([
      getConversationById({ tenantId, id: conversationId }),
      getMessages(conversationId, 10)
    ])

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 2. Run AI Analysis
    const analysis = await tagConversation(messages, {
      industry: 'Culinary School',
      customerName: conversation.customer?.name || conversation.customer?.facebookName || 'Customer'
    })

    // 3. Persist Analysis (Upsert for the current day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const savedAnalysis = await prisma.conversationAnalysis.upsert({
      where: {
        conversationId_analyzedDate: {
          conversationId,
          analyzedDate: today
        }
      },
      create: {
        conversationId,
        tenantId,
        analyzedDate: today,
        contactType: analysis.pdadStage === 'DECISION' ? 'CUSTOMER' : 'LEAD',
        pdadStage: analysis.pdadStage,
        sentiment: analysis.sentiment,
        purchaseIntent: analysis.purchaseIntent,
        intent: analysis.intent,
        suggestedCta: analysis.suggestedCta,
        state: analysis.pdadStage, // Align state with PDAD for now
        cta: analysis.suggestedCta,
        tags: analysis.tags,
        summary: analysis.summary,
        rawOutput: analysis
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
        updatedAt: new Date()
      }
    })

    // 4. Cache real-time analysis in Redis (A5.4 — SentimentDashboard)
    // TTL: 24h. Key: conv:analysis:{conversationId}
    const cachePayload = {
      conversationId,
      tenantId,
      customerName: conversation.customer?.name || conversation.customer?.facebookName || 'Customer',
      purchaseIntent: analysis.purchaseIntent,
      sentiment: analysis.sentiment,
      pdadStage: analysis.pdadStage,
      suggestedCta: analysis.suggestedCta,
      intent: analysis.intent,
      tags: analysis.tags,
      summary: analysis.summary,
      updatedAt: new Date().toISOString()
    }
    await redis.set(`conv:analysis:${conversationId}`, JSON.stringify(cachePayload), { ex: 86400 })
    console.log(`[auto-tag] Real-time cache updated for ${conversationId}`)

    // 5. Trigger Pusher Notifications
    const channel = `tenant-${tenantId}`
    const customerName = conversation.customer?.name || conversation.customer?.facebookName || 'Customer'

    // A5.4: Unconditional sentiment-update event for SentimentDashboard refresh
    await triggerEvent(channel, 'sentiment-update', {
      conversationId,
      customerName,
      purchaseIntent: analysis.purchaseIntent,
      sentiment: analysis.sentiment,
      pdadStage: analysis.pdadStage,
      suggestedCta: analysis.suggestedCta,
      summary: analysis.summary,
      updatedAt: cachePayload.updatedAt
    })

    // High Interest Alert
    if (analysis.purchaseIntent > 0.8) {
      await triggerEvent(channel, 'high-intent-alert', {
        conversationId,
        customerName,
        purchaseIntent: analysis.purchaseIntent,
        summary: analysis.summary
      })
      console.log(`[auto-tag] High intent alert triggered for ${conversationId}`)
    }

    // Negative Sentiment Alert
    if (analysis.sentiment === 'very_negative' || analysis.sentiment === 'negative') {
      await triggerEvent(channel, 'negative-sentiment-alert', {
        conversationId,
        customerName,
        sentiment: analysis.sentiment,
        summary: analysis.summary
      })
      console.log(`[auto-tag] Negative sentiment alert triggered for ${conversationId}`)
    }

    return NextResponse.json({
      status: 'success',
      analysis: savedAnalysis
    })

  } catch (error) {
    console.error('[worker/auto-tag] Fatal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
