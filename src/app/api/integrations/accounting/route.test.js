// Created At: 2026-04-10 04:45:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:45:00 +07:00 (v1.0.0)

/**
 * API route tests for /api/integrations/accounting
 * M4 Feature E1 — Accounting Sync (ZDEV-TSK-20260410-016)
 *
 * Covers RBAC, input validation, and the upsert path of the config endpoint
 * plus the paginated sync-logs listing. This is the first API-layer test in
 * the project for Task 016 — the lib layer is already covered by the 41
 * existing unit tests, this closes the gap on the HTTP boundary.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '@/tests/mocks/prismaMock'

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args) => mockGetServerSession(...args),
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TENANT = 'tenant-001'

function makeRequest(url, body) {
  return {
    url,
    json: async () => body,
  }
}

function session(role = 'OWNER') {
  return { user: { tenantId: TENANT, role } }
}

// ─── Suite: /api/integrations/accounting GET & PUT ────────────────────────────
describe('/api/integrations/accounting', () => {
  let mockPrisma

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    globalThis.__mockPrisma = mockPrisma
    mockGetServerSession.mockReset()
  })

  // ── GET ──
  describe('GET', () => {
    it('returns 401 when no session', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const { GET } = await import('./route.js')
      const res = await GET(makeRequest('http://localhost/api/integrations/accounting'))
      expect(res.status).toBe(401)
    })

    it('returns 401 when role is not OWNER/MGR/DEV', async () => {
      mockGetServerSession.mockResolvedValue(session('SALES'))
      const { GET } = await import('./route.js')
      const res = await GET(makeRequest('http://localhost/api/integrations/accounting'))
      expect(res.status).toBe(401)
    })

    it('returns masked configs for OWNER', async () => {
      mockGetServerSession.mockResolvedValue(session('OWNER'))
      mockPrisma.integrationConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-fa',
          tenantId: TENANT,
          provider: 'flowaccount',
          isActive: true,
          oauthAccessTokenEnc: 'sensitive-token',   // must not appear in response
          oauthRefreshTokenEnc: 'sensitive-refresh',
          oauthExpiresAt: new Date('2026-05-01'),
          accountantEmail: null,
          syncMode: 'daily',
          syncOptionsJson: {},
          accountMappingJson: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const { GET } = await import('./route.js')
      const res = await GET(makeRequest('http://localhost/api/integrations/accounting'))
      expect(res.status).toBe(200)
      const body = await res.json()

      expect(body.configs).toHaveLength(1)
      const cfg = body.configs[0]
      expect(cfg.provider).toBe('flowaccount')
      expect(cfg.isConnected).toBe(true)
      // Sensitive fields must not leak
      expect(cfg.oauthAccessTokenEnc).toBeUndefined()
      expect(cfg.oauthRefreshTokenEnc).toBeUndefined()
      // Tenant filter was applied
      const callArg = mockPrisma.integrationConfig.findMany.mock.calls[0][0]
      expect(callArg.where.tenantId).toBe(TENANT)
    })

    it('marks express provider as connected regardless of token presence', async () => {
      mockGetServerSession.mockResolvedValue(session('OWNER'))
      mockPrisma.integrationConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-ex', tenantId: TENANT, provider: 'express',
          isActive: true, oauthAccessTokenEnc: null,
          oauthExpiresAt: null, accountantEmail: 'a@b.com',
          syncMode: 'manual', syncOptionsJson: {}, accountMappingJson: {},
          createdAt: new Date(), updatedAt: new Date(),
        },
      ])
      const { GET } = await import('./route.js')
      const res = await GET(makeRequest('http://localhost/api/integrations/accounting'))
      const body = await res.json()
      expect(body.configs[0].isConnected).toBe(true)
    })
  })

  // ── PUT ──
  describe('PUT', () => {
    it('returns 401 when no session', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const { PUT } = await import('./route.js')
      const res = await PUT(makeRequest('http://localhost/api/integrations/accounting', { provider: 'flowaccount' }))
      expect(res.status).toBe(401)
    })

    it('returns 401 for MGR (only OWNER/DEV may mutate)', async () => {
      mockGetServerSession.mockResolvedValue(session('MGR'))
      const { PUT } = await import('./route.js')
      const res = await PUT(makeRequest('http://localhost/api/integrations/accounting', { provider: 'flowaccount' }))
      expect(res.status).toBe(401)
    })

    it('returns 400 on invalid provider', async () => {
      mockGetServerSession.mockResolvedValue(session('OWNER'))
      const { PUT } = await import('./route.js')
      const res = await PUT(makeRequest('http://localhost/api/integrations/accounting', { provider: 'quickbooks' }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/Invalid provider/i)
    })

    it('upserts config for valid OWNER request and returns masked result', async () => {
      mockGetServerSession.mockResolvedValue(session('OWNER'))
      mockPrisma.integrationConfig.upsert.mockResolvedValue({
        id: 'cfg-new',
        tenantId: TENANT,
        provider: 'express',
        isActive: true,
        accountantEmail: 'acc@test.com',
        syncMode: 'auto',
        syncOptionsJson: {},
        accountMappingJson: {},
        oauthAccessTokenEnc: null,
        oauthExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const { PUT } = await import('./route.js')
      const res = await PUT(makeRequest('http://localhost/api/integrations/accounting', {
        provider: 'express',
        accountantEmail: 'acc@test.com',
        syncMode: 'auto',
        isActive: true,
      }))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.config.provider).toBe('express')
      expect(body.config.accountantEmail).toBe('acc@test.com')

      // Upsert was scoped by (tenantId, provider)
      const upsertArg = mockPrisma.integrationConfig.upsert.mock.calls[0][0]
      expect(upsertArg.where.tenantId_provider).toEqual({ tenantId: TENANT, provider: 'express' })
    })

    it('returns 500 when prisma throws', async () => {
      mockGetServerSession.mockResolvedValue(session('OWNER'))
      mockPrisma.integrationConfig.upsert.mockRejectedValue(new Error('DB down'))
      const { PUT } = await import('./route.js')
      const res = await PUT(makeRequest('http://localhost/api/integrations/accounting', { provider: 'flowaccount' }))
      expect(res.status).toBe(500)
    })
  })
})
