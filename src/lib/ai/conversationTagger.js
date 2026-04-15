import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * PDAD Tagger - Analyzes conversations using Problem/Desire/Action/Decision framework
 * @param {Array} messages - List of { sender: 'customer'|'staff', content: string }
 * @param {Object} context - Optional { tenantName, customerName, industry }
 * @returns {Promise<Object>} Analyzed PDAD tags and intent
 */
export async function tagConversation(messages, context = {}) {
  if (!messages || messages.length === 0) {
    return {
      tags: [],
      intent: 'unknown',
      pdadStage: 'PROBLEM',
      sentiment: 'neutral',
      purchaseIntent: 0,
      suggestedCta: 'FOLLOW_UP',
      summary: 'No messages to analyze.'
    }
  }

  const messageHistory = messages
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are an expert sales analyst for a Thai business platform (Industry: ${context.industry || 'Culinary/Service'}).
Analyze the conversation history and classify it using the PDAD Framework.

**PDAD Framework Stages:**
1. PROBLEM: Customer mentions a pain point or need (e.g., "I don't know how to cook", "Need a new hobby").
2. DESIRE: Customer shows interest in a specific solution/course (e.g., "Tell me about the Sushi course").
3. ACTION: Customer asks for details to move forward (e.g., "What's the price?", "Is there a class this Saturday?").
4. DECISION: Customer is making a final choice or has decided (e.g., "I'll join", "Let me check my schedule first").

**Taxonomy for Culinary/Service School:**
- Topics: pricing, schedule, course-info, enrollment, payment, certificate, ingredients, dietary, location, promotion
- Intents: purchase_inquiry, complaint, information_request, booking, cancellation, feedback, upsell_opportunity
- Sentiments: positive, neutral, negative, very_negative
- CTAs: PUSH_TO_CLOSE, FOLLOW_UP, EDUCATE, NURTURE, RE_ENGAGE

**Conversation History:**
${messageHistory}

**Task:**
Return ONLY a valid JSON object with these fields:
- tags: Array of relevant topics from the taxonomy.
- intent: One value from the intents list.
- pdadStage: One value from PROBLEM, DESIRE, ACTION, DECISION.
- sentiment: One value from sentiments list.
- purchaseIntent: Float from 0.0 to 1.0.
- suggestedCta: One value from CTAs list.
- summary: Concise 1-sentence summary in Thai.

**Example Output:**
{
  "tags": ["pricing", "course-info"],
  "intent": "purchase_inquiry",
  "pdadStage": "ACTION",
  "sentiment": "positive",
  "purchaseIntent": 0.85,
  "suggestedCta": "PUSH_TO_CLOSE",
  "summary": "ลูกค้าสนใจคอร์สทำซูชิและสอบถามเรื่องราคาและรอบเรียน"
}

JSON ONLY. No markdown.
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('[conversationTagger] Error:', error)
    return {
      tags: [],
      intent: 'error',
      pdadStage: 'PROBLEM',
      sentiment: 'neutral',
      purchaseIntent: 0,
      suggestedCta: 'FOLLOW_UP',
      summary: 'Error analyzing conversation.'
    }
  }
}
