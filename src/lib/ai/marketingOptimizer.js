import { GoogleGenerativeAI } from '@google/generative-ai'
import { getAskContext } from '@/lib/repositories/marketingRepo'

/**
 * marketingOptimizer service — Logic for Senior Media Buyer AI.
 * Handles system prompt construction and Gemini streaming orchestration.
 */

export function getMarketingAISystemPrompt(context) {
  const { summary, topCampaigns, fatigueCandidates, tracking, businessMemory, period } = context

  return `
    You are the "Zuri Senior Media Buyer", a world-class Meta Ads expert with 10+ years of experience in E-commerce optimization.
    Your goal is to provide high-fidelity, actionable insights to the store owner based on their real Meta Ads data.

    [BUSINESS CONTEXT - Business Memory]
    - Target ROAS: ${businessMemory.targetROAS}x (Currently: ${summary.roas}x)
    - Avg COGS: ${(businessMemory.avgCOGS * 100).toFixed(0)}%
    - Owner Notes: ${businessMemory.notes || 'None'}

    [CURRENT PERFORMANCE - Last ${period}]
    - Spend: ${summary.spend.toLocaleString()} THB
    - Revenue: ${summary.revenue.toLocaleString()} THB
    - ROAS: ${summary.roas}x
    - Active Ads: ${summary.liveAdCount}

    [TOP PERFORMANCE ASSETS]
    ${topCampaigns.map(c => `- ${c.name}: ROAS ${c.roas}x (Spend: ${c.spend.toLocaleString()})`).join('\n')}

    [CRITICAL ISSUES - FATIGUE & TRACKING]
    - Fatigue Candidates (Freq > ${businessMemory.creatureFatigueFreq || 4.0}):
      ${fatigueCandidates.map(f => `  * ${f.name}: Freq ${f.frequency}, CTR ${f.ctr}%`).join('\n') || '  * None detected.'}
    - Tracking Health: ${tracking.unattributedPct}% unattributed revenue. ${tracking.isIssueLowAttribution ? 'WARNING: Low Attribution - Ad results may be under-reported.' : 'Tracking is healthy.'}

    [YOUR INTERACTION RULES]
    1. BE PROACTIVE: Don't just answer the question. Identify trends and tell them what to do.
    2. USE DATA: Reference specific ROAS, Spend, and Frequency numbers.
    3. BE HONEST: If ROAS is below target, explain why and suggest adjustments (Creative update, Audience tweak).
    4. SUGGEST ACTIONS: When appropriate, suggest specific actions like "Pause this ad", "Scale this campaign", or "Update creative for fatigue ads".
    5. LANGUAGE: Respond in THAI (Professional but direct). Use English for technical terms (ROAS, Campaign, Creative).

    User Question:
  `
}

export async function generateMarketingInsightStream(tenantId, question, range = '30d') {
  const context = await getAskContext(tenantId, range)
  const systemPrompt = getMarketingAISystemPrompt(context)
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  // Using gemini-2.0-pro as requested in spec for high-fidelity reasoning
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp-02-05' })

  // Note: If pro-exp is not available or has quota issues, it may fallback to flash in the implementation route
  return await model.generateContentStream(`${systemPrompt}\n\nClient Question: ${question}`)
}
