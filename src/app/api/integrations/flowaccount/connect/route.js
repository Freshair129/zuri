/**
 * FlowAccount OAuth 2.0 PKCE — initiate connect
 * GET /api/integrations/flowaccount/connect
 *
 * Redirects user to FlowAccount authorization endpoint.
 * Requires FLOWACCOUNT_CLIENT_ID env var.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRedis } from '@/lib/redis'
import { randomBytes } from 'crypto'

const FA_AUTH_URL = 'https://auth.flowaccount.com/connect/authorize'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['OWNER', 'DEV'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.FLOWACCOUNT_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'FLOWACCOUNT_CLIENT_ID not configured' },
        { status: 500 }
      )
    }

    // Generate state (CSRF protection)
    const state = randomBytes(16).toString('hex')
    const redis = getRedis()
    // Store state bound to tenantId — 10 min TTL
    await redis.set(
      `fa:oauth:state:${state}`,
      session.user.tenantId,
      { ex: 600 }
    )

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/flowaccount/callback`
    const scope = 'openid profile email offline_access flowaccount:read flowaccount:write'

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    })

    return NextResponse.redirect(`${FA_AUTH_URL}?${params}`)
  } catch (error) {
    console.error('[FlowAccount/connect]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
