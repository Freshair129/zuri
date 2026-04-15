// Created At: 2026-04-12 05:35:00 +07:00 (v1.3.18)
// Previous version: 2026-04-11 20:34:56 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:35:00 +07:00 (v1.3.18)

import { getPrisma } from '@/lib/db'

/**
 * Get full course details including its recipes and schedules
 */
export async function getCourseDetails(tenantId, productId) {
  const prisma = await getPrisma()
  return prisma.product.findFirst({
    where: { id: productId, tenantId, category: 'COURSE' },
    include: {
      recipes: {
        include: { recipe: true },
        orderBy: { order: 'asc' }
      },
      schedules: {
        where: { scheduledDate: { gte: new Date() } },
        orderBy: { scheduledDate: 'asc' }
      }
    }
  })
}

/**
 * Sync recipes for a course product
 */
export async function syncCourseRecipes(tenantId, productId, recipeIds) {
  const prisma = await getPrisma()
  // Verify product is a course belonging to tenant
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, category: 'COURSE' }
  })
  if (!product) throw new Error('Course product not found')

  return prisma.$transaction(async (tx) => {
    // 1. Remove existing links
    await tx.productRecipe.deleteMany({ where: { productId } })

    // 2. Create new links
    if (recipeIds?.length > 0) {
      await tx.productRecipe.createMany({
        data: recipeIds.map((recipeId, index) => ({
          productId,
          recipeId,
          order: index
        }))
      })
    }

    return tx.productRecipe.findMany({
      where: { productId },
      include: { recipe: true },
      orderBy: { order: 'asc' }
    })
  })
}

/**
 * List all courses (products with category COURSE)
 */
export async function listCourses(tenantId, { search, isActive = true } = {}) {
  const prisma = await getPrisma()
  const where = { tenantId, category: 'COURSE' }
  if (isActive !== undefined) where.isActive = isActive
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  return prisma.product.findMany({
    where,
    orderBy: { name: 'asc' }
  })
}
