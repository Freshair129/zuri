/**
 * FlowAccount OAuth 2.0 callback
 * GET /api/integrations/flowaccount/callback?code=...&state=...
 *
 * Exchanges authorization code for tokens, encrypts, stores in DB.
 */
import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { getPrisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'

const FA_TOKEN_URL = 'https://auth.flowaccount.com/connect/token'
const prisma = getPrisma()

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=missing_params`
      )
    }

    // Validate state → get tenantId
    const redis = getRedis()
    const tenantId = await redis.get(`fa:oauth:state:${state}`)
    if (!tenantId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=invalid_state`
      )
    }
    await redis.del(`fa:oauth:state:${state}`)

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/flowaccount/callback`
    const res = await fetch(FA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.FLOWACCOUNT_CLIENT_ID,
        client_secret: process.env.FLOWACCOUNT_CLIENT_SECRET,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[FlowAccount/callback] Token exchange failed', err)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=token_exchange_failed`
      )
    }

    const tokens = await res.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Upsert IntegrationConfig
    await prisma.integrationConfig.upsert({
      where: {
        tenantId_provider: { tenantId: String(tenantId), provider: 'flowaccount' },
      },
      update: {
        oauthAccessTokenEnc: encrypt(tokens.access_token),
        oauthRefreshTokenEnc: encrypt(tokens.refresh_token),
        oauthExpiresAt: expiresAt,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        tenantId: String(tenantId),
        provider: 'flowaccount',
        oauthAccessTokenEnc: encrypt(tokens.access_token),
        oauthRefreshTokenEnc: encrypt(tokens.refresh_token),
        oauthExpiresAt: expiresAt,
        syncMode: 'daily',
        syncOptionsJson: {},
        accountMappingJson: {},
        isActive: true,
      },
    })

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=flowaccount_connected`
    )
  } catch (error) {
    console.error('[FlowAccount/callback]', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=internal_error`
    )
  }
}
