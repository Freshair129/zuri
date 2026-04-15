import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as marketingRepo from '@/lib/repositories/marketingRepo'

/**
 * GET /api/marketing/campaigns
 *   ?range=30d          — date range
 *   ?status=ACTIVE      — filter by campaign status
 *   ?drill=adsets&campaign_id=xxx   — drill into AdSets for a campaign
 *   ?drill=ads&adset_id=xxx         — drill into Ads for an AdSet
 *   ?type=timeseries    — daily time series data
 *   ?type=placement     — placement breakdown
 *   ?type=heatmap       — hourly heatmap (24×7)
 */
export const GET = withAuth(
  async (req, { session }) => {
    try {
      const { searchParams } = new URL(req.url)
      const tenantId  = session.user.tenantId
      const range     = searchParams.get('range')  || '30d'
      const type      = searchParams.get('type')
      const drill     = searchParams.get('drill')
      const status    = searchParams.get('status') || undefined

      // ── Special dataset requests ──────────────────────────────────
      if (type === 'timeseries') {
        const data = await marketingRepo.getTimeSeries(tenantId, range)
        return NextResponse.json(data)
      }
      if (type === 'placement') {
        const data = await marketingRepo.getPlacementBreakdown(tenantId, range)
        return NextResponse.json(data)
      }
      if (type === 'heatmap') {
        const data = await marketingRepo.getHourlyHeatmap(tenantId, range)
        return NextResponse.json(data)
      }

      // ── Drill-down requests ───────────────────────────────────────
      if (drill === 'adsets') {
        const campaignId = searchParams.get('campaign_id')
        if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
        const data = await marketingRepo.getAdSetsForCampaign(tenantId, campaignId, range)
        return NextResponse.json(data)
      }
      if (drill === 'ads') {
        const adSetId = searchParams.get('adset_id')
        if (!adSetId) return NextResponse.json({ error: 'adset_id required' }, { status: 400 })
        const data = await marketingRepo.getAdsForAdSet(tenantId, adSetId, range)
        return NextResponse.json(data)
      }

      // ── Default: campaign list ────────────────────────────────────
      const data = await marketingRepo.getCampaigns(tenantId, { range, status })
      return NextResponse.json(data)
    } catch (error) {
      console.error('[marketing/campaigns]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'marketing', action: 'R' }
)
