// Created At: 2026-04-12 04:02:00 +07:00 (v1.3.0)
// Previous version: 2026-04-12 03:32:00 +07:00 (v1.2.4)
// Last Updated: 2026-04-12 04:02:00 +07:00 (v1.3.0)

/**
 * Zuri Database Utility (Nuclear Hardened)
 * Strictly lazy-loading to protect Vercel Edge Runtime.
 */

const SYSTEM_TABLES = ['Tenant', 'MarketPrice', 'AuditLog', 'ActiveSession', 'active_sessions']

/**
 * Multi-tenant Context Store (Strictly Lazy)
 */
let _tenantContext = null
export function getTenantContext() {
  if (typeof window !== 'undefined') return null
  
  // ZDEV-IMP-2662: Total Isolation from Node modules in Edge Runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return { getStore: () => null, run: (ctx, fn) => fn() }
  }

  if (!_tenantContext) {
    try {
      // Dynamic require is safer but still risky in some bundlers; 
      // strictly guarding with NEXT_RUNTIME is the key.
      const { AsyncLocalStorage } = require('node:async_hooks')
      _tenantContext = new AsyncLocalStorage()
    } catch (e) {
      return { getStore: () => null, run: (ctx, fn) => fn() }
    }
  }
  return _tenantContext
}

/**
 * Extended Prisma Client Builder (Lazy)
 */
async function createExtendedClient() {
  // Use dynamic import to keep @prisma/client out of the static module graph
  const { PrismaClient } = await import('@prisma/client')
  const basePrisma = new PrismaClient()
  
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (SYSTEM_TABLES.includes(model)) return query(args)

          const context = getTenantContext()?.getStore()
          const tenantId = context?.tenantId

          if (['findMany', 'findFirst', 'findUnique', 'update', 'delete', 'updateMany', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            if (tenantId) {
              (args as any).where = { ...((args as any).where || {}), tenantId }
            }
          }

          if (operation === 'create' || operation === 'createMany') {
            if (tenantId) {
              if (operation === 'create') {
                (args as any).data = { ...((args as any).data || {}), tenantId }
              } else if (operation === 'createMany') {
                if (Array.isArray((args as any).data)) {
                  (args as any).data = (args as any).data.map((item: any) => ({ ...item, tenantId }))
                }
              }
            }
          }

          return query(args)
        },
      },
    },
  })
}

/**
 * Single Entry Point for Database (Strictly Lazy)
 */
export async function getPrisma() {
  const context = globalThis as any
  if (!context.prisma) {
    context.prisma = await createExtendedClient()
  }
  return context.prisma
}
