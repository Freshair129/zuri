// Created At: 2026-04-12 12:05:00 +07:00 (v1.2.0)
// Previous version: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 12:05:00 +07:00 (v1.2.0)

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrisma } from '@/lib/db'

const SAMPLE_MESSAGE_LIMIT = 50
const SAMPLE_MESSAGE_PREVIEW = 5

/**
 * Extract and save an employee's communication style profile from conversation history.
 * Sanitized for Edge Runtime compatibility.
 *
 * @param {string} employeeId - Employee.id (UUID)
 * @param {string} tenantId
 */
export async function extractAgentStyle(employeeId, tenantId) {
  const prisma = await getPrisma()
  console.log(`[styleExtractor] Extracting style for employee ${employeeId}, tenant ${tenantId}`)

  // Fetch last N staff-sent messages from this employee
  const messages = await prisma.message.findMany({
    where: {
      responderId: employeeId,
      sender: 'staff',
      conversation: { tenantId },
      content: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: SAMPLE_MESSAGE_LIMIT,
    select: { content: true, createdAt: true },
  })

  if (messages.length < 5) {
    console.log(`[styleExtractor] Not enough messages (${messages.length}) for employee ${employeeId} — skipping`)
    return null
  }

  const messageTexts = messages
    .map((m) => m.content)
    .filter(Boolean)
    .join('\n---\n')

  const prompt = `
You are analyzing the communication style of a Thai sales/service employee.
Based on the following ${messages.length} messages sent by this employee, extract their personal communication style.

Messages (from newest to oldest):
${messageTexts}

Return ONLY a valid JSON object with these exact fields:
{
  "tone": "formal" | "casual" | "friendly",
  "sentenceLength": "short" | "medium" | "long",
  "emojiUsage": "none" | "moderate" | "frequent",
  "vocabulary": ["array of 5-10 characteristic phrases, Thai words, or patterns they often use"],
  "closingPatterns": ["array of 3-5 sign-off phrases they use, e.g. ขอบคุณครับ, ดูแลด้วยนะคะ"],
  "summary": "1-2 sentence description of their style in Thai"
}

Rules:
- JSON ONLY, no markdown
`

  let styleProfile
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    styleProfile = JSON.parse(cleaned)
  } catch (error) {
    console.error('[styleExtractor] Gemini analysis error:', error)
    styleProfile = {
      tone: 'friendly',
      sentenceLength: 'medium',
      emojiUsage: 'moderate',
      vocabulary: [],
      closingPatterns: ['ขอบคุณครับ/ค่ะ'],
      summary: 'ไม่สามารถวิเคราะห์ได้ — ใช้ค่าเริ่มต้น',
    }
  }

  const sampleMessages = messages
    .slice(0, SAMPLE_MESSAGE_PREVIEW)
    .map((m) => m.content)
    .filter(Boolean)

  const agentStyle = await prisma.agentStyle.upsert({
    where: { tenantId_employeeId: { tenantId, employeeId } },
    update: {
      tone: styleProfile.tone || 'friendly',
      sentenceLength: styleProfile.sentenceLength || 'medium',
      emojiUsage: styleProfile.emojiUsage || 'moderate',
      vocabulary: styleProfile.vocabulary || [],
      closingPatterns: styleProfile.closingPatterns || [],
      sampleMessages,
      analyzedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      employeeId,
      tone: styleProfile.tone || 'friendly',
      sentenceLength: styleProfile.sentenceLength || 'medium',
      emojiUsage: styleProfile.emojiUsage || 'moderate',
      vocabulary: styleProfile.vocabulary || [],
      closingPatterns: styleProfile.closingPatterns || [],
      sampleMessages,
    },
  })

  return agentStyle
}
