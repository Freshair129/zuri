// Created At: 2026-04-11 19:45:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-11 19:45:00 +07:00 (v1.0.0)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tenantContext } from './db'

// We want to test the multi-tenant hook logic in db.ts
// But because it's an extended client, we can test it by running code in the context and 
// spying on the base prisma client or checking the proxy.

describe('Multi-tenant Context (db.ts)', () => {
  it('tenantContext should store and retrieve tenantId', () => {
    tenantContext.run({ tenantId: 't-1' }, () => {
      const store = tenantContext.getStore()
      expect(store?.tenantId).toBe('t-1')
    })
  })

  it('tenantContext should be empty outside of run block', () => {
    expect(tenantContext.getStore()).toBeUndefined()
  })

  it('should support nested contexts (if needed, though use-case is rare)', () => {
    tenantContext.run({ tenantId: 'parent' }, () => {
      expect(tenantContext.getStore()?.tenantId).toBe('parent')
      tenantContext.run({ tenantId: 'child' }, () => {
        expect(tenantContext.getStore()?.tenantId).toBe('child')
      })
      expect(tenantContext.getStore()?.tenantId).toBe('parent')
    })
  })
})
