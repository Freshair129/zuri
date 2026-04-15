import { NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getTenantTokens } from '@/lib/repositories/tenantRepo'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/workers/send-message
 * QStash worker — sends an outbound message via FB Messenger or LINE
 *
 * Payload: { tenantId, channel, participantId, message }
 *
 * Tokens are read per-tenant from DB (tenant.fbPageToken / tenant.lineChannelToken)
 * Falls back to env vars for single-tenant dev.
 */
export async function POST(req) {
  const { isValid, body } = await verifyQStashSignature(req)
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId, channel, participantId, message } = JSON.parse(body)

  // Load tenant tokens from DB — falls back to env vars if not set per-tenant
  const { fbPageToken: fbToken, lineChannelToken: lineToken } = await getTenantTokens(tenantId)

  try {
    if (channel === 'facebook') {
      const { sendFacebookText } = await import('@/lib/facebook/facebookUtil')
      await sendFacebookText(fbToken, participantId, message)
    } else if (channel === 'line') {
      const { sendLineText } = await import('@/lib/line/lineUtil')
      await sendLineText(lineToken, participantId, message)
    } else {
      console.error('[workers/send-message] Unknown channel:', channel)
    }
  } catch (err) {
    // throw → QStash retries (NFR3: >= 5 retries)
    console.error('[workers/send-message]', err)
    throw err
  }

  return NextResponse.json({ ok: true })
}
