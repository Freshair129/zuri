import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { detectAssistantIntent } from '@/lib/ai/assistantIntent'
import { verifyThaiSlip } from '@/lib/ai/slipVerifier'
import { sendLinePush, getLineContent, sendLineText } from '@/lib/line/lineUtil'

export const dynamic = 'force-dynamic'

// POST: Receive events — respond 200 immediately, process async
export async function POST(req) {
  const channelSecret = process.env.LINE_BOT_CHANNEL_SECRET
  const channelToken = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN

  if (!channelSecret || !channelToken) {
    console.error('[webhook/line-bot] Missing LINE_BOT credentials')
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature')

  const hash = crypto.createHmac('SHA256', channelSecret).update(rawBody).digest('base64')
  if (hash !== signature) return NextResponse.json({ error: 'Invalid' }, { status: 401 })

  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  // NFR1: Respond immediately, process async
  processAssistantWebhook(parsed).catch((err) =>
    console.error('[webhook/line-bot] Async error', err)
  )

  return NextResponse.json({ status: 'ok' })
}

// ─── Async Processing ─────────────────────────────────────────────────────────

async function processAssistantWebhook(body) {
  const { events, destination } = body
  const { getTenantByLineOaId } = await import('@/lib/repositories/tenantRepo')
  const { recordInboundMessage, upsertLineCustomer } = await import('@/lib/repositories/conversationRepo')
  const { withTenantContext } = await import('@/lib/tenantContext')

  // M5: Resolve tenant by LINE OA ID (ADR-056)
  const tenant = destination ? await getTenantByLineOaId(destination).catch(() => null) : null
  const tenantId = tenant?.id ?? process.env.DEFAULT_TENANT_ID ?? '10000000-0000-0000-0000-000000000001'
  const token = process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN // Use central for now, migrate to tenant.lineChannelToken later

  for (const event of events) {
    if (event.type !== 'message') continue

    const userId  = event.source.userId
    const message = event.message
    const mid     = message.id

    try {
      await withTenantContext(tenantId, async () => {
        // 1. Identity Resolution
        const customer = await upsertLineCustomer(tenantId, { lineUserId: userId, displayName: null })

        // 2. Persist to Inbox
        const { conversation } = await recordInboundMessage({
          tenantId,
          customerId:     customer.id,
          conversationId: `line-${userId}`,
          channel:        'line',
          participantId:  userId,
          text:           message.type === 'text' ? message.text : `[${message.type}]`,
          externalId:     mid,
        })

        // 3. AI Assistant Hook (Branch based on agentMode)
        if (conversation.agentMode) {
          if (message.type === 'text') {
            await handleText(userId, message.text, token)
          } else if (message.type === 'image') {
            await handleImage(userId, message.id, token)
          }
        }
      })
    } catch (err) {
      console.error('[webhook/line-bot] Error processing event', err)
    }
  }
}

async function handleText(userId, text, token) {
  const result = await detectAssistantIntent(text)
  const { intent, entities } = result

  switch (intent) {
    case 'QUERY':
      // Simplified: Just echo back for now, in production this would query DB
      await sendLineText(token, userId, `🤖 รับทราบครับ คุณถามเกี่ยวกับ: ${entities.topic || text}`)
      break
    
    case 'DATA_ENTRY':
      await sendLinePush(token, userId, [
        {
          type: 'text',
          text: `📝 บันทึกข้อมูล: ${entities.item} จำนวน ${entities.qty || 1}`
        },
        createConfirmationCard('DATA_ENTRY', entities)
      ])
      break

    case 'REPORT':
      await sendLineText(token, userId, `📊 กำลังเตรียมรายงานสรุป ${entities.period || 'ล่าสุด'} ให้ครับ...`)
      break

    default:
      await sendLineText(token, userId, '🤖 สวัสดีครับ ผมคือผู้ช่วย AI ของ Zuri มีอะไรให้ช่วยไหมครับ?')
  }
}

async function handleImage(userId, messageId, token) {
  await sendLineText(token, userId, '🔍 กำลังตรวจสอบสลิปการโอนเงิน...')
  
  const buffer = await getLineContent(token, messageId)
  const base64 = buffer.toString('base64')
  
  const slipData = await verifyThaiSlip(base64)
  
  if (slipData.isVerified) {
    await sendLinePush(token, userId, [
      createConfirmationCard('SLIP_OCR', slipData)
    ])
  } else {
    await sendLineText(token, userId, '❌ ไม่พบข้อมูลสลิปการโอนเงินที่ถูกต้อง หรือสลิปไม่ชัดเจน')
  }
}

// ─── Flex Templates ──────────────────────────────────────────────────────────

function createConfirmationCard(type, data) {
  const isSlip = type === 'SLIP_OCR'
  
  return {
    type: 'flex',
    altText: isSlip ? 'ยืนยันข้อมูลสลิป' : 'ยืนยันการบันทึกข้อมูล',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: isSlip ? '✅ สลิปถูกต้อง' : '📝 บันทึกรายการ', weight: 'bold', size: 'lg', color: '#ffffff' }
        ],
        backgroundColor: isSlip ? '#06C755' : '#4B6BFB'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: isSlip ? [
              { type: 'text', text: `ผู้โอน: ${data.senderName || '-'}`, size: 'sm' },
              { type: 'text', text: `จำนวน: ${data.amount} บาท`, weight: 'bold', size: 'md' },
              { type: 'text', text: `ธนาคาร: ${data.bankName}`, size: 'xs', color: '#aaaaaa' }
            ] : [
              { type: 'text', text: `รายการ: ${data.item}`, weight: 'bold' },
              { type: 'text', text: `จำนวน: ${data.qty || 1}`, size: 'sm' }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          { type: 'button', style: 'primary', color: '#06C755', action: { type: 'postback', label: 'ยืนยัน', data: `confirm|${type}|${JSON.stringify(data)}` } },
          { type: 'button', style: 'secondary', action: { type: 'postback', label: 'ยกเลิก', data: 'cancel' } }
        ]
      }
    }
  }
}
