/**
 * POST /api/kitchen/ingredients/[id]/lots — Goods Receipt (Add new lot)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const { id: ingredientId } = params
      const tenantId = session.user.tenantId
      const body = await request.json()
      const { lotId, initialQty, expiresAt, status } = body

      if (!initialQty || !expiresAt) {
        return NextResponse.json({ error: 'initialQty and expiresAt are required' }, { status: 400 })
      }

      const prisma = await getPrisma()
      
      // 1. Create the lot
      const lot = await prisma.ingredientLot.create({
        data: {
          lotId: lotId || `LOT-${Date.now()}`,
          tenantId,
          ingredientId,
          initialQty: parseFloat(initialQty),
          remainingQty: parseFloat(initialQty),
          expiresAt: new Date(expiresAt),
          status: status || 'ACTIVE'
        }
      })

      // 2. Update denormalized currentStock in Ingredient
      await prisma.ingredient.update({
        where: { id: ingredientId, tenantId },
        data: {
          currentStock: { increment: parseFloat(initialQty) }
        }
      })

      return NextResponse.json({ data: lot }, { status: 201 })
    } catch (error) {
      console.error('[Ingredients.Lots.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'F' }
)
