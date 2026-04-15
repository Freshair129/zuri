import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import * as recipeRepo from '@/lib/repositories/recipeRepo'

export const dynamic = 'force-dynamic'

// GET /api/culinary/recipes/[id] - Get details
export const GET = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const recipe = await recipeRepo.findById(tenantId, id)

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json({ data: recipe })
  } catch (error) {
    console.error('[Culinary_Recipes_Detail_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'R' })

// PATCH /api/culinary/recipes/[id] - Update
export const PATCH = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    const updated = await recipeRepo.updateRecipe(tenantId, id, body)

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[Culinary_Recipes_Detail_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'F' })

// DELETE /api/culinary/recipes/[id] - Delete
export const DELETE = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    await recipeRepo.deleteRecipe(tenantId, id)

    return NextResponse.json({ success: true, message: 'Recipe deleted' })
  } catch (error) {
    console.error('[Culinary_Recipes_Detail_DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'kitchen', action: 'F' })
