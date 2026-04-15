import { vi } from 'vitest'

/**
 * Create a mock Prisma client with vi.fn() on all model methods.
 * Usage in tests:
 *   import { createMockPrisma } from '@/tests/mocks/prismaMock'
 *   const mockPrisma = createMockPrisma()
 *   globalThis.__mockPrisma = mockPrisma
 */
export function createMockPrisma() {
  const modelMethods = ['findMany', 'findFirst', 'findUnique', 'create', 'update', 'updateMany', 'upsert', 'delete', 'count']

  const createModelMock = () => {
    const mock = {}
    for (const method of modelMethods) {
      mock[method] = vi.fn()
    }
    return mock
  }

  return {
    // Inventory
    warehouse: createModelMock(),
    warehouseStock: createModelMock(),
    stockMovement: createModelMock(),
    stockCount: createModelMock(),
    stockCountItem: createModelMock(),
    // Procurement
    supplier: createModelMock(),
    purchaseOrderV2: createModelMock(),
    pOItem: createModelMock(),
    pOApproval: createModelMock(),
    goodsReceivedNote: createModelMock(),
    gRNItem: createModelMock(),
    purchaseRequest: createModelMock(),
    // CRM
    customer: createModelMock(),
    customerProfile: createModelMock(),
    customerInsight: createModelMock(),
    tenantCRMPattern: createModelMock(),
    // Inbox
    conversation: createModelMock(),
    message: createModelMock(),
    // POS
    order: createModelMock(),
    transaction: createModelMock(),
    // Audit
    auditLog: createModelMock(),
    approvalWorkflow: createModelMock(),
    // Auth
    employee: createModelMock(),
    // Tenant
    tenant: createModelMock(),
    // Tasks
    task: createModelMock(),
    // Notifications
    webPushSubscription: createModelMock(),
    // Accounting Platform (FEAT17)
    integrationConfig: createModelMock(),
    integrationSyncLog: createModelMock(),
    integrationDocumentRef: createModelMock(),
    // Ingredients & Kitchen
    ingredient: createModelMock(),
    ingredientLot: createModelMock(),
    recipe: createModelMock(),
    recipeIngredient: createModelMock(),
    productRecipe: createModelMock(),
    // Products
    product: createModelMock(),
    // Orders
    orderItem: createModelMock(),
    posTable: createModelMock(),
    // POS config (Provisioner / Onboarding)
    posZone: createModelMock(),
    posReceiptConfig: createModelMock(),
    // $transaction helper
    $transaction: vi.fn(async (fn) => {
      // Execute the callback with the same mock prisma as the transaction client
      if (typeof fn === 'function') {
        return fn(globalThis.__mockPrisma)
      }
      // Array form: execute all promises
      return Promise.all(fn)
    }),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  }
}
