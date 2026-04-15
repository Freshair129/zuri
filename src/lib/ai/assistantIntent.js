import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Detect intent for internal assistant bot.
 * 
 * @param {string} text - User input text
 * @returns {Promise<Object>} { intent, entities: { item, qty, amount, category, period, topic }, rawQuery }
 */
export async function detectAssistantIntent(text) {
  const prompt = `
    You are an AI assistant for an internal Thai culinary school management bot.
    Analyze the user's input and classify it into one of the following intents:
    
    1. QUERY: Asking for factual information from the database. (e.g., "ยอดขายวันนี้เท่าไหร่", "มีนักเรียนกี่คน")
    2. DATA_ENTRY: Recording a new transaction or activity. (e.g., "ขายกาแฟได้ 5 แก้ว", "ซื้อวัตถุดิบ 500 บาท")
    3. REPORT: Requesting a summary or document. (e.g., "ขอรายงานสรุปประจำสัปดาห์", "สรุปยอดเดือนนี้")
    4. UNKNOWN: Anything else.

    Also extract relevant entities:
    - item: The thing sold/bought
    - qty: The quantity (number)
    - amount: The price/cost (number)
    - category: The type of transaction (income/expense)
    - period: day, week, month, year
    - topic: The subject of the query or report

    Response MUST be ONLY a valid JSON object.
    
    Input: "${text}"
  `

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('[detectAssistantIntent Error]:', error)
    return { intent: 'UNKNOWN' }
  }
}
