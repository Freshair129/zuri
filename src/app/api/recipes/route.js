import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'

// GET /api/recipes - List production recipes
export async function GET(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    // TODO: Extract filters (productId, isActive, page, limit)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const productId = searchParams.get('productId')

    // TODO: Import recipeRepo and call getRecipes({ tenantId, page, limit, productId })
    const recipes = [] // TODO: replace with real data

    return NextResponse.json({ data: recipes, page, limit })
  } catch (error) {
    console.error('[Recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request) {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // TODO: Validate required fields (productId, yieldQty, ingredients[])
    const { productId, yieldQty, yieldUnit, ingredients, instructions } = body

    if (!productId || !yieldQty || !ingredients?.length) {
      return NextResponse.json({ error: 'productId, yieldQty, and ingredients are required' }, { status: 400 })
    }

    // TODO: Import recipeRepo and call createRecipe({ tenantId, productId, yieldQty, ingredients, ... })
    const recipe = {} // TODO: replace with real data

    return NextResponse.json({ data: recipe }, { status: 201 })
  } catch (error) {
    console.error('[Recipes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
