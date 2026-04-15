/**
 * GET    /api/kitchen/ingredients/[id] — Detail
 * PUT    /api/kitchen/ingredients/[id] — Update
 * DELETE /api/kitchen/ingredients/[id] — Delete
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as ingredientRepo from '@/lib/repositories/ingredientRepo'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId

      const ingredient = await ingredientRepo.findById(tenantId, id)
      if (!ingredient) {
        return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
      }

      return NextResponse.json({ data: ingredient })
    } catch (error) {
      console.error('[Ingredients.ID.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'R' }
)

export const PUT = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId
      const body = await request.json()
      const { name, unit, minStock, isActive } = body

      const prisma = await getPrisma()
      const updated = await prisma.ingredient.update({
        where: { id, tenantId },
        data: {
          name,
          unit,
          minStock,
          isActive // Ensure we have isActive in model? (Checking schema)
        }
      })

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error('[Ingredients.ID.PUT]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'F' }
)

export const DELETE = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId

      const prisma = await getPrisma()
      await prisma.ingredient.delete({
        where: { id, tenantId }
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Ingredients.ID.DELETE]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'F' }
)
