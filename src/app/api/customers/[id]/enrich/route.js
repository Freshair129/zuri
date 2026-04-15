import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { getQStash } from '@/lib/qstash'
import { getSession } from '@/lib/auth'

/**
 * POST /api/customers/[id]/enrich
 * Manually trigger AI enrichment via QStash
 */
export async function POST(request, { params }) {
  try {
    const tenantId = await getTenantId(request)
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: customerId } = await params

    // Enqueue the enrichment job in QStash
    const qstash = getQStash()
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/crm-enrich`,
      body: {
        tenantId,
        customerId,
      },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Enrichment job enqueued successfully' 
    })
  } catch (error) {
    console.error('[CRM/Enrich]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
