/**
 * GET  /api/kitchen/ingredients — List ingredients
 * POST /api/kitchen/ingredients — Create ingredient (KITCHEN+)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import * as ingredientRepo from '@/lib/repositories/ingredientRepo'
import { getPrisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search') || undefined
      const lowStockOnly = searchParams.get('lowStockOnly') === 'true'

      const ingredients = await ingredientRepo.findMany(tenantId, { search })
      
      let data = ingredients
      if (lowStockOnly) {
        data = ingredients.filter(i => i.currentStock <= i.minStock)
      }

      return NextResponse.json({ data })
    } catch (error) {
      console.error('[Ingredients.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'R' }
)

export const POST = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const body = await request.json()
      const { name, unit, minStock, ingredientId } = body

      if (!name || !unit) {
        return NextResponse.json({ error: 'name and unit are required' }, { status: 400 })
      }

      const prisma = await getPrisma()
      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          unit,
          minStock: minStock || 0,
          ingredientId: ingredientId || `ING-${Date.now()}`,
          tenantId
        }
      })

      return NextResponse.json({ data: ingredient }, { status: 201 })
    } catch (error) {
      console.error('[Ingredients.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'kitchen', action: 'F' }
)
