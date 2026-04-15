// Created At: 2026-04-12 12:15:00 +07:00 (v1.2.0)
// Previous version: 2026-04-10 02:45:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 12:15:00 +07:00 (v1.2.0)

import { getPrisma } from '@/lib/db'
import { generateTaskId } from '@/lib/idGenerator'

/**
 * Automatically create follow-up tasks based on AI analysis
 * Sanitized for Edge Runtime compatibility.
 * 
 * @param {string} tenantId 
 * @param {Date} date - The brief date
 * @param {Array} analyzedConversations - Array of { conv, analysis }
 */
export async function assignCTATasks(tenantId, date, analyzedConversations) {
  const prisma = await getPrisma()
  console.log(`[ctaAssigner] Processing ${analyzedConversations.length} items for tenant ${tenantId}`)
  
  const createdTasks = []

  for (const { conv, analysis } of analyzedConversations) {
    if (!analysis) continue

    const intent = analysis.purchaseIntent || 0
    let shouldCreate = false
    let priority = 'L3'
    let title = ''
    let description = ''
    let dueHours = 24

    if (intent >= 0.8) {
      shouldCreate = true
      priority = 'L1'
      title = `🔥 [HOT] ติดตามด่วน: ${conv.customer?.name || 'ลูกค้า'}`
      description = `ลูกค้ามีความสนใจสูงมาก (${Math.round(intent * 100)}%): ${analysis.summary}\n\nCTA: ${analysis.cta}\nTags: ${analysis.tags?.join(', ')}`
      dueHours = 1
    } else if (intent >= 0.5) {
      shouldCreate = true
      priority = 'L2'
      title = `☀️ [WARM] ติดตาม: ${conv.customer?.name || 'ลูกค้า'}`
      description = `ลูกค้ามีความสนใจ (${Math.round(intent * 100)}%): ${analysis.summary}\n\nCTA: ${analysis.cta}`
      dueHours = 4
    } else if (intent < 0.3) {
      const lastMessageDate = conv.messages?.[0]?.createdAt || conv.updatedAt
      const idleDays = (new Date() - new Date(lastMessageDate)) / (1000 * 60 * 60 * 24)
      
      if (idleDays >= 7) {
        shouldCreate = true
        priority = 'L3'
        title = `❄️ [COLD] ติดตามซ้ำ: ${conv.customer?.name || 'ลูกค้า'}`
        description = `ลูกค้าไม่ได้ตอบกลับเกิน 7 วัน: ${analysis.summary}`
        dueHours = 24
      }
    }

    if (shouldCreate) {
      try {
        const taskId = await generateTaskId()
        const dueDate = new Date()
        dueDate.setHours(dueDate.getHours() + dueHours)

        const task = await prisma.task.create({
          data: {
            taskId,
            tenantId,
            customerId: conv.customer?.id,
            assigneeId: conv.customer?.assigneeId || null,
            title,
            description,
            type: 'FOLLOW_UP',
            status: 'PENDING',
            priority,
            dueDate,
          },
        })

        createdTasks.push(task)
        await notifyAgent(tenantId, task, conv)
      } catch (err) {
        console.error(`[ctaAssigner] Failed to create task for conv ${conv.id}`, err)
      }
    }
  }

  return createdTasks
}

/**
 * Send notification to the assigned agent or manager
 */
async function notifyAgent(tenantId, task, conv) {
  try {
    const prisma = await getPrisma()
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    let targetLineId = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_MANAGER_USER_ID

    if (task.assigneeId) {
      const assignee = await prisma.employee.findUnique({
        where: { id: task.assigneeId },
        select: { lineUserId: true }
      })
      if (assignee?.lineUserId) {
        targetLineId = assignee.lineUserId
      }
    }

    if (!lineToken || !targetLineId) return

    const message = `🔔 งานใหม่: ${task.title}\n📅 กำหนดส่ง: ${task.dueDate.toLocaleString('th-TH')}\n🔗 ดูข้อมูล: ${process.env.APP_URL}/crm/customers/${conv.customer?.id}`

    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: targetLineId,
        messages: [{ type: 'text', text: message }],
      }),
    })
  } catch (err) {
    console.error(`[ctaAssigner] LINE notify error`, err)
  }
}
