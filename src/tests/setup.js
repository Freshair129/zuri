import { vi, beforeEach } from 'vitest'

// Create a proxy that always delegates to globalThis.__mockPrisma
// This way, even though repos call getPrisma() once at module level,
// the returned object forwards to the latest mock set in beforeEach
const prismaProxy = new Proxy({}, {
  get(_, prop) {
    if (!globalThis.__mockPrisma) {
      throw new Error('Test setup error: globalThis.__mockPrisma not set. Call createMockPrisma() in beforeEach.')
    }
    return globalThis.__mockPrisma[prop]
  },
})

// Mock the database module globally
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getPrisma: () => prismaProxy,
    // Use the real tenantContext to allow AsyncLocalStorage testing
    tenantContext: actual.tenantContext, 
  }
})

// Set test env vars
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.MOCK_MODE = 'true'  // prevent PrismaClient from loading native engine on Linux
