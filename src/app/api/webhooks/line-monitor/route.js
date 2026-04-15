import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { fastDetectIntent, parseIntentWithAI } from '@/lib/line/intentParser'
import { replyLineMessages } from '@/lib/line/lineUtil'
import { getPrisma } from '@/lib/db'
import { createOrder } from '@/lib/repositories/orderRepo'

/**
 * Zuri LINE Group Monitor Webhook (Feature A5.3)
 * Handles automated reporting and order entry from designated LINE groups.
 */
export async function POST(req) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  // Verify HMAC-SHA256 signature using ASSISTANT secret
  const secret = process.env.LINE_ASSISTANT_CHANNEL_SECRET ?? ''
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(rawBody)
    .digest('base64')

  if (hash !== signature) {
    console.warn('[webhook/line-monitor] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  // Process async to meet < 200ms response time requirement
  processMonitorEvents(parsed.events ?? []).catch((err) =>
    console.error('[webhook/line-monitor] Async Error:', err)
  )

  return NextResponse.json({ status: 'ok' })
}

// ─── Async processing logic ──────────────────────────────────────────────────

async function processMonitorEvents(events) {
  const prisma = getPrisma()
  // Default tenant for monitoring until dynamic mapping is implemented
  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? '10000000-0000-0000-0000-000000000001'

  for (const event of events) {
    // Only handle text messages from groups or rooms
    if (event.type !== 'message' || event.message?.type !== 'text') continue
    
    const source = event.source
    const isGroup = source?.type === 'group' || source?.type === 'room'
    if (!isGroup) continue

    const text = event.message?.text ?? ''
    
    try {
      // 1. Detect Intent using Hybrid Engine (Regex + Gemini)
      const keywordMatch = fastDetectIntent(text)
      if (!keywordMatch) continue

      const aiResult = await parseIntentWithAI(text)
      
      // 2. Route Intents
      if (aiResult.intent === 'ORDER' && aiResult.data?.items?.length > 0) {
        await handleGroupOrder(DEFAULT_TENANT_ID, aiResult.data, event)
      } else if (aiResult.intent === 'REPORT') {
        await handleGroupReport(DEFAULT_TENANT_ID, aiResult.data, text, event)
      }

    } catch (err) {
      console.error('[webhook/line-monitor] Event Processing Error:', err)
    }
  }
}

/**
 * Handle ORDER intent: Create Draft POS Order
 */
async function handleGroupOrder(tenantId, orderData, event) {
  const token = process.env.LINE_ASSISTANT_CHANNEL_ACCESS_TOKEN

  try {
    const order = await createOrder({
      tenantId,
      customerId: null,
      items: orderData.items.map(item => ({
        productId: 'manual-ai',
        productName: item.name,
        qty: item.qty ?? 1,
        price: item.price ?? 0
      })),
      status: 'PENDING', // All AI orders start as DRAFT/PENDING
      source: 'LINE_GROUP'
    })

    if (token && event.replyToken) {
      await replyLineMessages(token, event.replyToken, [
        { 
          type: 'text', 
          text: `📝 บันทึกออเดอร์ (DRAFT) เรียบร้อยครับ\nรายการ: ${orderData.items.map(i => i.name).join(', ')}\nรหัสออเดอร์: ${order.orderId}` 
        }
      ])
    }
  } catch (err) {
    console.error('[handleGroupOrder] failed', err)
  }
}

/**
 * Handle REPORT intent: Digitized Manual Report
 */
async function handleGroupReport(tenantId, reportData, rawText, event) {
  const prisma = getPrisma()
  const token = process.env.LINE_ASSISTANT_CHANNEL_ACCESS_TOKEN

  try {
    await prisma.dailySalesReport.create({
      data: {
        tenantId,
        reportDate: new Date(),
        totalRevenue: reportData.totalRevenue ?? 0,
        itemsSold: reportData.items || [],
        rawText: rawText,
        processedBy: 'GEMINI_AI'
      }
    })

    if (token && event.replyToken) {
      await replyLineMessages(token, event.replyToken, [
        { 
          type: 'text', 
          text: `📊 สรุปยอดขายถูกบันทึกเข้าระบบแล้วครับ\nยอดรวม: ${reportData.totalRevenue?.toLocaleString() ?? 0} บาท\nขอบคุณสำหรับรายงานครับ!` 
        }
      ])
    }
  } catch (err) {
    console.error('[handleGroupReport] failed', err)
  }
}
