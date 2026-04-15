// Created At: 2026-04-12 04:40:00 +07:00 (v1.3.7)
// Previous version: 2026-04-11 20:32:23 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 04:40:00 +07:00 (v1.3.7)

import { getPrisma } from '@/lib/db'
import { generateRecipeId } from '@/lib/idGenerator'

/**
 * List recipes for a tenant with optional filtering
 */
export async function findMany(tenantId, { category, search, limit = 50, offset = 0 } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId }
  if (category) where.category = category
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  return prisma.recipe.findMany({
    where,
    include: {
      _count: { select: { ingredients: true } }
    },
    take: limit,
    skip: offset,
    orderBy: { name: 'asc' }
  })
}

/**
 * Get recipe details with all ingredients and instructions
 */
export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.recipe.findFirst({
    where: { id, tenantId },
    include: {
      ingredients: {
        include: { ingredient: true }
      }
    }
  })
}

/**
 * Create a new recipe with ingredients
 */
export async function createRecipe(tenantId, { name, description, yieldAmount, yieldUnit, category, instructions, ingredients = [] }) {
  const prisma = await getPrisma()
  const recipeId = await generateRecipeId()
  
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        recipeId,
        tenantId,
        name,
        description,
        yieldAmount,
        yieldUnit,
        category,
        instructions: instructions || [],
        ingredients: {
          create: ingredients.map(inv => ({
            ingredientId: inv.ingredientId,
            qty: inv.qty,
            unit: inv.unit,
            note: inv.note
          }))
        }
      },
      include: { ingredients: true }
    })
    return recipe
  })
}

/**
 * Update recipe and sync ingredients
 */
export async function updateRecipe(tenantId, id, { ingredients, ...data }) {
  const prisma = await getPrisma()
  // Verify ownership
  const existing = await prisma.recipe.findFirst({ where: { id, tenantId } })
  if (!existing) throw new Error('Recipe not found')

  return prisma.$transaction(async (tx) => {
    // 1. Update basic info
    const updated = await tx.recipe.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })

    // 2. Sync ingredients if provided
    if (ingredients) {
      // Delete old ingredients
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } })
      
      // Create new ones
      await tx.recipeIngredient.createMany({
        data: ingredients.map(inv => ({
          recipeId: id,
          ingredientId: inv.ingredientId,
          qty: inv.qty,
          unit: inv.unit,
          note: inv.note
        }))
      })
    }

    return tx.recipe.findUnique({
      where: { id },
      include: { ingredients: true }
    })
  })
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(tenantId, id) {
  const prisma = await getPrisma()
  const existing = await prisma.recipe.findFirst({ where: { id, tenantId } })
  if (!existing) throw new Error('Recipe not found')

  return prisma.recipe.delete({ where: { id } })
}
