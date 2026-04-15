import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getTenantId } from '@/lib/tenant'
import { getCampaignById, updateCampaignStatus } from '@/lib/repositories/campaignRepo'

// PATCH /api/ads/optimize - Pause or resume an ad campaign
export async function PATCH(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, adId, action } = body // action: 'pause' | 'resume'

    if (!campaignId || !action) {
      return NextResponse.json({ error: 'campaignId and action are required' }, { status: 400 })
    }

    if (!['pause', 'resume'].includes(action)) {
      return NextResponse.json({ error: 'action must be pause or resume' }, { status: 400 })
    }

    // TODO: Verify campaign belongs to tenant
    const campaign = await getCampaignById({ tenantId, id: campaignId })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // TODO: Call Meta Ads API to pause/resume the ad
    // const status = action === 'pause' ? 'PAUSED' : 'ACTIVE'
    // await metaAdsClient.updateAdStatus({ adAccountId: campaign.adAccountId, adId, status })

    // TODO: Update status in DB via campaignRepo.updateCampaignStatus(...)
    await updateCampaignStatus({ tenantId, campaignId, adId, action })

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('[Ads/Optimize]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
