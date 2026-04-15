import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPrismaProduct = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
}

vi.mock('@/lib/db', () => ({
  getPrisma: () => ({ product: mockPrismaProduct }),
}))

// Mock getOrSet to simply call the fetcher (bypass Redis in tests)
const mockRedis = {
  keys: vi.fn().mockResolvedValue([]),
  del: vi.fn().mockResolvedValue(1),
}

vi.mock('@/lib/redis', () => ({
  getOrSet: vi.fn(async (key, fetcher) => fetcher()),
  redis: mockRedis,
}))

vi.mock('@/lib/idGenerator', () => ({
  generateProductId: vi.fn().mockResolvedValue('PRD-COOK-01-001'),
}))

// Import after mocks are registered
const {
  listProducts,
  listCategories,
  getProductById,
  createProduct,
  updateProduct,
  getPosPrice,
} = await import('@/lib/repositories/productRepo')

// ── Helpers ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-abc'

beforeEach(() => {
  vi.clearAllMocks()
  mockRedis.keys.mockResolvedValue([])
  mockRedis.del.mockResolvedValue(1)
})

// ─────────────────────────────────────────────────────────────────────────────
// listProducts
// ─────────────────────────────────────────────────────────────────────────────
describe('listProducts', () => {
  it('should return paginated products with defaults', async () => {
    const fakeProducts = [{ id: '1', name: 'Pad Thai', category: 'Noodles' }]
    mockPrismaProduct.findMany.mockResolvedValue(fakeProducts)
    mockPrismaProduct.count.mockResolvedValue(1)

    const result = await listProducts(TENANT)

    expect(mockPrismaProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, isActive: true },
        take: 50,
        skip: 0,
      })
    )
    expect(result.products).toEqual(fakeProducts)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(50)
    expect(result.pages).toBe(1)
  })

  it('should filter by category when provided', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])
    mockPrismaProduct.count.mockResolvedValue(0)

    await listProducts(TENANT, { category: 'Noodles' })

    expect(mockPrismaProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'Noodles' }),
      })
    )
  })

  it('should add OR search clause for name, sku, productId', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])
    mockPrismaProduct.count.mockResolvedValue(0)

    await listProducts(TENANT, { search: 'tom' })

    const call = mockPrismaProduct.findMany.mock.calls[0][0]
    expect(call.where.OR).toHaveLength(3)
    expect(call.where.OR[0]).toMatchObject({ name: { contains: 'tom', mode: 'insensitive' } })
  })

  it('should filter by isPosVisible when provided', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])
    mockPrismaProduct.count.mockResolvedValue(0)

    await listProducts(TENANT, { isPosVisible: true })

    expect(mockPrismaProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPosVisible: true }),
      })
    )
  })

  it('should calculate correct page offset', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])
    mockPrismaProduct.count.mockResolvedValue(100)

    await listProducts(TENANT, { page: 3, limit: 10 })

    expect(mockPrismaProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    )
  })

  it('should calculate pages correctly', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])
    mockPrismaProduct.count.mockResolvedValue(23)

    const result = await listProducts(TENANT, { limit: 10 })
    expect(result.pages).toBe(3) // ceil(23 / 10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listCategories
// ─────────────────────────────────────────────────────────────────────────────
describe('listCategories', () => {
  it('should return distinct category strings', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([
      { category: 'Drinks' },
      { category: 'Noodles' },
      { category: 'Rice' },
    ])

    const result = await listCategories(TENANT)

    expect(mockPrismaProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, isActive: true },
        select: { category: true },
        distinct: ['category'],
      })
    )
    expect(result).toEqual(['Drinks', 'Noodles', 'Rice'])
  })

  it('should return empty array when no products', async () => {
    mockPrismaProduct.findMany.mockResolvedValue([])

    const result = await listCategories(TENANT)
    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getProductById
// ─────────────────────────────────────────────────────────────────────────────
describe('getProductById', () => {
  it('should call findFirst with id and tenantId', async () => {
    const fakeProduct = { id: 'p1', name: 'Green Curry', tenantId: TENANT }
    mockPrismaProduct.findFirst.mockResolvedValue(fakeProduct)

    const result = await getProductById(TENANT, 'p1')

    expect(mockPrismaProduct.findFirst).toHaveBeenCalledWith({
      where: { id: 'p1', tenantId: TENANT },
    })
    expect(result).toEqual(fakeProduct)
  })

  it('should return null when product not found', async () => {
    mockPrismaProduct.findFirst.mockResolvedValue(null)

    const result = await getProductById(TENANT, 'not-exist')
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('createProduct', () => {
  it('should generate productId and pass tenantId to create', async () => {
    const data = { name: 'Mango Sticky Rice', basePrice: 120, category: 'Dessert' }
    const created = { id: 'uuid-1', productId: 'PRD-COOK-01-001', ...data, tenantId: TENANT }
    mockPrismaProduct.create.mockResolvedValue(created)

    const result = await createProduct(TENANT, data)

    expect(mockPrismaProduct.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ...data,
        tenantId: TENANT,
        productId: 'PRD-COOK-01-001',
      }),
    })
    expect(result).toEqual(created)
  })

  it('should bust cache after creation (keys lookup)', async () => {
    mockPrismaProduct.create.mockResolvedValue({ id: 'uuid-2' })
    mockRedis.keys.mockResolvedValue([`products:${TENANT}:all`])

    await createProduct(TENANT, { name: 'Test', basePrice: 50 })

    expect(mockRedis.keys).toHaveBeenCalledWith(`products:${TENANT}:*`)
    expect(mockRedis.del).toHaveBeenCalledWith(`products:${TENANT}:all`)
  })

  it('should skip del when no keys found in cache', async () => {
    mockPrismaProduct.create.mockResolvedValue({ id: 'uuid-3' })
    mockRedis.keys.mockResolvedValue([])

    await createProduct(TENANT, { name: 'Test', basePrice: 50 })

    expect(mockRedis.del).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// updateProduct
// ─────────────────────────────────────────────────────────────────────────────
describe('updateProduct', () => {
  it('should call update with correct where clause and data', async () => {
    const updateData = { basePrice: 200 }
    const updated = { id: 'p1', basePrice: 200, tenantId: TENANT }
    mockPrismaProduct.update.mockResolvedValue(updated)

    const result = await updateProduct(TENANT, 'p1', updateData)

    expect(mockPrismaProduct.update).toHaveBeenCalledWith({
      where: { id: 'p1', tenantId: TENANT },
      data: updateData,
    })
    expect(result).toEqual(updated)
  })

  it('should bust cache after update', async () => {
    mockPrismaProduct.update.mockResolvedValue({ id: 'p1' })
    mockRedis.keys.mockResolvedValue([`products:${TENANT}:list`])

    await updateProduct(TENANT, 'p1', { basePrice: 99 })

    expect(mockRedis.keys).toHaveBeenCalledWith(`products:${TENANT}:*`)
    expect(mockRedis.del).toHaveBeenCalledWith(`products:${TENANT}:list`)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getPosPrice (pure function)
// ─────────────────────────────────────────────────────────────────────────────
describe('getPosPrice', () => {
  it('should return posPrice when it is set', () => {
    expect(getPosPrice({ basePrice: 100, posPrice: 85 })).toBe(85)
  })

  it('should fall back to basePrice when posPrice is null', () => {
    expect(getPosPrice({ basePrice: 100, posPrice: null })).toBe(100)
  })

  it('should fall back to basePrice when posPrice is undefined', () => {
    expect(getPosPrice({ basePrice: 100 })).toBe(100)
  })

  it('should return 0 posPrice (not fall through to basePrice)', () => {
    // 0 is a valid posPrice — nullish coalescing only skips null/undefined
    expect(getPosPrice({ basePrice: 100, posPrice: 0 })).toBe(0)
  })
})
