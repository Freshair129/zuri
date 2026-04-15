import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth, normalizeRole } from '@/lib/auth'
import { getConversationById, getMessages } from '@/lib/repositories/conversationRepo'
import { getCustomerById } from '@/lib/repositories/customerRepo'
import { getTenantById } from '@/lib/repositories/tenantRepo'
import { generateFollowUpDraft } from '@/lib/ai/gemini'
import { getOrSet } from '@/lib/redis'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ai/compose-reply
 * 
 * v2 logic:
 * - Restricted to roles: SALES, MANAGER, DEV
 * - Context: 20 messages history
 * - Data enrichment: Customer Profile + Tenant Brand Tone
 * - Caching: Redis for tenant config (1hr TTL)
 */
export const POST = withAuth(async (request, session) => {
  try {
    // 1. Explicit Persona-Based Role Check
    const allowedRoles = ['SALES', 'MANAGER', 'DEV']
    const userRoles = session?.user?.roles?.map(r => normalizeRole(r)) || []
    const hasRole = userRoles.some(role => allowedRoles.includes(role))

    if (!hasRole) {
      return NextResponse.json({ error: 'Access restricted to Sales, Manager, or Dev' }, { status: 403 })
    }

    const tenantId = session.user.tenantId || await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, tone, contextExtra } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Performance start
    const startTime = Date.now()

    // 2. Fetch Base Context (Parallel)
    const [conversation, messages, tenant] = await Promise.all([
      getConversationById({ tenantId, id: conversationId }),
      getMessages(conversationId, 20), // v2: 20 messages for more context
      getOrSet(`tenant:config:${tenantId}`, () => getTenantById(tenantId), 3600) // v2: 1hr Cache
    ])

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 3. Fetch Enriched Customer Profile (for personalization)
    const customer = conversation.customerId 
      ? await getCustomerById(conversation.customerId)
      : conversation.customer

    // 4. Construct AI System Context
    const tenantName = tenant?.tenantName || 'Zuri'
    const brandTone = tenant?.config?.brandTone || 'Professional, polite, and helpful Thai sales persona'
    const catalogSummary = tenant?.config?.catalogSummary || ''
    
    const customerName = customer?.facebookName || customer?.name || 'Customer'
    const lifecycle = customer?.profile?.lifecycleStage || 'Lead'
    const purchaseSummary = customer?.insight?.summary || ''

    const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : ''

    const enhancedInsights = {
      tenantName,
      brandTone,
      catalogSummary,
      customerName,
      lifecycle,
      purchaseSummary,
      tone: tone || 'professional',
      additionalContext: contextExtra || '',
      // Provide limited history for prompt safety, but analysis used 20
      history: messages.slice(-5).map(m => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`).join('\n')
    }

    // 5. Generate AI Draft
    const draft = await generateFollowUpDraft(customerName, lastMessage, enhancedInsights)

    const duration = Date.now() - startTime
    
    // Auto-log performance
    if (duration > 2000) {
      console.warn(`[AI/ComposeReply] Performance Warning: ${duration}ms for ${tenantName}`)
    }

    return NextResponse.json({ 
      data: { 
        draft, 
        conversationId,
        metrics: { durationMs: duration }
      } 
    })
  } catch (error) {
    console.error('[AI/ComposeReply]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'inbox', action: 'R' }) // Additive check: original inbox access + role check
