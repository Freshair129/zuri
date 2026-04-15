import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Analyze a conversation to extract customer state, CTA, and tags
 * @param {Object} conversation - { id, firstTouchAdId, customer: { facebookName, lineName, name, lifecycleStage } }
 * @param {Array} messages - List of { sender: 'customer'|'staff', content: string, createdAt: Date }
 * @returns {Promise<Object|null>} { contactType, state, cta, revenue, sourceAdId, tags, summary } or null on error
 */
export async function analyzeConversation(conversation, messages) {
  if (!conversation || !messages || messages.length === 0) {
    console.error('[conversationAnalyzer] Missing conversation or messages')
    return null
  }

  const customerName = conversation.customer?.name || conversation.customer?.facebookName || conversation.customer?.lineName || 'Customer'
  const lifecycleStage = conversation.customer?.lifecycleStage || 'UNKNOWN'
  const sourceAdId = conversation.firstTouchAdId || 'ORGANIC'

  // Format messages into dialog
  const messageDialog = messages
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are analyzing a customer conversation for a Thai culinary/business school platform.

**Customer Context:**
- Name: ${customerName}
- Lifecycle Stage: ${lifecycleStage}

**Conversation:**
${messageDialog}

**Your Task:** Analyze this conversation and return ONLY a valid JSON object (no markdown, no extra text).

**Output Format (JSON only):**
{
  "contactType": "CONTACT|LEAD|CUSTOMER",
  "state": "INQUIRY|CONSIDERING|HOT|CLOSED_WON|CLOSED_LOST|IDLE",
  "purchaseIntent": 0.0,
  "cta": "EDUCATE|NURTURE|PUSH_TO_CLOSE|CALL_NOW|UPSELL|RE_ENGAGE|NO_ACTION",
  "revenue": 0,
  "sourceAdId": "${sourceAdId}",
  "tags": ["tag1", "tag2"],
  "summary": "1-2 sentence summary"
}

**Score Definitions:**
- purchaseIntent (0.0 to 1.0):
  - 0.9+: Definite customer, asking for payment details or already paid.
  - 0.7-0.9: Strong interest, asking for schedules, pricing, or specific details.
  - 0.4-0.7: General interest, inquiring about course availability.
  - < 0.4: Casual inquiry, looking for free info, or irrelevant.

**Classification Rules:**

**contactType:**
- CONTACT: First interaction, no purchase history
- LEAD: Multiple interactions, showing interest, no purchase yet
- CUSTOMER: Has completed a purchase or enrolled in course

**state:**
- INQUIRY: Asking questions, gathering information
- CONSIDERING: Comparing options, showing strong interest
- HOT: Immediate buying signals, urgency mentioned
- CLOSED_WON: Purchase/enrollment completed
- CLOSED_LOST: Expressed disinterest or gone silent >7 days
- IDLE: No message >3 days but still open

**cta (Call-To-Action):**
- EDUCATE: Contact + INQUIRY → Send educational content
- NURTURE: Lead + INQUIRY → Build relationship, share testimonials
- PUSH_TO_CLOSE: Lead/Customer + CONSIDERING → Offer discount, urgency
- CALL_NOW: state=HOT → Immediate phone call needed
- UPSELL: Customer + CLOSED_WON → Suggest complementary courses
- RE_ENGAGE: state=IDLE and >3 days since last message → Win-back campaign
- NO_ACTION: CLOSED_LOST → Stop outreach

**revenue:** Number only. Set to 0 unless they explicitly mentioned or completed a purchase.

**tags (max 5, lowercase, romanized Thai):** Examples:
- Food types: salmon, ramen, sushi, wagyu, pastry, pad-thai, curry
- Level: beginner, intermediate, advanced
- Time: weekend-only, weekday, evening
- Price: price-sensitive, premium
- Purpose: hobby, professional, gift

**summary:** Concise 1-2 sentence summary of intent and current status.

Return ONLY the JSON object, nothing else.
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(cleanedText)

    // Ensure sourceAdId is set
    if (!analysis.sourceAdId) {
      analysis.sourceAdId = sourceAdId
    }

    return analysis
  } catch (error) {
    console.error('[conversationAnalyzer]', error)
    return null
  }
}
