import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getConversationById, appendMessage } from '@/lib/repositories/conversationRepo'
import { triggerEvent } from '@/lib/pusher'
import { getRedis } from '@/lib/redis'
import { getQStash } from '@/lib/qstash'

export const dynamic = 'force-dynamic'

/**
 * POST /api/conversations/[id]/reply
 * 1. Persist message to DB immediately
 * 2. Trigger Pusher real-time event
 * 3. Enqueue QStash job to send via FB/LINE (module CLAUDE.md: ส่งผ่าน worker)
 *
 * Body: { message: string }
 */
export const POST = withAuth(async (request, context) => {
  try {
    const { session } = context
    const tenantId = session.user.tenantId
    const { id } = await context.params
    const body = await request.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const { withTenantContext } = await import('@/lib/tenantContext')
    const { getConversationById, appendMessage } = await import('@/lib/repositories/conversationRepo')

    return await withTenantContext(tenantId, async () => {
      // Fetch conversation (isolated)
      const conversation = await getConversationById({ tenantId, id })
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      // 1. Persist outbound message to DB (isolated)
      const saved = await appendMessage({
        conversationId: id,
        message:        message.trim(),
        direction:      'outbound',
        responderId:    session.user.id,
      })

      // 2. Pusher real-time (fire and forget)
      const { triggerEvent } = await import('@/lib/pusher')
      triggerEvent(`tenant-${tenantId}`, 'new-message', {
        conversationId: id,
        message: {
          id:        saved.id,
          sender:    'staff',
          content:   saved.content,
          createdAt: saved.createdAt,
        },
      }).catch((err) => console.error('[Reply.pusher]', err))

      // 3. Enqueue QStash worker to actually send via platform Message API
      const { getQStash } = await import('@/lib/qstash')
      const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/send-message`
      getQStash().publishJSON({
        url: workerUrl,
        body: {
          tenantId,
          channel:       conversation.channel,
          participantId: conversation.participantId,
          message:       message.trim(),
        },
        retries: 5,
      }).catch((err) => console.error('[Reply.qstash]', err))

      // 4. Invalidate List Cache
      const { getRedis } = await import('@/lib/redis')
      getRedis().incr(`inbox:${tenantId}:version`).catch(() => null)

      return NextResponse.json({ success: true, messageId: saved.id })
    })
  } catch (error) {
    console.error('[Conversations/Reply]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inbox', action: 'F' })
