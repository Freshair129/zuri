import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findMany } from '@/lib/repositories/conversationRepo'
import { getOrSet, getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

/**
 * GET /api/conversations
 * Query: page, limit, status, channel
 * NFR2: < 500ms — Redis cache TTL 60s, version-busted on reply/webhook
 */
export const GET = withAuth(async (request) => {
  try {
    const tenantId = getTenantId(request)

    const { searchParams } = new URL(request.url)
    const page    = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit   = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
    const status  = searchParams.get('status')  ?? undefined  // open | closed | pending
    const channel = searchParams.get('channel') ?? undefined  // facebook | line
    const offset  = (page - 1) * limit

    // Version key allows cache-busting when a reply or webhook updates the list
    const r = getRedis()
    const version = (await r.get(`inbox:${tenantId}:version`)) ?? 0

    const cacheKey = `inbox:${tenantId}:v${version}:ch=${channel ?? 'all'}:st=${status ?? 'all'}:p=${page}:l=${limit}`

    const conversations = await getOrSet(
      cacheKey,
      () => findMany(tenantId, { channel, status, limit, offset }),
      60  // 60s TTL — satisfies NFR2 < 500ms
    )

    return NextResponse.json({ data: conversations, page, limit })
  } catch (error) {
    console.error('[Conversations.GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inbox', action: 'R' })
