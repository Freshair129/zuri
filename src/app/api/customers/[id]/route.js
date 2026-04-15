/**
 * GET    /api/customers/[id]  — customer detail
 * PATCH  /api/customers/[id]  — update customer fields
 * DELETE /api/customers/[id]  — soft delete
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
} from '@/lib/repositories/customerRepo'
import * as auditRepo from '@/lib/repositories/auditRepo'
import { triggerEvent as triggerPusher } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

// GET /api/customers/[id]
export const GET = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params

      const customer = await getCustomerById(tenantId, id)
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json({ data: customer })
    } catch (error) {
      console.error('[Customers/Detail.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'R', maskPii: true }
)

// PATCH /api/customers/[id]
// Body: { name?, phone?, email?, facebookName?, status?, assigneeId?, profile? }
// NOTE: lifecycleStage should go through PATCH /api/customers/[id]/stage
export const PATCH = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const body = await request.json()

      const customer = await updateCustomer(tenantId, id, body)

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'CUSTOMER_UPDATE',
        id,
        { changes: body }
      )

      await triggerPusher(`tenant-${tenantId}`, 'customer-updated', {
        id,
        displayName: customer.displayName,
        lifecycleStage: customer.lifecycleStage,
      })

      return NextResponse.json({ data: customer })
    } catch (error) {
      console.error('[Customers/Detail.PATCH]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)

// DELETE /api/customers/[id] — soft delete
export const DELETE = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params

      await softDeleteCustomer(tenantId, id)

      await auditRepo.create(
        tenantId,
        session.user.employeeId ?? session.user.email,
        'CUSTOMER_DELETE',
        id,
        {}
      )

      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('[Customers/Detail.DELETE]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)
