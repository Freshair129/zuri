// Created At: 2026-04-12 04:25:00 +07:00 (v1.3.4)
// Previous version: 2026-04-12 04:25:00 +07:00 (v1.3.4)
// Last Updated: 2026-04-12 19:10:00 +07:00 (v1.4.0)

/**
 * productRepo — Product catalog data access (FEAT06-POS)
 * Products are scoped per tenant. Redis cached for POS performance.
 */

import { getPrisma } from '@/lib/db'
import { getOrSet, redis } from '@/lib/redis'
import { generateSku } from '@/lib/idGenerator'

async function bustCache(tenantId) {
  const r = redis
  if (!r) return
  
  try {
    const keys = await r.keys(`products:${tenantId}:*`)
    if (keys.length > 0) await r.del(...keys)
  } catch (err) {
    console.error('[productRepo] bustCache error', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
export async function listProducts(tenantId, {
  category,
  search,
  isPosVisible,
  isActive = true,
  page = 1,
  limit = 50,
} = {}) {
  const cacheKey = `products:${tenantId}:${JSON.stringify({ category, search, isPosVisible, isActive, page, limit })}`

  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const where = { tenantId }
    if (isActive !== undefined) where.isActive = isActive
    if (isPosVisible !== undefined) where.isPosVisible = isPosVisible
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { sku:     { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const offset = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.product.count({ where }),
    ])

    return { products, total, page, limit, pages: Math.ceil(total / limit) }
  }, 120)
}

// Distinct categories
export async function listCategories(tenantId) {
  const cacheKey = `products:${tenantId}:categories`
  return getOrSet(cacheKey, async () => {
    const prisma = await getPrisma()
    const rows = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    return rows.map(r => r.category)
  }, 120)
}

export async function getProductById(tenantId, id, includeRecipes = false) {
  const prisma = await getPrisma()
  return prisma.product.findFirst({ 
    where: { id, tenantId },
    include: includeRecipes ? {
      recipes: {
        include: {
          recipe: true
        },
        orderBy: { order: 'asc' }
      }
    } : undefined
  })
}

export async function createProduct(tenantId, data) {
  const prisma = await getPrisma()
  const sku = await generateSku(data)
  const product = await prisma.product.create({
    data: { ...data, tenantId, sku },
  })
  await bustCache(tenantId)
  return product
}

export async function updateProduct(tenantId, id, data) {
  const prisma = await getPrisma()
  const updated = await prisma.product.update({
    where: { id, tenantId },
    data,
  })
  await bustCache(tenantId)
  return updated
}

export async function softDeleteProduct(tenantId, id) {
  const prisma = await getPrisma()
  const deleted = await prisma.product.update({
    where: { id, tenantId },
    data: { isActive: false },
  })
  await bustCache(tenantId)
  return deleted
}

export async function linkRecipe(tenantId, productId, recipeId, order = 0) {
  const prisma = await getPrisma()
  return prisma.productRecipe.upsert({
    where: {
      productId_recipeId: { productId, recipeId }
    },
    update: { order },
    create: {
      tenantId,
      productId,
      recipeId,
      order
    }
  })
}

export async function unlinkRecipe(tenantId, productId, recipeId) {
  const prisma = await getPrisma()
  return prisma.productRecipe.delete({
    where: {
      productId_recipeId: { productId, recipeId }
    }
  })
}

export function getPosPrice(product) {
  return product.posPrice ?? product.basePrice
}
