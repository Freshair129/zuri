import { getTenantId } from '@/lib/tenant'
import { getTenantMarketingConfig, upsertTenantMarketingConfig } from '@/lib/repositories/marketingRepo'

/**
 * GET/PATCH /api/marketing/memory
 * Manage Business Memory (TenantMarketingConfig) for the AI engine.
 */

export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) return new Response('Unauthorized', { status: 401 })

    const config = await getTenantMarketingConfig(tenantId)
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) return new Response('Unauthorized', { status: 401 })

    const body = await request.json()
    // Validation: Ensure valid numeric values for ROAS and COGS
    const updateData = {}
    if (body.targetROAS !== undefined) updateData.targetROAS = parseFloat(body.targetROAS)
    if (body.avgCOGS !== undefined) updateData.avgCOGS = parseFloat(body.avgCOGS)
    if (body.creatureFatigueFreq !== undefined) updateData.creatureFatigueFreq = parseFloat(body.creatureFatigueFreq)
    if (body.dailyBudgetCap !== undefined) updateData.dailyBudgetCap = parseInt(body.dailyBudgetCap)
    if (body.seasonalPeaks !== undefined) updateData.seasonalPeaks = body.seasonalPeaks
    if (body.notes !== undefined) updateData.notes = body.notes

    const config = await upsertTenantMarketingConfig(tenantId, updateData)
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
