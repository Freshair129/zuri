/**
 * POST   /api/customers/[id]/tags  — add tag to customer
 * DELETE /api/customers/[id]/tags  — remove tag from customer (body: { tag })
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { addTag, removeTag } from '@/lib/repositories/customerRepo'

export const dynamic = 'force-dynamic'

// POST — body: { tag: "VIP" }
export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const { tag } = await request.json()

      if (!tag || typeof tag !== 'string') {
        return NextResponse.json({ error: 'tag is required' }, { status: 400 })
      }

      const tags = await addTag(tenantId, id, tag.trim())
      return NextResponse.json({ data: { tags } })
    } catch (error) {
      console.error('[Customers/Tags.POST]', error)
      if (error.message === 'Customer not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)

// DELETE — body: { tag: "VIP" }
export const DELETE = withAuth(
  async (request, { params, session }) => {
    try {
      const tenantId = session.user.tenantId
      const { id } = await params
      const { tag } = await request.json()

      if (!tag) {
        return NextResponse.json({ error: 'tag is required' }, { status: 400 })
      }

      const tags = await removeTag(tenantId, id, tag.trim())
      return NextResponse.json({ data: { tags } })
    } catch (error) {
      console.error('[Customers/Tags.DELETE]', error)
      if (error.message === 'Customer not found') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'customers', action: 'W' }
)
