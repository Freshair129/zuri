// Created At: 2026-04-12 12:20:00 +07:00 (v1.2.0)
// Previous version: 2026-04-10 03:52:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 12:20:00 +07:00 (v1.2.0)
// Task: ZDEV-TSK-20260410-012 | Plan: ZDEV-IMP-2638

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrisma } from '@/lib/db'
import { getOrSet } from '@/lib/redis'

// Escalation trigger keywords (Thai + English)
const ESCALATION_KEYWORDS = [
  'พูดกับคน',
  'ขอคุยกับพนักงาน',
  'ขอคุยกับคน',
  'ขอพนักงาน',
  'manager',
  'หัวหน้า',
  'ผู้จัดการ',
  'ต้องการคน',
  'speak to human',
  'talk to agent',
]

const CONTEXT_MESSAGE_LIMIT = 20
const LOOP_DETECTION_LIMIT = 10
const LOOP_REPEAT_THRESHOLD = 3

/**
 * Main entrypoint for Agent Mode auto-reply processing.
 * Sanitized for Edge Runtime compatibility.
 */
export async function processAgentReply(conversationId, incomingMessage, tenantId) {
  const prisma = await getPrisma()
  
  // Fetch conversation with agentMode + assignee info
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      conversationId: true,
      agentMode: true,
      agentTurnCount: true,
      assigneeId: true,
      tenantId: true,
    },
  })

  if (!conversation || !conversation.agentMode) {
    return null // Not in agent mode — nothing to do
  }

  // Fetch recent messages for context + escalation checks
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: CONTEXT_MESSAGE_LIMIT,
    select: { sender: true, content: true, createdAt: true },
  })
  const contextMessages = [...recentMessages].reverse() // chronological

  // ─── Step 1: Escalation Check ────────────────────────────────────────────
  const escalationResult = checkEscalation(incomingMessage, contextMessages, conversationId)
  if (escalationResult.escalate) {
    await handleEscalation(conversation, tenantId, escalationResult.reason)
    return { reply: null, escalated: true, reason: escalationResult.reason, agentTurnCount: conversation.agentTurnCount }
  }

  // ─── Step 2: Fetch Agent Style Profile ───────────────────────────────────
  let agentStyle = null
  if (conversation.assigneeId) {
    agentStyle = await prisma.agentStyle.findUnique({
      where: { tenantId_employeeId: { tenantId, employeeId: conversation.assigneeId } },
    })
  }

  // ─── Step 3: Fetch Product Catalog Summary (Redis cached) ────────────────
  const catalogSummary = await getOrSet(
    `catalog:summary:${tenantId}`,
    async () => {
      const p = await getPrisma()
      const products = await p.product.findMany({
        where: { tenantId, isActive: true },
        select: { name: true, basePrice: true, description: true, category: true },
        take: 20,
        orderBy: { category: 'asc' },
      })
      return products
        .map((pr) => `- ${pr.name} (${pr.category}): ${pr.basePrice?.toLocaleString('th-TH')} บาท${pr.description ? ` — ${pr.description.substring(0, 80)}` : ''}`)
        .join('\n')
    },
    3600 // 1 hour TTL
  )

  // ─── Step 4: Build Style Context for Prompt ──────────────────────────────
  const styleContext = agentStyle
    ? `
Style Profile (match this exactly):
- Tone: ${agentStyle.tone} (${agentStyle.tone === 'formal' ? 'สุภาพเป็นทางการ' : agentStyle.tone === 'casual' ? 'ลำลอง เป็นกันเอง' : 'เป็นมิตร อบอุ่น'})
- Sentence Length: ${agentStyle.sentenceLength} (${agentStyle.sentenceLength === 'short' ? 'กระชับ สั้น' : agentStyle.sentenceLength === 'long' ? 'ละเอียด ยาว' : 'ความยาวปานกลาง'})
- Emoji Usage: ${agentStyle.emojiUsage} (${agentStyle.emojiUsage === 'none' ? 'ไม่ใช้ emoji' : agentStyle.emojiUsage === 'frequent' ? 'ใช้ emoji บ่อย' : 'ใช้ emoji เป็นครั้งคราว'})
- Characteristic phrases: ${(agentStyle.vocabulary || []).join(', ') || 'ไม่มี'}
- Closing patterns: ${(agentStyle.closingPatterns || []).join(', ') || 'ขอบคุณครับ/ค่ะ'}
`
    : `Style Profile: ไม่มีข้อมูล — ใช้โทนเป็นมิตร สุภาพ พูดภาษาไทย`

  // ─── Step 5: Generate AI Reply ───────────────────────────────────────────
  const conversationHistory = contextMessages
    .slice(-10) // last 10 messages for context
    .map((m) => `${m.sender === 'customer' ? 'ลูกค้า' : 'พนักงาน'}: ${m.content}`)
    .join('\n')

  const prompt = `
คุณคือ AI ที่ทำหน้าที่แทนพนักงานขายในการตอบลูกค้า คุณจะต้องตอบในสไตล์เดียวกับพนักงานคนนี้โดยเคร่งครัด

${styleContext}

สินค้า/บริการที่มี:
${catalogSummary || 'ไม่มีข้อมูลสินค้า'}

ประวัติการสนทนาล่าสุด:
${conversationHistory}

ลูกค้าเพิ่งส่งข้อความ: "${incomingMessage}"

กรุณาตอบในฐานะพนักงาน โดย:
1. ตอบตรงประเด็นที่ลูกค้าถาม
2. ใช้สไตล์การเขียนตาม Style Profile อย่างเคร่งครัด
3. หากลูกค้าถามราคาหรือรายละเอียดสินค้า ให้ตอบจากข้อมูลสินค้าที่มี
4. ไม่ต้องแนะนำตัวว่าเป็น AI
5. ตอบสั้นกระชับ เป็นธรรมชาติ

ตอบเป็นข้อความเดียวเท่านั้น ไม่มี label หรือ prefix
`

  let reply
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    reply = result.response.text().trim()
  } catch (error) {
    console.error('[agentMode] Gemini generation error:', error)
    return null
  }

  // ─── Step 6: Save AI Message to DB ───────────────────────────────────────
  try {
    const messageId = `MSG-AI-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    await prisma.$transaction([
      // Save as a staff message (AI acting as staff)
      prisma.message.create({
        data: {
          messageId,
          conversationId,
          sender: 'staff',
          content: reply,
          responderId: 'AI', // Special marker
          attachments: null,
        },
      }),
      // Audit trail in ConversationLog
      prisma.conversationLog.create({
        data: {
          tenantId,
          conversationId,
          sender: 'AI',
          content: reply,
          metadata: {
            agentStyleId: agentStyle?.id || null,
            agentTurnCount: conversation.agentTurnCount + 1,
            modelVersion: 'gemini-2.0-flash',
          },
        },
      }),
      // Increment turn counter
      prisma.conversation.update({
        where: { id: conversationId },
        data: { agentTurnCount: { increment: 1 } },
      }),
    ])

    console.log(`[agentMode] AI reply sent for conversation ${conversationId} (turn #${conversation.agentTurnCount + 1})`)
  } catch (error) {
    console.error('[agentMode] DB save error:', error)
    return null
  }

  return {
    reply,
    escalated: false,
    agentTurnCount: conversation.agentTurnCount + 1,
  }
}

/**
 * Check escalation conditions BEFORE generating a reply.
 */
export function checkEscalation(incomingMessage, contextMessages, conversationId) {
  const msgLower = (incomingMessage || '').toLowerCase()

  for (const keyword of ESCALATION_KEYWORDS) {
    if (msgLower.includes(keyword.toLowerCase())) {
      console.log(`[agentMode] Escalation: keyword "${keyword}" detected in conv ${conversationId}`)
      return { escalate: true, reason: `keyword:${keyword}` }
    }
  }

  const customerMessages = contextMessages
    .filter((m) => m.sender === 'customer')
    .slice(-LOOP_DETECTION_LIMIT)
    .map((m) => (m.content || '').trim().toLowerCase())

  const messageCounts = {}
  for (const msg of customerMessages) {
    if (!msg) continue
    messageCounts[msg] = (messageCounts[msg] || 0) + 1
    if (messageCounts[msg] >= LOOP_REPEAT_THRESHOLD) {
      console.log(`[agentMode] Escalation: loop detected in conv ${conversationId}`)
      return { escalate: true, reason: 'loop_detected' }
    }
  }

  return { escalate: false }
}

/**
 * Execute escalation: turn off Agent Mode and notify human agent.
 */
async function handleEscalation(conversation, tenantId, reason) {
  console.log(`[agentMode] Handling escalation for conv ${conversation.id}: ${reason}`)
  const prisma = await getPrisma()

  try {
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { agentMode: false },
      }),
      prisma.conversationLog.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          sender: 'AI',
          content: '[Agent Mode Escalated]',
          metadata: { escalationReason: reason, action: 'ESCALATE' },
        },
      }),
    ])

    // Notify via Pusher (fire-and-forget)
    notifyEscalation(tenantId, conversation, reason).catch((e) =>
      console.error('[agentMode] Pusher notify error:', e)
    )

    // Notify assigned agent via LINE (fire-and-forget)
    if (conversation.assigneeId) {
      notifyAgentViaLine(conversation, reason).catch((e) =>
        console.error('[agentMode] LINE notify error:', e)
      )
    }
  } catch (error) {
    console.error('[agentMode] Escalation DB error:', error)
  }
}

async function notifyEscalation(tenantId, conversation, reason) {
  if (!process.env.PUSHER_APP_ID) return

  const { default: Pusher } = await import('pusher')
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    useTLS: true,
  })

  await pusher.trigger(`tenant-${tenantId}`, 'agent-mode-escalated', {
    conversationId: conversation.id,
    reason,
    message: 'ลูกค้าต้องการคุยกับพนักงาน — Agent Mode ถูกปิดอัตโนมัติ',
  })
}

async function notifyAgentViaLine(conversation, reason) {
  const prisma = await getPrisma()
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!lineToken || !conversation.assigneeId) return

  const assignee = await prisma.employee.findUnique({
    where: { id: conversation.assigneeId },
    select: { lineUserId: true, firstName: true },
  })

  if (!assignee?.lineUserId) return

  const reasonMsg =
    reason === 'loop_detected'
      ? 'ลูกค้าถามคำเดิมซ้ำหลายครั้ง'
      : `ลูกค้าขอคุยกับพนักงาน (${reason.replace('keyword:', '')})`

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: assignee.lineUserId,
      messages: [
        {
          type: 'text',
          text: `🚨 Agent Mode Escalated\n\n${reasonMsg}\n\nกรุณาเข้าไปดูแลลูกค้าโดยตรงที่ Inbox\n🔗 ${process.env.APP_URL}/inbox/${conversation.conversationId}`,
        },
      ],
    }),
  })
}
