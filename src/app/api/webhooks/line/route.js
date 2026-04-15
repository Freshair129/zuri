import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  upsertLineCustomer,
  upsertConversation,
  appendMessage,
} from '@/lib/repositories/conversationRepo'
import { getTenantByLineOaId, getTenantTokens } from '@/lib/repositories/tenantRepo'
import { triggerEvent } from '@/lib/pusher'
import { getRedis } from '@/lib/redis'
import { fastDetectIntent, parseIntentWithAI } from '@/lib/line/intentParser'
import { replyLineMessages } from '@/lib/line/lineUtil'
import { getPrisma } from '@/lib/db'
import { createOrder } from '@/lib/repositories/orderRepo'

/**
 * LINE OA Webhook
 * NFR1: respond 200 immediately — process async (< 200ms)
 * G-WH-02: upsert pattern
 * M5: Multi-tenant routing via `destination` → lineOaId (ADR-056)
 */
export async function POST(req) {
  const rawBody   = await req.text()
  const signature = req.headers.get('x-line-signature')

  // M5: Parse destination first to resolve per-tenant channel secret
  let parsed
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ status: 'ok' })
  }

  // Resolve tenant by LINE destination (OA User ID)
  const destination = parsed.destination ?? null
  const tenant = destination ? await getTenantByLineOaId(destination).catch(() => null) : null

  // Use per-tenant secret; fall back to env var for backward compat
  let channelSecret = process.env.LINE_CHANNEL_SECRET ?? ''
  if (tenant) {
    try {
      const tokens = await getTenantTokens(tenant.id)
      if (tokens.lineChannelSecret) channelSecret = tokens.lineChannelSecret
    } catch {
      // keep env var fallback
    }
  }

  // Verify HMAC-SHA256 signature with resolved secret
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(rawBody)
    .digest('base64')

  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Kick off async — do NOT await (NFR1: < 200ms)
  processWebhook(parsed.events ?? [], tenant?.id ?? null).catch((err) =>
    console.error('[webhook/line]', err)
  )

  return NextResponse.json({ status: 'ok' })
}

// ─── Async Processing ─────────────────────────────────────────────────────────

async function processWebhook(events, resolvedTenantId) {
  const prisma = getPrisma()
  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? '10000000-0000-0000-0000-000000000001'

  // M5: tenantId resolved upstream by destination → lineOaId mapping (ADR-056)
  const tenantId = resolvedTenantId ?? DEFAULT_TENANT_ID

  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const source = event.source
    const isGroup = source?.type === 'group' || source?.type === 'room'
    const groupId = isGroup ? (source.groupId || source.roomId) : null
    const lineUserId = source?.userId
    const text = event.message?.text ?? ''
    const messageId = event.message?.id
    const replyToken = event.replyToken

    if (!lineUserId && !groupId) continue

    try {
      // 2. Standard Logging (Threaded for groups)
      const conversationId = isGroup ? `line-group-${groupId}` : `line-${lineUserId}`
      
      const customer = lineUserId ? await upsertLineCustomer(tenantId, {
        lineUserId,
        displayName: null, 
      }) : null

      const conversation = await upsertConversation(tenantId, conversationId, {
        channel: 'line',
        participantId: groupId || lineUserId,
        customerId: customer?.id ?? null,
        status: 'open',
      })

      const saved = await appendMessage({
        conversationId: conversation.id,
        message: text,
        direction: 'inbound',
        externalMessageId: messageId ?? undefined,
      })

      // Pusher & Cache sync
      await triggerEvent(`tenant-${tenantId}`, 'new-message', {
        conversationId: conversation.id,
        message: { id: saved.id, sender: 'customer', content: saved.content, createdAt: saved.createdAt }
      })
      await getRedis().incr(`inbox:${tenantId}:version`)

    } catch (err) {
      console.error('[webhook/line] processEvent error', err)
    }
  }
}
