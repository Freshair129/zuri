import { describe, it, expect, vi, beforeEach } from 'vitest'
import { middleware } from './middleware'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

describe('Next.js Middleware', () => {
  let req

  beforeEach(() => {
    vi.clearAllMocks()
    req = {
      nextUrl: {
        pathname: '/dashboard',
        searchParams: new URLSearchParams(),
      },
      url: 'http://localhost:3000/dashboard',
      headers: new Headers({
        host: 'vschool.zuri.app',
      }),
    }
    // Spy on NextResponse.next to capture the request modification
    vi.spyOn(NextResponse, 'next')
  })

  it('should extract tenant slug from subdomain', async () => {
    getToken.mockResolvedValue({ tenantId: 't1' })
    await middleware(req)
    
    const nextCall = vi.mocked(NextResponse.next).mock.calls[0][0]
    expect(nextCall.request.headers.get('x-tenant-slug')).toBe('vschool')
  })

  it('should redirect to login if no session is present for protected routes', async () => {
    getToken.mockResolvedValue(null)
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('should inject tenant context headers if session is present', async () => {
    getToken.mockResolvedValue({ tenantId: 'tenant-123' })
    await middleware(req)
    
    const nextCall = vi.mocked(NextResponse.next).mock.calls[0][0]
    expect(nextCall.request.headers.get('x-tenant-id')).toBe('tenant-123')
    expect(nextCall.request.headers.get('x-tenant-slug')).toBe('vschool')
  })

  it('should handle local development with tenant search param', async () => {
    req.headers.set('host', 'localhost:3000')
    req.nextUrl.searchParams.set('tenant', 'my-shop')
    getToken.mockResolvedValue({ tenantId: 't1' })

    await middleware(req)
    
    const nextCall = vi.mocked(NextResponse.next).mock.calls[0][0]
    expect(nextCall.request.headers.get('x-tenant-slug')).toBe('my-shop')
  })
})
