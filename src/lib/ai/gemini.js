import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Analyze a conversation to extract customer insights and scores
 * @param {Array} messages - List of recent messages
 * @param {Object} currentInsight - Existing insight data (optional)
 */
export async function analyzeCustomerConversation(messages, currentInsight = {}) {
  const messageHistory = messages
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`)
    .join('\n')

  const prompt = `
    Analyze the following conversation between a Customer and Staff. 
    Extract the following insights in JSON format:
    
    1. interests: Array of strings (e.g., ["course", "promotion"])
    2. objections: Array of strings (e.g., ["price too high", "no time"])
    3. commStyle: String describing how they communicate (e.g., "polite", "direct")
    4. keyFacts: Array of important facts mentioned (e.g., "has 2 kids", "WFH")
    5. summary: A 2-3 sentence summary of their current status/intent.
    6. contactPref: Preferred contact channel or time if mentioned.
    7. intentScore: Integer 0-100 (Purchase Intent - how ready are they to buy?)
    8. churnScore: Integer 0-100 (Churn Risk - how likely to stop engaging?)

    Rules:
    - Base scores on language used (asking for price/date = high intent, complaining/long silence = high churn).
    - If info is missing, leave as null or empty array.
    - Response MUST be ONLY a valid JSON object.

    Conversation:
    ${messageHistory}

    Existing Context (for reference):
    ${JSON.stringify(currentInsight)}
  `

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    // Clean potential markdown code blocks
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('Gemini Analysis Error:', error)
    return null
  }
}

/**
 * Generate a follow-up draft based on insights
 */
export async function generateFollowUpDraft(customerName, lastMessage, insights) {
  const prompt = `
    Acting as a friendly and professional sales assistant at Zuri (a culinary/business platform).
    Draft a personalized follow-up message to ${customerName}.
    
    Last Message from Customer: "${lastMessage}"
    AI Insights: ${JSON.stringify(insights)}
    
    Objective: Re-engage the customer, address any objections, and move them to the next stage.
    Tone: Friendly, helpful, Thai language (unless the customer uses English).
    Length: Short and conversational.
  `

  try {
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (error) {
    console.error('Gemini Draft Error:', error)
    return 'Could not generate draft.'
  }
}
