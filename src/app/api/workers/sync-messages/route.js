import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { verifyQStashSignature } from '@/lib/qstash'

// POST /api/workers/sync-messages - QStash worker: sync FB/LINE messages to DB
// This endpoint must be called by QStash only — signature is verified before processing.
export async function POST(request) {
  // Verify QStash signature first
  const { isValid, body: rawBody } = await verifyQStashSignature(request)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const { tenantId, channel, since } = body
    // channel: 'facebook' | 'line'

    if (!tenantId || !channel) {
      return NextResponse.json({ error: 'tenantId and channel are required' }, { status: 400 })
    }

    // TODO: Load tenant FB/LINE credentials from systemConfig
    // TODO: If channel === 'facebook':
    //   - Call FB Graph API /me/conversations or /page/messages since `since`
    //   - Upsert messages into conversations table via conversationRepo
    // TODO: If channel === 'line':
    //   - Call LINE Messaging API to fetch recent messages (webhook-driven — may differ)
    //   - Upsert messages into conversations table

    // TODO: Update last-synced timestamp for this tenant + channel

    return NextResponse.json({ success: true, tenantId, channel })
  } catch (error) {
    console.error('[Workers/SyncMessages]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
