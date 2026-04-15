// Created At: 2026-04-10 03:00:00 +07:00 (v1.0.0)
// Previous version: 2026-04-10 03:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-10 07:55:00 +07:00 (v2.0.0)

/**
 * auditRepo tests — covers v1 legacy positional create() AND the v2 payload
 * signature, plus all read finders, the new countByTenant, and the
 * immutability contract (no exported update/delete).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

const TENANT = '10000000-0000-0000-0000-000000000001'
const ACTOR = 'EMP-12'
const TARGET = 'customer-1'

describe('auditRepo', () => {
  let mockPrisma

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
  })

  // ── v1 legacy signature: create(tenantId, actor, action, target, details)
  describe('create — v1 legacy positional', () => {
    it('writes basic audit log entry', async () => {
      const { create } = await import('./auditRepo.js')
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

      await create(TENANT, ACTOR, 'UPDATE_PROFILE', TARGET, { lifeStage: 'PROSPECT' })

      const arg = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(arg.data.tenantId).toBe(TENANT)
      expect(arg.data.actor).toBe(ACTOR)
      expect(arg.data.action).toBe('UPDATE_PROFILE')
      expect(arg.data.target).toBe(TARGET)
      expect(arg.data.details).toEqual({ lifeStage: 'PROSPECT' })
    })

    it('handles missing target/details gracefully', async () => {
      const { create } = await import('./auditRepo.js')
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-2' })

      await create(TENANT, ACTOR, 'LOGIN')

      const arg = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(arg.data.target).toBeNull()
      expect(arg.data.details).toBeNull()
    })
  })

  // ── v2 payload signature: create(tenantId, payload)
  describe('create — v2 payload object', () => {
    it('writes the full extended payload', async () => {
      const { create } = await import('./auditRepo.js')
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-3' })

      await create(TENANT, {
        actor: ACTOR,
        actorId: 'emp-uuid-12',
        actorRole: 'OWNER',
        action: 'EMPLOYEE_ROLE_CHANGE',
        target: 'emp-uuid-99',
        targetType: 'employee',
        before: { role: 'STAFF' },
        after: { role: 'MANAGER' },
        details: { reason: 'promotion' },
        ipAddress: '203.0.113.42',
        userAgent: 'Mozilla/5.0 (...)',
      })

      const arg = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(arg.data.tenantId).toBe(TENANT)
      expect(arg.data.actorId).toBe('emp-uuid-12')
      expect(arg.data.actorRole).toBe('OWNER')
      expect(arg.data.targetType).toBe('employee')
      expect(arg.data.before).toEqual({ role: 'STAFF' })
      expect(arg.data.after).toEqual({ role: 'MANAGER' })
      expect(arg.data.ipAddress).toBe('203.0.113.42')
      expect(arg.data.userAgent).toMatch(/Mozilla/)
    })

    it('throws when actor or action is missing', async () => {
      const { create } = await import('./auditRepo.js')

      await expect(create(TENANT, { actor: 'x' }))
        .rejects.toThrow(/actor and action are required/)
      await expect(create(TENANT, { action: 'X' }))
        .rejects.toThrow(/actor and action are required/)
    })

    it('defaults optional fields to null', async () => {
      const { create } = await import('./auditRepo.js')
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-4' })

      await create(TENANT, { actor: ACTOR, action: 'LOGIN' })

      const arg = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(arg.data.actorId).toBeNull()
      expect(arg.data.target).toBeNull()
      expect(arg.data.before).toBeNull()
      expect(arg.data.after).toBeNull()
      expect(arg.data.ipAddress).toBeNull()
      expect(arg.data.userAgent).toBeNull()
    })
  })

  // ── Read finders
  describe('findByActor', () => {
    it('queries by tenantId + actor with default pagination', async () => {
      const { findByActor } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByActor(TENANT, ACTOR, { limit: 10 })

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where).toEqual({ tenantId: TENANT, actor: ACTOR })
      expect(arg.take).toBe(10)
      expect(arg.orderBy).toEqual({ createdAt: 'desc' })
    })
  })

  describe('findByActorId', () => {
    it('queries by canonical actorId', async () => {
      const { findByActorId } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByActorId(TENANT, 'emp-uuid-12')

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where).toEqual({ tenantId: TENANT, actorId: 'emp-uuid-12' })
    })
  })

  describe('findByTarget', () => {
    it('queries by target id', async () => {
      const { findByTarget } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByTarget(TENANT, TARGET)

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where).toEqual({ tenantId: TENANT, target: TARGET })
    })
  })

  describe('findById', () => {
    it('queries by id scoped to tenant', async () => {
      const { findById } = await import('./auditRepo.js')
      mockPrisma.auditLog.findFirst.mockResolvedValue({ id: 'log-99' })

      const result = await findById(TENANT, 'log-99')

      const arg = mockPrisma.auditLog.findFirst.mock.calls[0][0]
      expect(arg.where).toEqual({ id: 'log-99', tenantId: TENANT })
      expect(result).toEqual({ id: 'log-99' })
    })
  })

  describe('findByTenant — with filters', () => {
    it('applies action + targetType filters', async () => {
      const { findByTenant } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByTenant(TENANT, { action: 'EMPLOYEE_ROLE_CHANGE', targetType: 'employee' })

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where.action).toBe('EMPLOYEE_ROLE_CHANGE')
      expect(arg.where.targetType).toBe('employee')
    })

    it('applies date range filters (since + until)', async () => {
      const { findByTenant } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByTenant(TENANT, { since: '2026-04-01', until: '2026-04-30' })

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where.createdAt.gte).toBeInstanceOf(Date)
      expect(arg.where.createdAt.lte).toBeInstanceOf(Date)
    })

    it('always scopes by tenantId even with no filters', async () => {
      const { findByTenant } = await import('./auditRepo.js')
      mockPrisma.auditLog.findMany.mockResolvedValue([])

      await findByTenant(TENANT, {})

      const arg = mockPrisma.auditLog.findMany.mock.calls[0][0]
      expect(arg.where.tenantId).toBe(TENANT)
    })
  })

  describe('countByTenant', () => {
    it('counts with same filter shape as findByTenant', async () => {
      const { countByTenant } = await import('./auditRepo.js')
      mockPrisma.auditLog.count.mockResolvedValue(42)

      const result = await countByTenant(TENANT, { action: 'REVENUE_EXPORT' })

      expect(result).toBe(42)
      const arg = mockPrisma.auditLog.count.mock.calls[0][0]
      expect(arg.where.tenantId).toBe(TENANT)
      expect(arg.where.action).toBe('REVENUE_EXPORT')
    })
  })

  // ── Immutability contract
  describe('IMMUTABILITY contract', () => {
    it('does NOT export update', async () => {
      const mod = await import('./auditRepo.js')
      expect(mod.update).toBeUndefined()
      expect(mod.updateMany).toBeUndefined()
      expect(mod.upsert).toBeUndefined()
    })

    it('does NOT export delete', async () => {
      const mod = await import('./auditRepo.js')
      expect(mod.delete).toBeUndefined()
      expect(mod.deleteMany).toBeUndefined()
      expect(mod.remove).toBeUndefined()
    })
  })
})
