/**
 * GET    /api/products/[id] — single product detail (with recipes)
 * PUT    /api/products/[id] — update product fields (MANAGER+)
 * DELETE /api/products/[id] — soft delete (MANAGER+)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { getProductById, updateProduct, softDeleteProduct } from '@/lib/repositories/productRepo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products/[id]?includeRecipes=true
 */
export const GET = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId
      const { searchParams } = new URL(request.url)
      const includeRecipes = searchParams.get('includeRecipes') === 'true'

      const product = await getProductById(tenantId, id, includeRecipes)
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      return NextResponse.json({ data: product })
    } catch (error) {
      console.error('[Products.ID.GET]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'R' }
)

/**
 * PUT /api/products/[id]
 */
export const PUT = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId
      const body = await request.json()

      // Allowed fields for update
      const { 
        name, description, category, basePrice, posPrice, 
        isPosVisible, isActive, imageUrl, sku, barcode,
        sessionType, hours
      } = body

      const updated = await updateProduct(tenantId, id, {
        name, description, category, basePrice, posPrice,
        isPosVisible, isActive, imageUrl, sku, barcode,
        sessionType, hours
      })

      return NextResponse.json({ data: updated })
    } catch (error) {
      console.error('[Products.ID.PUT]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }
)

/**
 * DELETE /api/products/[id] (Soft Delete)
 */
export const DELETE = withAuth(
  async (request, { params, session }) => {
    try {
      const { id } = params
      const tenantId = session.user.tenantId

      const deleted = await softDeleteProduct(tenantId, id)
      return NextResponse.json({ data: deleted })
    } catch (error) {
      console.error('[Products.ID.DELETE]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }
)
