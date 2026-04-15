/**
 * POST /api/customers/[id]/merge — merge secondary customer into this (primary)
 * Body: { secondaryId }
 * Uses prisma.$transaction — no partial merge (NFR-CRM-6)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { mergeCustomers } from '@/lib/repositories/customerRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id: primaryId } = await params
      const { secondaryId } = await request.json()

      if (!secondaryId) {
        return NextResponse.json({ error: 'secondaryId is required' }, { status: 400 })
      }
      if (primaryId === secondaryId) {
        return NextResponse.json({ error: 'Cannot merge a customer with itself' }, { status: 400 })
      }

      const merged = await mergeCustomers(tenantId, primaryId, secondaryId)

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'CUSTOMER_MERGE',
        primaryId,
        { secondaryId }
      )

      return NextResponse.json({ data: merged })
    } catch (error) {
      console.error('[Customers/Merge.POST]', error)
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'F' }  // MANAGER+ only
)
