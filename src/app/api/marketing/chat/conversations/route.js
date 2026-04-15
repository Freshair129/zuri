import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getConversations } from '@/lib/repositories/conversationRepo'

export const dynamic = 'force-dynamic'

// GET /api/marketing/chat/conversations - List conversations filtered by dbId and customerId
export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dbId = searchParams.get('dbId')
    const customerId = searchParams.get('customerId')

    if (!dbId) {
      return NextResponse.json({ error: 'dbId is required' }, { status: 400 })
    }

    // TODO: Call conversationRepo.getConversations({ tenantId, dbId, customerId })
    const conversations = await getConversations({ tenantId, dbId, customerId })

    return NextResponse.json({ data: conversations })
  } catch (error) {
    console.error('[Marketing/Chat/Conversations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
