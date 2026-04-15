/**
 * GET  /api/products — product catalog (POS grid + back-office)
 * POST /api/products — create product (MANAGER+)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth'
import { listProducts, listCategories, createProduct } from '@/lib/repositories/productRepo'

export const dynamic = 'force-dynamic'

// GET /api/products?category=&search=&isPosVisible=&isActive=&page=&limit=&categories=1
export const GET = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session?.user?.tenantId
      if (!tenantId) {
        console.error('[Products.GET] Missing tenantId in session')
        return NextResponse.json({ error: 'Tenant ID is missing from session. Please re-login.' }, { status: 400 })
      }

      const { searchParams } = new URL(request.url)

      // Categories list shortcut
      if (searchParams.get('categories') === '1') {
        const cats = await listCategories(tenantId)
        return NextResponse.json({ data: cats })
      }

      const page    = parseInt(searchParams.get('page')  ?? '1')
      const limit   = parseInt(searchParams.get('limit') ?? '50')
      const category     = searchParams.get('category')     || undefined
      const search       = searchParams.get('search')       || undefined
      const isActiveStr  = searchParams.get('isActive')
      const isPosVisStr  = searchParams.get('isPosVisible')

      const isActive    = isActiveStr  === null ? true  : isActiveStr  !== 'false'
      const isPosVisible = isPosVisStr === null ? undefined : isPosVisStr !== 'false'

      const result = await listProducts(tenantId, { category, search, isActive, isPosVisible, page, limit })
      
      
      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('[Products.GET] Critical Error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch products', 
        details: error.message,
        tenantId: session?.user?.tenantId
      }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'R' }
)

// POST /api/products — create product
export const POST = withAuth(
  async (request, { session }) => {
    try {
      const tenantId = session.user.tenantId
      const body = await request.json()

      const { name, category, basePrice, posPrice, description, imageUrl, sku, sessionType, hours, isPosVisible } = body

      if (!name || !category || basePrice == null) {
        return NextResponse.json({ error: 'name, category, basePrice are required' }, { status: 400 })
      }

      const product = await createProduct(tenantId, {
        name, category, basePrice, posPrice,
        description, imageUrl, sku, sessionType, hours,
        isPosVisible: isPosVisible ?? true,
      })

      return NextResponse.json({ data: product }, { status: 201 })
    } catch (error) {
      console.error('[Products.POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  },
  { domain: 'orders', action: 'F' }
)
