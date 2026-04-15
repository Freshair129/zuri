import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { verifyQStashSignature } from '@/lib/qstash'
import { getCustomerMessages } from '@/lib/repositories/conversationRepo'
import { getInsightByCustomerId, upsertInsight } from '@/lib/repositories/customerInsightRepo'
import { analyzeCustomerConversation } from '@/lib/ai/gemini'
import { triggerEvent } from '@/lib/pusher'

export async function POST(request) {
  const { isValid, body: rawBody } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  try {
    const { tenantId, customerId } = JSON.parse(rawBody)

    if (!tenantId || !customerId) {
      return NextResponse.json({ error: 'tenantId and customerId are required' }, { status: 400 })
    }

    // 1. Fetch context
    const messages = await getCustomerMessages(tenantId, customerId)
    if (messages.length === 0) {
      return NextResponse.json({ success: true, message: 'No messages to analyze' })
    }

    const currentInsight = await getInsightByCustomerId(tenantId, customerId)

    // 2. Perform AI Analysis (Gemini)
    const aiResult = await analyzeCustomerConversation(messages, currentInsight)
    if (!aiResult) {
      throw new Error('AI Analysis failed to return results')
    }

    // 3. Save Insights & Scores
    const updatedInsight = await upsertInsight(tenantId, customerId, {
      ...aiResult,
      tenantId,
      customerId,
    })

    // 4. Trigger Alerts (Pusher)
    if (aiResult.intentScore >= 70) {
      await triggerEvent(`tenant-${tenantId}`, 'hot-lead', {
        customerId,
        score: aiResult.intentScore,
        summary: aiResult.summary,
      })
    }

    if (aiResult.churnScore >= 70) {
      await triggerEvent(`tenant-${tenantId}`, 'at-risk', {
        customerId,
        score: aiResult.churnScore,
      })
    }

    return NextResponse.json({ success: true, data: updatedInsight })
  } catch (error) {
    console.error('[Workers/CRM-Enrich]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
