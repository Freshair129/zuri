// Created At: 2026-04-12 06:20:00 +07:00 (v1.3.26)
// Previous version: 2026-04-11 20:37:43 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 06:20:00 +07:00 (v1.3.26)

/**
 * salesCloser — AI Sales Closer Engine
 * M4 Feature A3 (ZDEV-TSK-20260410-013)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrisma } from '@/lib/db'
import { getOrSet } from '@/lib/redis'
import { getPlaybook, detectObjections } from '@/lib/ai/objectionPlaybook'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// ─── Threshold ─────────────────────────────────────────────────────────────────
const HIGH_VALUE_THRESHOLD = 5000 

// ─── Context Fetching ──────────────────────────────────────────────────────────
async function fetchTenantConfig(tenantId) {
  const prisma = await getPrisma()
  return getOrSet(`tenant:config:${tenantId}`, async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantName: true, config: true },
    })
    return tenant
  }, 3600)
}

async function fetchProductCatalog(tenantId) {
  const prisma = await getPrisma()
  return getOrSet(`catalog:${tenantId}:summary`, async () => {
    const products = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { name: true, basePrice: true, posPrice: true, category: true, description: true },
      take: 30,
      orderBy: { category: 'asc' },
    })
    return products
  }, 1800)
}

async function fetchConversationContext(conversationId) {
  const prisma = await getPrisma()
  const conversation = await prisma.conversation.findFirst({
    where: { conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { sender: true, content: true, createdAt: true },
      },
      customer: {
        select: {
          name: true,
          facebookName: true,
          lifecycleStage: true,
          orders: {
            take: 3,
            select: { totalAmount: true, status: true, date: true },
            orderBy: { date: 'desc' },
          },
          insight: {
            select: { interests: true, objections: true, summary: true },
          },
        },
      },
    },
  })
  return conversation
}

// ─── Core Closer Function ──────────────────────────────────────────────────────
export async function closeSale(tenantId, conversationId, customerMessage) {
  try {
    const [tenantConfig, catalog, conversation, playbook] = await Promise.all([
      fetchTenantConfig(tenantId),
      fetchProductCatalog(tenantId),
      fetchConversationContext(conversationId),
      getPlaybook(tenantId),
    ])

    const matchedObjections = detectObjections(customerMessage, playbook)

    const msgHistory = (conversation?.messages || [])
      .reverse()
      .map((m) => `${m.sender === 'customer' ? 'ลูกค้า' : 'พนักงาน'}: ${m.content}`)
      .join('\n')

    const catalogSummary = catalog
      .map((p) => `- ${p.name} (${p.category}): ฿${p.posPrice ?? p.basePrice}`)
      .join('\n')

    const objectionContext = matchedObjections.length > 0
      ? matchedObjections
          .map((o) => `• Objection "${o.id}": ${o.thaiResponse}`)
          .join('\n')
      : 'ไม่พบ objection ที่ชัดเจน'

    const customer = conversation?.customer
    const customerCtx = customer
      ? `ชื่อลูกค้า: ${customer.name || customer.facebookName || 'ไม่ทราบ'}
Lifecycle: ${customer.lifecycleStage || 'NEW'}
ความสนใจ: ${customer.insight?.interests?.join(', ') || 'ไม่ระบุ'}
Objections เดิม: ${customer.insight?.objections?.join(', ') || 'ไม่มี'}
สรุป: ${customer.insight?.summary || 'ไม่มีข้อมูล'}`
      : 'ไม่มีข้อมูลลูกค้า'

    const prompt = `
คุณคือ AI Sales Closer ผู้ช่วยขายมืออาชีพของ "${tenantConfig?.tenantName || 'Zuri School'}"
พูดภาษาไทยที่สุภาพและเป็นมิตร ใช้ครับ/ค่ะ ตลอด

## บทบาทของคุณ
- ตอบคำถามเกี่ยวกับคอร์สและราคาจากแค็ตตาล็อก
- จัดการ objection ของลูกค้าด้วยความเห็นใจและข้อมูลที่มีประโยชน์
- ปิดการขายด้วยการเสนอ Payment Link หรือสร้าง Order เมื่อลูกค้าพร้อม

## แค็ตตาล็อกสินค้า/คอร์ส
${catalogSummary}

## ข้อมูลลูกค้า
${customerCtx}

## ประวัติการสนทนา (ล่าสุด 20 ข้อความ)
${msgHistory}

## Objections ที่ตรวจพบในข้อความนี้ (ใช้เป็น reference)
${objectionContext}

## ข้อความล่าสุดของลูกค้า
"${customerMessage}"

## คำสั่ง
วิเคราะห์ข้อความและตอบกลับในรูปแบบ JSON เท่านั้น:
{
  "reply": "ข้อความตอบกลับภาษาไทย (2-4 ประโยค กระชับ)",
  "action": "REPLY | CREATE_ORDER | SEND_PAYMENT_LINK | ESCALATE",
  "reasoning": "เหตุผลที่เลือก action นี้ (ภาษาไทย)",
  "orderDraft": null,
  "productName": null,
  "estimatedAmount": null
}

กฎ:
- ถ้าลูกค้าพร้อมซื้อและบอกชื่อคอร์สชัดเจน → action: "CREATE_ORDER", ระบุ productName และ estimatedAmount
- ถ้าต้องการส่ง Payment Link → action: "SEND_PAYMENT_LINK"
- ถ้ามีปัญหาซับซ้อนที่ AI ไม่สามารถจัดการได้ → action: "ESCALATE"
- กรณีอื่น → action: "REPLY"
- Response ต้องเป็น JSON เท่านั้น ห้ามมี markdown หรือข้อความเพิ่มเติม
`

    const result = await model.generateContent(prompt)
    const rawText = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(rawText)

    let orderDraft = null
    if (parsed.action === 'CREATE_ORDER' && parsed.productName) {
      const product = catalog.find((p) =>
        p.name.toLowerCase().includes(parsed.productName.toLowerCase())
      )
      if (product) {
        orderDraft = {
          productName: product.name,
          category: product.category,
          unitPrice: product.posPrice ?? product.basePrice,
          qty: 1,
          estimatedTotal: product.posPrice ?? product.basePrice,
        }
      }
    }

    return {
      reply: parsed.reply,
      action: parsed.action || 'REPLY',
      reasoning: parsed.reasoning,
      orderDraft,
      objectionsMatched: matchedObjections.map((o) => o.id),
      HIGH_VALUE_THRESHOLD,
    }
  } catch (err) {
    console.error('[salesCloser] closeSale', err)
    return {
      reply: 'ขออภัยค่ะ เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่หรือติดต่อพนักงานโดยตรงนะคะ',
      action: 'ESCALATE',
      reasoning: 'AI error — fallback to human',
      orderDraft: null,
      objectionsMatched: [],
    }
  }
}
