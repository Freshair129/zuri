import { describe, it, expect, vi } from 'vitest'
import { useSession } from './useSession'
import { useSession as useNextAuthSession } from 'next-auth/react'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

describe('useSession hook', () => {
  describe('Authentication States', () => {
    it('should return loading state when status is loading', () => {
      useNextAuthSession.mockReturnValue({
        data: null,
        status: 'loading'
      })

      const result = useSession()

      expect(result).toEqual({
        user: null,
        roles: [],
        tenantId: null,
        isLoading: true
      })
    })

    it('should return user data and roles when authenticated', () => {
      const mockUser = {
        id: 'user-123',
        name: 'Test Admin',
        email: 'admin@zuri.com',
        roles: ['OWNER', 'MANAGER'],
        tenantId: 'TENANT-001'
      }

      useNextAuthSession.mockReturnValue({
        data: { user: mockUser },
        status: 'authenticated'
      })

      const result = useSession()

      expect(result).toEqual({
        user: mockUser,
        roles: ['OWNER', 'MANAGER'],
        tenantId: 'TENANT-001',
        isLoading: false
      })
    })

    it('should return nulls when unauthenticated', () => {
      useNextAuthSession.mockReturnValue({
        data: null,
        status: 'unauthenticated'
      })

      const result = useSession()

      expect(result).toEqual({
        user: null,
        roles: [],
        tenantId: null,
        isLoading: false
      })
    })
  })

  describe('Edge Cases & Fallbacks', () => {
    it('should handle missing roles in session user object', () => {
      useNextAuthSession.mockReturnValue({
        data: {
          user: { id: 'user-1', name: 'No Roles' }
          // roles property is missing
        },
        status: 'authenticated'
      })

      const result = useSession()

      expect(result.roles).toEqual([])
      expect(result.user.name).toBe('No Roles')
    })

    it('should handle missing tenantId in session user object', () => {
      useNextAuthSession.mockReturnValue({
        data: {
          user: { id: 'user-1', roles: ['STAFF'] }
          // tenantId property is missing
        },
        status: 'authenticated'
      })

      const result = useSession()

      expect(result.tenantId).toBe(null)
    })

    it('should handle undefined return from next-auth (SSR/Missing Provider fallback)', () => {
      // During SSR or if SessionProvider is missing, useNextAuthSession() can return undefined
      useNextAuthSession.mockReturnValue(undefined)

      const result = useSession()

      expect(result).toEqual({
        user: null,
        roles: [],
        tenantId: null,
        isLoading: true // Defaults to loading
      })
    })
  })
})
