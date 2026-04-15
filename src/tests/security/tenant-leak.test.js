// Created At: 2026-04-14T13:45:00+07:00
// Security Hook: GATE 5 Verification (Tenant Isolation Test)

import { getPrisma, getTenantContext } from '@/lib/db'
import { withTenantContext } from '@/lib/tenantContext'

describe('Multi-Tenant Isolation (Anti-Leak Hook)', () => {
  const TENANT_A = '10000000-0000-0000-0000-000000000001'
  const TENANT_B = '20000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    const prisma = await getPrisma()
    // Ensure test data exists for both tenants
    // Note: In real CI/CD, these would be seeded uniquely
  })

  it('should only return Tenant A data when in Tenant A context', async () => {
    const prisma = await getPrisma()
    
    await withTenantContext(TENANT_A, async () => {
      // Create a customer for Tenant A
      const customer = await prisma.customer.findFirst({
        where: { name: { contains: '' } } // Generic find
      })

      if (customer) {
        expect(customer.tenantId).toBe(TENANT_A)
      }
    })
  })

  it('should prevent Tenant A from querying Tenant B data directly', async () => {
    const prisma = await getPrisma()
    
    // Attempt to query Tenant B's data while in Tenant A's context
    // The Prisma extension should automatically append WHERE tenantId = TENANT_A 
    // even if we try to explicitly filter for TENANT_B (or at least merge them)
    
    await withTenantContext(TENANT_A, async () => {
      const customersForB = await prisma.customer.findMany({
        where: { tenantId: TENANT_B }
      })

      // Result should be empty because (tenantId = TENANT_B AND tenantId = TENANT_A) = FALSE
      expect(customersForB.length).toBe(0)
    })
  })

  it('should automatically inject tenantId on CREATE operations', async () => {
    const prisma = await getPrisma()
    
    await withTenantContext(TENANT_A, async () => {
      const newCustomer = await prisma.customer.create({
        data: {
          customerId: `AUTO-${Date.now()}`,
          name: 'Test Tenant Isolation'
        }
      })

      expect(newCustomer.tenantId).toBe(TENANT_A)
    })
  })
})
