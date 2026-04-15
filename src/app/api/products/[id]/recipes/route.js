/**
 * POST   /api/products/[id]/recipes — Link a recipe to this product
 * DELETE /api/products/[id]/recipes?recipeId=... — Unlink a recipe
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { linkRecipe, unlinkRecipe } from '@/lib/repositories/productRepo'

export const dynamic = 'force-dynamic'

/**
 * POST /api/products/[id]/recipes
 * Body: { recipeId: string, order?: number }
 */
export const POST = withAuth(
  async (request, { params, session }) => {
    try {
      const { id: productId } = params
      const tenantId = session.user.tenantId
      const { recipeId, order } = await request.json()

      if (!recipeId) {
        return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
      }

      const result = await linkRecipe(tenantId, productId, recipeId, order || 0)
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Products.Recipes.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }
)

/**
 * DELETE /api/products/[id]/recipes?recipeId=...
 */
export const DELETE = withAuth(
  async (request, { params, session }) => {
    try {
      const { id: productId } = params
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)
      const recipeId = searchParams.get('recipeId')

      if (!recipeId) {
        return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
      }

      const result = await unlinkRecipe(tenantId, productId, recipeId)
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Products.Recipes.DELETE]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }
)
