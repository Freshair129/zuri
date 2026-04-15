/**
 * GET  /api/customers  — paginated customer list (FEAT05-CRM, NFR-CRM-1: < 500ms via Redis)
 * POST /api/customers  — create customer manually
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listCustomers, createCustomer, getKpiStats } from '@/lib/repositories/customerRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'

export const dynamic = 'force-dynamic'

// GET /api/customers?page=&limit=&search=&stage=&tags=&channel=&from=&to=&kpi=1
export const GET = withAuth(
  async (request, context) => {
    try {
      const { session } = context
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)

      const { withTenantContext } = await import('@/lib/tenantContext')
      const { listCustomers, getKpiStats } = await import('@/lib/repositories/customerRepo')

      return await withTenantContext(tenantId, async () => {
        // KPI stats shortcut
        if (searchParams.get('kpi') === '1') {
          const stats = await getKpiStats(tenantId)
          return NextResponse.json({ data: stats })
        }

        const page  = parseInt(searchParams.get('page')  ?? '1')
        const limit = parseInt(searchParams.get('limit') ?? '20')
        const search     = searchParams.get('search')     || undefined
        const stage      = searchParams.getAll('stage').filter(Boolean)
        const tags       = searchParams.getAll('tags').filter(Boolean)
        const channel    = searchParams.get('channel')    || undefined
        const from       = searchParams.get('from')       || undefined
        const to         = searchParams.get('to')         || undefined

        // M5: Security Gating (Lead Assignment Enforcement)
        let assigneeId = searchParams.get('assigneeId') || undefined
        const isAgent = session.user.role === 'STF'
        if (isAgent) {
          // Agents can ONLY see their own leads. Force filter to their ID.
          assigneeId = session.user.id
        }

        const result = await listCustomers(tenantId, {
          page, limit, search,
          stage: stage.length > 0 ? stage : undefined,
          tags:  tags.length  > 0 ? tags  : undefined,
          channel, assigneeId, from, to,
        })

        return NextResponse.json({ data: result })
      })
    } catch (error) {
      console.error('[Customers.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'R', maskPii: true }
)

// POST /api/customers — manual customer create
export const POST = withAuth(
  async (request, context) => {
    try {
      const { session } = context
      const tenantId = session.user.tenantId
      const body = await request.json()

      const { name, phone, email, lineId, facebookId, facebookName, tags, notes, assigneeId, lifecycleStage } = body

      if (!name && !facebookName && !phone && !email) {
        return NextResponse.json(
          { error: 'At least one of name, phone, or email is required' },
          { status: 400 }
        )
      }

      const { withTenantContext } = await import('@/lib/tenantContext')
      const { createCustomer } = await import('@/lib/repositories/customerRepo')
      const auditRepo = await import('@/lib/repositories/auditRepo')

      return await withTenantContext(tenantId, async () => {
        const customer = await createCustomer(tenantId, {
          name, phone, email, lineId, facebookId, facebookName,
          tags: tags ?? [],
          notes, assigneeId, lifecycleStage,
        })

        await auditRepo.create(
          tenantId,
          session.user.employeeId ?? session.user.email,
          'CUSTOMER_CREATE',
          customer.id,
          { name: customer.name ?? customer.facebookName }
        )

        return NextResponse.json({ data: customer }, { status: 201 })
      })
    } catch (error) {
      console.error('[Customers.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)
