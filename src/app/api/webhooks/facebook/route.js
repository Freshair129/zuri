import { NextResponse } from 'next/server'
import {
  upsertFacebookCustomer,
  upsertConversation,
  appendMessage,
} from '@/lib/repositories/conversationRepo'
import { getTenantByFbPageId } from '@/lib/repositories/tenantRepo'
import { triggerEvent } from '@/lib/pusher'
import { getRedis } from '@/lib/redis'

/**
 * Facebook Messenger Webhook
 * NFR1: respond 200 immediately — process async (< 200ms)
 * G-WH-01: Return 200 before processing
 * G-WH-02: upsert, never find+create
 * G-META-01: use .includes() on action_type
 */

// GET: Webhook verification (hub.challenge)
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST: Receive messages — respond 200 immediately, process async
export async function POST(req) {
  // NFR1: parse body then respond 200 immediately
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  // Kick off async processing — do NOT await (NFR1: < 200ms)
  processWebhook(body).catch((err) => console.error('[webhook/facebook]', err))

  return NextResponse.json({ status: 'ok' })
}

// ─── Async Processing ─────────────────────────────────────────────────────────

async function processWebhook(body) {
  if (body.object !== 'page') return

  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? '10000000-0000-0000-0000-000000000001'
  const { recordInboundMessage, upsertFacebookCustomer } = await import('@/lib/repositories/conversationRepo')
  const { withTenantContext } = await import('@/lib/tenantContext')

  for (const entry of (body.entry ?? [])) {
    // M5: Resolve tenant by Facebook Page ID (ADR-056)
    const fbPageId = entry.id
    const tenant = fbPageId ? await getTenantByFbPageId(fbPageId).catch(() => null) : null
    const tenantId = tenant?.id ?? DEFAULT_TENANT_ID

    for (const event of (entry.messaging ?? [])) {
      // Skip delivery / read receipts — only process real messages
      if (!event.message || event.message.is_echo) continue

      const psid = event.sender?.id
      const text = event.message?.text ?? null
      const mid  = event.message?.mid

      if (!psid) continue

      try {
        await withTenantContext(tenantId, async () => {
          // 1. Upsert customer
          const customer = await upsertFacebookCustomer(tenantId, { psid, name: null })

          // 2. Process inbound message (Standardized)
          await recordInboundMessage({
            tenantId,
            customerId:     customer.id,
            conversationId: `fb-${psid}`,
            channel:        'facebook',
            participantId:  psid,
            text,
            externalId:     mid,
          })
        })
      } catch (err) {
        console.error('[webhook/facebook] processEvent error', err)
      }
    }
  }
}
