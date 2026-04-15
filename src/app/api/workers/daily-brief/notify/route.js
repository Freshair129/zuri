import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getDailyBriefByDate } from '@/lib/repositories/dailyBriefRepo'
import { getPrisma } from '@/lib/db'

const prisma = getPrisma()

// CTA text mapping
const ctaTextMap = {
  EDUCATE: 'ส่งข้อมูลคอร์ส',
  NURTURE: 'ส่ง content เพิ่ม',
  PUSH_TO_CLOSE: 'ส่งโปร + deadline',
  CALL_NOW: 'โทรหาด่วน!',
  UPSELL: 'แนะนำคอร์สต่อไป',
  RE_ENGAGE: 'ส่ง follow-up',
  NO_ACTION: '-',
}

/**
 * Format daily brief into LINE-friendly text message
 */
function formatBriefText(brief) {
  const date = new Date(brief.briefDate)
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

  // Format revenue with comma separator
  const revenueStr = brief.totalRevenue.toLocaleString('th-TH', {
    style: 'currency',
    currency: 'THB',
  })

  // Build top CTAs section (max 3)
  const topCtasText = (brief.topCtas || [])
    .slice(0, 3)
    .map((cta) => {
      const ctaText = ctaTextMap[cta.cta_type] || cta.cta_type
      const name = cta.name || 'Unknown'
      const tag = cta.tags?.[0] || 'N/A'
      return `• ${name} — ${tag} → ${ctaText}`
    })
    .join('\n')

  // Build ad breakdown section
  const adBreakdownText = (brief.adBreakdown || {})
    ? Object.entries(brief.adBreakdown)
        .map(([adId, count]) => {
          const shortId = adId.substring(0, 8)
          return `• Ad ${shortId}: ${count} คน`
        })
        .join('\n')
    : ''

  return `📊 Zuri Daily Brief — ${dateStr}
────────────────────────────
💬 Conversations วันนี้: ${brief.totalConversations}

👤 Contact (ใหม่): ${brief.totalContacts}
🔄 Lead (เคยทักแล้ว): ${brief.totalLeads}
⭐ Customer (ซื้อแล้ว): ${brief.totalCustomers}

✅ ปิดได้วันนี้: ${brief.closedWon} คน → ${revenueStr}
🔥 Hot (ติดตามด่วน): ${brief.hotLeads} คน
⏳ Considering: ${brief.considering} คน
❄️ Lost/Idle: ${brief.closedLost} คน

📌 Top CTA วันนี้:
${topCtasText || '(ไม่มี)'}

📣 แหล่งที่มา:
${adBreakdownText || '(ไม่มี)'}
`
}

// POST /api/workers/daily-brief/notify - QStash worker: send daily brief via LINE notification
export async function POST(request) {
  // Verify QStash signature
  const { isValid } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tenantId, date } = body

    if (!tenantId || !date) {
      return NextResponse.json({ error: 'tenantId and date are required' }, { status: 400 })
    }

    // Fetch the processed daily brief
    const brief = await getDailyBriefByDate({ tenantId, date })

    // Brief not found is not an error for async workers — just skip silently
    if (!brief) {
      return NextResponse.json({ message: 'Brief not found', tenantId, date })
    }

    // If still processing or pending, send a soft message and return
    if (brief.status === 'PENDING' || brief.status === 'PROCESSING') {
      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
      const lineUserId = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_MANAGER_USER_ID

      if (lineToken && lineUserId) {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${lineToken}`,
          },
          body: JSON.stringify({
            to: lineUserId,
            messages: [
              {
                type: 'text',
                text: `⏳ Daily Brief ยังกำลังประมวลผล (${new Date(brief.briefDate).toLocaleDateString('th-TH')})`,
              },
            ],
          }),
        })
      }

      return NextResponse.json({ message: 'Brief still processing', tenantId, date })
    }

    // Brief is READY/COMPLETED — send full message
    const briefText = formatBriefText(brief)

    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    const lineUserId = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_MANAGER_USER_ID

    if (!lineToken || !lineUserId) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN or LINE_NOTIFY_USER_ID not configured')
    }

    // Push message via LINE Messaging API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: briefText,
          },
        ],
      }),
    })

    if (!lineResponse.ok) {
      throw new Error(`LINE API error: ${lineResponse.status} ${await lineResponse.text()}`)
    }

    // Mark brief as sent
    await prisma.dailyBrief.update({
      where: { id: brief.id },
      data: { sentAt: new Date() },
    })

    return NextResponse.json({ success: true, tenantId, date })
  } catch (error) {
    console.error('[Workers/DailyBrief/Notify]', error)
    // Throw to allow QStash to retry
    throw error
  }
}
