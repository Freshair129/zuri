/**
 * PATCH /api/customers/[id]/stage — lifecycle stage transition
 * Atomically updates stage + writes CustomerStageHistory (NFR5: prisma.$transaction)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { transitionStage } from '@/lib/repositories/customerRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'
import { triggerEvent as triggerPusher } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

const VALID_STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'ENROLLED', 'PAID', 'LOST']

export const PATCH = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const { stage, note } = await request.json()

      if (!stage || !VALID_STAGES.includes(stage)) {
        return NextResponse.json(
          { error: `stage must be one of: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        )
      }

      const customer = await transitionStage(tenantId, id, stage, {
        changedBy: session.user.employeeId ?? null,
        note,
      })

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'CUSTOMER_STAGE_CHANGE',
        id,
        { to: stage, note }
      )

      await triggerPusher(`tenant-${tenantId}`, 'customer-updated', {
        id,
        lifecycleStage: stage,
      })

      return NextResponse.json({ data: customer })
    } catch (error) {
      console.error('[Customers/Stage.PATCH]', error)
      if (error.message === 'Customer not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)
