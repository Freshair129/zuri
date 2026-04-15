import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

import { verifyQStashSignature, getQStash } from '@/lib/qstash'
import { getConversations, getMessages } from '@/lib/repositories/conversationRepo'
import { upsert as upsertDailyBrief } from '@/lib/repositories/dailyBriefRepo'
import { upsert as upsertCustomerProfile } from '@/lib/repositories/customerProfileRepo'
import { analyzeConversation } from '@/lib/ai/conversationAnalyzer'
import { inferCustomerProfile } from '@/lib/ai/customerProfiler'
import { assignCTATasks } from '@/lib/ai/ctaAssigner'
import { getPrisma } from '@/lib/db'

// POST /api/workers/daily-brief/process
// QStash cron: 5 17 * * * UTC = 00:05 ICT
// body: { tenantId, date } where date = "YYYY-MM-DD"
export async function POST(request) {
  const { isValid, body: rawBody } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  try {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
    const { tenantId, date } = body
    if (!tenantId || !date) {
      return NextResponse.json({ error: 'tenantId and date are required' }, { status: 400 })
    }

    const briefDate = new Date(`${date}T00:00:00+07:00`)
    const prisma = getPrisma()

    // Step 4: Mark PROCESSING
    await upsertDailyBrief(briefDate, {
      status: 'PROCESSING',
      totalConversations: 0,
      totalContacts: 0,
      totalLeads: 0,
      totalCustomers: 0,
      closedWon: 0,
      totalRevenue: 0,
      hotLeads: 0,
      considering: 0,
      closedLost: 0,
      topCtas: [],
      adBreakdown: {},
      topTags: [],
      processedAt: null,
    })

    // Step 5: Fetch all conversations (paginated)
    const conversations = []
    let offset = 0
    const batchSize = 50
    let hasMore = true

    while (hasMore) {
      const batch = await getConversations({ tenantId, date, limit: batchSize, offset })
      if (!batch || batch.length === 0) {
        hasMore = false
      } else {
        conversations.push(...batch)
        offset += batch.length
        if (batch.length < batchSize) hasMore = false
      }
    }

    // Step 6: Prioritize if > 500 conversations
    let toProcess = conversations
    if (conversations.length > 500) {
      toProcess = conversations.slice(0, 500)
    }

    // Step 7: Init accumulators
    const counts = { CONTACT: 0, LEAD: 0, CUSTOMER: 0 }
    const states = { INQUIRY: 0, CONSIDERING: 0, HOT: 0, CLOSED_WON: 0, CLOSED_LOST: 0, IDLE: 0 }
    let totalRevenue = 0
    const tagMap = {}   // { tag: { count, states: { HOT: 0, ... } } }
    const adMap = {}    // { adId: { count, revenue } }
    const ctaCandidates = [] // [{ customerId, name, tags, cta, state }]

    // Step 8: Process each conversation
    const processedResults = []
    for (const conv of toProcess) {
      try {
        const messages = await getMessages(conv.id, 100)

        const [analysis, profile] = await Promise.all([
          analyzeConversation(conv, messages),
          inferCustomerProfile(conv, messages),
        ])

        if (analysis) {
          // Upsert ConversationAnalysis
          await prisma.conversationAnalysis.upsert({
            where: { conversationId_analyzedDate: { conversationId: conv.id, analyzedDate: briefDate } },
            create: {
              conversationId: conv.id,
              analyzedDate: briefDate,
              contactType: analysis.contactType,
              pdadStage: analysis.pdadStage || null,
              sentiment: analysis.sentiment || null,
              purchaseIntent: analysis.purchaseIntent || 0,
              state: analysis.state,
              cta: analysis.cta,
              revenue: analysis.revenue || 0,
              sourceAdId: analysis.sourceAdId || null,
              tags: analysis.tags || [],
              summary: analysis.summary || '',
              rawOutput: analysis,
            },
            update: {
              contactType: analysis.contactType,
              pdadStage: analysis.pdadStage || null,
              sentiment: analysis.sentiment || null,
              purchaseIntent: analysis.purchaseIntent || 0,
              state: analysis.state,
              cta: analysis.cta,
              revenue: analysis.revenue || 0,
              sourceAdId: analysis.sourceAdId || null,
              tags: analysis.tags || [],
              summary: analysis.summary || '',
              rawOutput: analysis,
              updatedAt: new Date(),
            },
          })

          // Accumulate counts
          counts[analysis.contactType] = (counts[analysis.contactType] || 0) + 1
          states[analysis.state] = (states[analysis.state] || 0) + 1
          totalRevenue += analysis.revenue || 0

          // Tag map
          for (const tag of analysis.tags || []) {
            if (!tagMap[tag]) tagMap[tag] = { count: 0, states: {} }
            tagMap[tag].count++
            tagMap[tag].states[analysis.state] = (tagMap[tag].states[analysis.state] || 0) + 1
          }

          // Ad breakdown
          const adKey = analysis.sourceAdId || 'ORGANIC'
          if (!adMap[adKey]) adMap[adKey] = { count: 0, revenue: 0 }
          adMap[adKey].count++
          adMap[adKey].revenue += analysis.revenue || 0

          // CTA candidates (HOT or CONSIDERING)
          if (analysis.state === 'HOT' || analysis.state === 'CONSIDERING') {
            const name =
              conv.customer?.facebookName ||
              conv.customer?.lineName ||
              conv.customer?.name ||
              'à¸¥à¸¹à¸à¸„à¹‰à¸²'
            ctaCandidates.push({
              customerId: conv.customer?.id,
              name,
              tags: analysis.tags || [],
              cta: analysis.cta,
              state: analysis.state,
            })
          }

          // Collection for CTA Assigner
          processedResults.push({ conv, analysis })
        }

        // Upsert customer profile
        if (profile && conv.customer?.id) {
          await upsertCustomerProfile(conv.customer.id, profile)
        }
      } catch (convError) {
        console.error('[Workers/DailyBrief/Process] conv error', conv.id, convError)
        // continue â€” don't let one bad conv break the whole batch
      }
    }

    // Step 9: Aggregate
    const topCtas = ctaCandidates
      .sort((a, b) => (a.state === 'HOT' ? 0 : 1) - (b.state === 'HOT' ? 0 : 1))
      .slice(0, 5)

    const topTags = Object.entries(tagMap)
      .map(([tag, data]) => ({ tag, count: data.count, states: data.states }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Step 10: Upsert DailyBrief DONE
    await upsertDailyBrief(briefDate, {
      status: 'DONE',
      totalConversations: conversations.length,
      totalContacts: counts.CONTACT || 0,
      totalLeads: counts.LEAD || 0,
      totalCustomers: counts.CUSTOMER || 0,
      closedWon: states.CLOSED_WON || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      hotLeads: states.HOT || 0,
      considering: states.CONSIDERING || 0,
      closedLost: (states.CLOSED_LOST || 0) + (states.IDLE || 0),
      topCtas,
      adBreakdown: adMap,
      topTags,
      processedAt: new Date(),
    })

    // Step 10.1: Auto-assign CTA Tasks based on analysis (ZDEV-TSK-20260410-007)
    try {
      await assignCTATasks(tenantId, briefDate, processedResults)
    } catch (assignError) {
      console.error('[Workers/DailyBrief/Process] ctaAssigner error', assignError)
      // continue anyway to send the notification
    }

    // Step 11: Enqueue notify worker
    await getQStash().publishJSON({
      url: `${process.env.APP_URL}/api/workers/daily-brief/notify`,
      body: { tenantId, date },
    })

    return NextResponse.json({ success: true, processed: toProcess.length })
  } catch (error) {
    console.error('[Workers/DailyBrief/Process]', error)
    throw error // QStash retry (NFR3)
  }
}
