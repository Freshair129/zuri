import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as recipeRepo from '@/lib/repositories/recipeRepo'

export const dynamic = 'force-dynamic'

// GET /api/culinary/recipes - List recipes
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') ?? '50')
    const page = parseInt(searchParams.get('page') ?? '1')
    const skip = (page - 1) * limit

    const recipes = await recipeRepo.findMany(tenantId, { category, search, limit, skip })

    return NextResponse.json({ data: recipes, page, limit })
  } catch (error) {
    console.error('[Culinary_Recipes_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'R' })

// POST /api/culinary/recipes - Create recipe
export const POST = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, ingredients, instructions } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const recipe = await recipeRepo.createRecipe(tenantId, body)

    return NextResponse.json({ data: recipe }, { status: 201 })
  } catch (error) {
    console.error('[Culinary_Recipes_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'F' })
