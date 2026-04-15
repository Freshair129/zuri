import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRole, requireAuth, withAuth } from './auth'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { can } from '@/lib/permissionMatrix'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}))

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: { adapter: {} }, // Mock authOptions as a dummy object
}))

vi.mock('@/lib/permissionMatrix', () => ({
  can: vi.fn(),
}))

vi.mock('@/lib/session-manager', () => ({
  validateSession: vi.fn().mockResolvedValue(true),
}))

describe('Auth Library Unit Tests', () => {

  describe('normalizeRole', () => {
    it('should return STAFF for null or undefined input', () => {
      expect(normalizeRole(null)).toBe('STAFF')
      expect(normalizeRole(undefined)).toBe('STAFF')
    })

    it('should pass through valid new-system roles (OWNER, DEV, STAFF)', () => {
      expect(normalizeRole('OWNER')).toBe('OWNER')
      expect(normalizeRole('DEV')).toBe('DEV')
      expect(normalizeRole('STAFF')).toBe('STAFF')
    })

    it('should map legacy MGR, ADM, HR to MANAGER', () => {
      expect(normalizeRole('MGR')).toBe('MANAGER')
      expect(normalizeRole('ADM')).toBe('MANAGER')
      expect(normalizeRole('HR')).toBe('MANAGER')
    })

    it('should map legacy SLS, AGT, MKT to SALES', () => {
      expect(normalizeRole('SLS')).toBe('SALES')
      expect(normalizeRole('AGT')).toBe('SALES')
      expect(normalizeRole('MKT')).toBe('SALES')
    })

    it('should map legacy TEC, PUR, PD to KITCHEN', () => {
      expect(normalizeRole('TEC')).toBe('KITCHEN')
      expect(normalizeRole('PUR')).toBe('KITCHEN')
      expect(normalizeRole('PD')).toBe('KITCHEN')
    })

    it('should map legacy ACC to FINANCE', () => {
      expect(normalizeRole('ACC')).toBe('FINANCE')
    })

    it('should map legacy STF to STAFF', () => {
      expect(normalizeRole('STF')).toBe('STAFF')
    })

    it('should handle case-insensitive legacy inputs', () => {
      expect(normalizeRole('mgr')).toBe('MANAGER')
      expect(normalizeRole('Sls')).toBe('SALES')
      expect(normalizeRole('acc')).toBe('FINANCE')
    })

    it('should return original value for unknown roles', () => {
      expect(normalizeRole('GHOST')).toBe('GHOST')
    })
  })

  describe('requireAuth', () => {
    it('should return session when authenticated', async () => {
      const mockSession = { user: { id: 'emp-001', sessionId: 'sid-001', email: 'test@zuri.com' } }
      getServerSession.mockResolvedValue(mockSession)

      const result = await requireAuth()
      expect(result).toEqual(mockSession)
    })

    it('should throw an Error("Unauthorized") when no session exists', async () => {
      getServerSession.mockResolvedValue(null)
      await expect(requireAuth()).rejects.toThrow('Unauthorized')
    })
  })

  describe('withAuth HOC', () => {
    const mockHandler = vi.fn().mockImplementation((req, ctx) => {
      return { success: true, user: ctx.session.user }
    })
    const req = { url: 'http://localhost/api/test' }
    const ctx = { params: {} }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return 401 when no session exists', async () => {
      getServerSession.mockResolvedValue(null)
      const protectedHandler = withAuth(mockHandler)
      
      const response = await protectedHandler(req, ctx)
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        { status: 401 }
      )
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should normalize legacy roles before permission check', async () => {
      getServerSession.mockResolvedValue({
        user: { roles: ['MGR', 'ACC'] }
      })
      can.mockReturnValue(true) // Grant permission
      
      const protectedHandler = withAuth(mockHandler, { domain: 'finance', action: 'R' })
      await protectedHandler(req, ctx)
      
      expect(can).toHaveBeenCalledWith(['MANAGER', 'FINANCE'], 'finance', 'R')
    })

    it('should map action "W" to "F" (Full/Write alias)', async () => {
      getServerSession.mockResolvedValue({
        user: { roles: ['OWNER'] }
      })
      can.mockReturnValue(true)
      
      const protectedHandler = withAuth(mockHandler, { domain: 'crm', action: 'W' })
      await protectedHandler(req, ctx)
      
      expect(can).toHaveBeenCalledWith(['OWNER'], 'crm', 'F')
    })

    it('should return 403 when permissionMatrix.can() returns false', async () => {
      getServerSession.mockResolvedValue({
        user: { roles: ['STAFF'] }
      })
      can.mockReturnValue(false)
      
      const protectedHandler = withAuth(mockHandler, { domain: 'settings', action: 'F' })
      const response = await protectedHandler(req, ctx)
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Forbidden' },
        { status: 403 }
      )
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should call handler with session injected when authorized', async () => {
      const session = { user: { name: 'Admin', roles: ['OWNER'] } }
      getServerSession.mockResolvedValue(session)
      can.mockReturnValue(true)
      
      const protectedHandler = withAuth(mockHandler, { domain: 'dashboard', action: 'R' })
      const result = await protectedHandler(req, ctx)
      
      expect(mockHandler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ session })
      )
      expect(result.user.name).toBe('Admin')
    })
  })
})
