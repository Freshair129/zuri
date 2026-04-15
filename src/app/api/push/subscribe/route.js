import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { upsertSubscription } from '@/lib/repositories/pushRepo'

// POST /api/push/subscribe - Save web push subscription for the current user
export const POST = withAuth(async (request, { session }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { subscription } = body
    // subscription example: { endpoint: '...', keys: { p256dh: '...', auth: '...' } }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Valid push subscription (endpoint, p256dh, auth) is required' }, { status: 400 })
    }

    await upsertSubscription(tenantId, userId, subscription)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push/Subscribe]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}) // No specific domain needed beyond general AUTH for personal subscription
