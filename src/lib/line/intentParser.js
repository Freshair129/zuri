// Created At: 2026-04-10 02:45:00 +07:00 (v1.0.0)
// Previous version: None
// Last Updated: 2026-04-10 02:45:00 +07:00 (v1.0.0)

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Stage 1: Fast Intent Detection (Regex)
 * Scans for primary keywords to decide if we should fire Gemini.
 */
export function fastDetectIntent(text) {
  const t = (text || '').toUpperCase()
  if (t.includes('REPORT') || t.includes('สรุปยอด') || t.includes('ยอดขาย')) return 'REPORT'
  if (t.includes('ORDER') || t.includes('สั่ง') || t.includes('จองโต๊ะ')) return 'ORDER'
  
  // Also check for patterns like "1 ลาเต้" or "กาแฟ 2"
  const orderPattern = /\b\d+\s+[\u0E00-\u0E7F]|\b[\u0E00-\u0E7F]+\s+\d+/
  if (orderPattern.test(text)) return 'ORDER'

  return null
}

/**
 * Stage 2: Deep Intent Parsing (Gemini)
 * Extracts structured data from the message.
 */
export async function parseIntentWithAI(text) {
  const prompt = `
    Analyze this message from a LINE Retail/Restaurant group and extract the intent and data.
    
    INTENTS:
    - REPORT: Sales summary for a period (e.g., Daily totals, Item counts).
    - ORDER: A new customer order to be entered into POS.
    - NONE: Unrelated conversation.

    OUTPUT SCHEMA (JSON ONLY):
    {
      "intent": "REPORT" | "ORDER" | "NONE",
      "data": {
        "totalRevenue": number | null,
        "items": [
          { "name": "string", "qty": number, "price": number | null }
        ],
        "summary": "Thai string",
        "orderType": "DINE_IN" | "TAKE_AWAY" | "DELIVERY"
      },
      "confidence": number (0-1)
    }

    RULES:
    - Language: Primarily Thai (th-TH).
    - Be strict about ORDER intent to prevent accidental POS entries.
    - If the message is just chatting, return NONE.
    - Response MUST be ONLY a valid JSON object.
    
    Message: "${text}"
  `

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanedText)
  } catch (err) {
    console.error('[IntentParser AI Error]', err)
    return { intent: 'NONE', data: null, confidence: 0 }
  }
}
