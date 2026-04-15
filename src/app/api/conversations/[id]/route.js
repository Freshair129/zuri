import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getConversationById, getMessages } from '@/lib/repositories/conversationRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations/[id]
 * Returns conversation + last 50 messages + customer profile
 */
export const GET = withAuth(async (request, { params }) => {
  try {
    const tenantId = getTenantId(request)
    const { id } = await params

    const conversation = await getConversationById({ tenantId, id })
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const messages = await getMessages(id, 50)

    return NextResponse.json({
      data: {
        ...conversation,
        messages,
      },
    })
  } catch (error) {
    console.error('[Conversations.GET_BY_ID]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inbox', action: 'R' })
