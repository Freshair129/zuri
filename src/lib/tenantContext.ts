// Created At: 2026-04-14T13:30:00+07:00 (v1.0.0)
// Part of ZRI-IMP-0100 (Core & Auth)

import { getTenantContext } from './db'

/**
 * Zuri Tenant Context Runner (Nuclear Hardened)
 * 
 * Provides a clean abstraction for wrapping logic in a multi-tenant scope.
 * Primarily used in withAuth HOC or background workers.
 */

export async function withTenantContext(tenantId: string, fn: () => Promise<any>) {
  if (!tenantId) {
    throw new Error('[tenantContext] Missing tenantId for context run')
  }

  const context = getTenantContext()
  
  if (!context || !context.run) {
    // If we're on Edge or context is somehow unavailable, just run the function
    // But log a warning if we're in Node environment
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      console.warn('[tenantContext] Running without isolation context!')
    }
    return fn()
  }

  return context.run({ tenantId }, fn)
}

/**
 * Helper to extract tenant context in internal repositories if needed
 */
export function currentTenantId(): string | null {
  const context = getTenantContext()
  return (context?.getStore() as any)?.tenantId || null
}
