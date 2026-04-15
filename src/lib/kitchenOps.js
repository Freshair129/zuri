// Created At: 2026-04-13 02:00:00 +07:00 (v1.0.0)
// FEAT08: Kitchen Operations — Stock Deduction Logic

import * as productRepo from '@/lib/repositories/productRepo'
import * as ingredientRepo from '@/lib/repositories/ingredientRepo'

/**
 * Deducts ingredients for all items in an order using FEFO.
 * Called after an order is successfully created/paid.
 * 
 * @param {string} tenantId 
 * @param {Array} items - Array of OrderItem (normalized)
 */
export async function deductOrderIngredients(tenantId, items) {
  console.log(`[kitchenOps] Deducting ingredients for ${items.length} items`)
  
  const results = []

  for (const item of items) {
    if (!item.productId) continue

    // 1. Get product with its linked recipes
    const product = await productRepo.getProductById(tenantId, item.productId, true)
    if (!product || !product.recipes) continue

    // 2. For each recipe linked to this product
    for (const pr of product.recipes) {
      const recipe = pr.recipe
      if (!recipe) continue

      // Fetch full recipe with ingredients (productRepo only included basic recipe info)
      // Actually, we need the RecipeIngredient links which are in Recipe.ingredients
      // Let's assume we need to fetch the full recipe object
      // (Wait, we can optimize this if needed, but for now let's be thorough)
      
      const fullRecipe = await fetchRecipeDetail(tenantId, recipe.id)
      if (!fullRecipe || !fullRecipe.ingredients) continue

      // 3. For each ingredient in the recipe
      for (const ri of fullRecipe.ingredients) {
        const totalQtyToDeduct = ri.qty * item.qty
        
        console.log(`[kitchenOps] Deducting ${totalQtyToDeduct}${ri.unit} of ${ri.ingredient?.name} for ${product.name}`)
        
        try {
          const deduction = await ingredientRepo.deductFEFO(tenantId, ri.ingredientId, totalQtyToDeduct)
          results.push({
            productId: item.productId,
            ingredientId: ri.ingredientId,
            qty: totalQtyToDeduct,
            deducted: deduction.deducted,
            success: deduction.deducted === totalQtyToDeduct
          })
        } catch (err) {
          console.error(`[kitchenOps] Failed to deduct ${ri.ingredientId}`, err)
          results.push({
            productId: item.productId,
            ingredientId: ri.ingredientId,
            error: err.message,
            success: false
          })
        }
      }
    }
  }

  return results
}

/**
 * Helper to get full recipe with its ingredients
 */
async function fetchRecipeDetail(tenantId, id) {
  const { getPrisma } = await import('@/lib/db')
  const prisma = await getPrisma()
  return prisma.recipe.findFirst({
    where: { id, tenantId },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })
}
