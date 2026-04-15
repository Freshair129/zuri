// Created At: 2026-04-13 01:15:00 +07:00 (v1.0.0)
// Previous version: N/A
// Last Updated: 2026-04-13 01:15:00 +07:00 (v1.0.0)
// FEAT08: Backfill tenantId for existing Ingredients and IngredientLots — DEV only

export const dynamic = 'force-dynamic'

import { getPrisma } from '@/lib/db'

const V_SCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001'

/**
 * POST /api/admin/backfill-ingredient-tenants
 * DEV only. Protected by x-admin-secret header (= CRON_SECRET).
 * 
 * Logic:
 * 1. Find all Ingredients that still have the default V School tenantId.
 * 2. Try to resolve their correct tenantId by looking at linked Recipes.
 * 3. Update Ingredient.tenantId.
 * 4. Find all IngredientLots that differ from their parent Ingredient.tenantId.
 * 5. Update IngredientLot.tenantId.
 */
export async function POST(request) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let prisma
  try {
    prisma = await getPrisma()
  } catch (err) {
    console.error('[BackfillIngredients] Prisma init error:', err)
    return Response.json({ error: 'DB init failed', detail: err.message }, { status: 500 })
  }

  const results = { ingredients: [], lots: [] }

  try {

  // 1. Backfill Ingredients
  // We look for those with the default ID and try to find if they belong elsewhere
  const ingredients = await prisma.ingredient.findMany({
    where: { tenantId: V_SCHOOL_TENANT_ID }
  })

  for (const ingredient of ingredients) {
    // Try to find a recipe that uses this ingredient to discover the intended tenant
    const recipeIngredient = await prisma.recipeIngredient.findFirst({
      where: { ingredientId: ingredient.id },
      include: { 
        recipe: {
          select: { tenantId: true }
        }
      }
    })

    if (recipeIngredient?.recipe?.tenantId && recipeIngredient.recipe.tenantId !== V_SCHOOL_TENANT_ID) {
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { tenantId: recipeIngredient.recipe.tenantId }
      })
      results.ingredients.push({ 
        id: ingredient.id, 
        name: ingredient.name, 
        oldTenantId: V_SCHOOL_TENANT_ID,
        newTenantId: recipeIngredient.recipe.tenantId 
      })
    }
  }

  // 2. Backfill IngredientLots
  // Lots MUST match their parent ingredient's tenantId for isolation to work
  const lots = await prisma.ingredientLot.findMany({
    include: { 
      ingredient: {
        select: { tenantId: true }
      }
    }
  })

  for (const lot of lots) {
    if (lot.tenantId !== lot.ingredient.tenantId) {
      await prisma.ingredientLot.update({
        where: { id: lot.id },
        data: { tenantId: lot.ingredient.tenantId }
      })
      results.lots.push({ 
        id: lot.id, 
        lotId: lot.lotId, 
        oldTenantId: lot.tenantId,
        newTenantId: lot.ingredient.tenantId 
      })
    }
  }

  console.log(`[BackfillIngredients] Done — ${results.ingredients.length} ingredients, ${results.lots.length} lots updated`)

  return Response.json({
    message: 'Backfill complete',
    updatedIngredientsCount: results.ingredients.length,
    updatedLotsCount: results.lots.length,
    results
  })

  } catch (err) {
    console.error('[BackfillIngredients] Query error:', err)
    return Response.json({ error: 'Query failed', detail: err.message }, { status: 500 })
  }
}
