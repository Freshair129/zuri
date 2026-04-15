// Created At: 2026-04-12 06:15:00 +07:00 (v4.1.0-SHIELDED)
// Previous version: 2026-04-12 06:15:00 +07:00 (v4.1.0-SHIELDED)
// Last Updated: 2026-04-12 23:55:00 +07:00 (v5.0.0)
//
// v5.0.0: Restored Auth Gate + Page RBAC + Safety Net (ZDEV-TSK-20260412-022)
// Closes: INC-20260412-004

import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const ZURI_ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'zuri.app'

// Inlined permission matrix — avoid transitive imports in Edge runtime
const permissionMatrix = {
  DEV:     { dashboard: 'F', customers: 'F', inbox: 'F', marketing: 'F', kitchen: 'F', orders: 'F', employees: 'F', accounting: 'F', audit: 'F', system: 'F', enrollments: 'F' },
  OWNER:   { dashboard: 'F', customers: 'F', inbox: 'F', marketing: 'F', kitchen: 'F', orders: 'A', employees: 'F', accounting: 'F', audit: 'R', system: 'N', enrollments: 'F' },
  MANAGER: { dashboard: 'F', customers: 'F', inbox: 'F', marketing: 'F', kitchen: 'F', orders: 'F', employees: 'F', accounting: 'R', audit: 'R', system: 'N', enrollments: 'F' },
  SALES:   { dashboard: 'R', customers: 'F', inbox: 'F', marketing: 'F', kitchen: 'N', orders: 'F', employees: 'N', accounting: 'N', audit: 'N', system: 'N', enrollments: 'F' },
  KITCHEN: { dashboard: 'R', customers: 'N', inbox: 'N', marketing: 'N', kitchen: 'F', orders: 'N', employees: 'N', accounting: 'N', audit: 'N', system: 'N', enrollments: 'N' },
  FINANCE: { dashboard: 'R', customers: 'R', inbox: 'N', marketing: 'N', kitchen: 'N', orders: 'R', employees: 'N', accounting: 'F', audit: 'N', system: 'N', enrollments: 'R' },
  STAFF:   { dashboard: 'R', customers: 'R', inbox: 'R', marketing: 'N', kitchen: 'R', orders: 'R', employees: 'N', accounting: 'N', audit: 'N', system: 'N', enrollments: 'R' },
}

// Page-level ACL — ordered: more specific prefixes first
const PAGE_ACL = [
  { prefix: '/marketing/campaign-tracker', domain: 'marketing',  action: 'F' },
  { prefix: '/audit',                      domain: 'audit',      action: 'R' },
  { prefix: '/employees',                  domain: 'employees',  action: 'R' },
  { prefix: '/integrations',               domain: 'accounting', action: 'R' },
  { prefix: '/kitchen',                    domain: 'kitchen',    action: 'R' },
  { prefix: '/marketing',                  domain: 'marketing',  action: 'R' },
  { prefix: '/tenants',                    domain: 'system',     action: 'F' },
]

const LEGACY_MAP = {
  MGR: 'MANAGER', ADM: 'MANAGER', HR: 'MANAGER',
  SLS: 'SALES',   AGT: 'SALES',   MKT: 'SALES',
  TEC: 'KITCHEN', PUR: 'KITCHEN', PD:  'KITCHEN',
  ACC: 'FINANCE',
  STF: 'STAFF',
}

function normalizeRoles(roles) {
  return (roles ?? []).map(r => {
    const u = r?.toUpperCase()
    return LEGACY_MAP[u] ?? u
  })
}

function canCheck(roles, domain, action = 'R') {
  const roleList = Array.isArray(roles) ? roles : [roles]
  const levels = { N: 0, R: 1, A: 2, F: 3 }
  return roleList.some(role => {
    const perm = permissionMatrix[role]?.[domain]
    return perm && levels[perm] >= levels[action]
  })
}

/**
 * Dynamic Subdomain Extraction
 * Supports: tenant.localhost:3000, tenant.zuri10.vercel.app, tenant.zuri.app
 */
function extractSubdomain(host) {
  if (!host) return null
  const hostname = host.split(':')[0]
  const parts = hostname.split('.')

  if (hostname.includes('localhost')) {
    return parts.length > 1 ? parts[0] : null
  }
  if (hostname.endsWith('.vercel.app')) {
    return parts.length > 3 ? parts.slice(0, parts.length - 3).join('.') : null
  }
  return parts.length > 2 ? parts.slice(0, parts.length - 2).join('.') : null
}

export async function middleware(req) {
  try {
    const { pathname } = req.nextUrl
    const host = req.headers.get('host') || ''

    // Skip — Next.js internals & static files
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/internal') ||
      pathname === '/favicon.ico' ||
      pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Auth API routes — always pass through, inject tenant slug only
    if (pathname.startsWith('/api/auth')) {
      const slug = extractSubdomain(host) ?? req.nextUrl.searchParams.get('tenant') ?? 'vschool'
      const headers = new Headers(req.headers)
      headers.set('x-tenant-slug', slug)
      return NextResponse.next({ request: { headers } })
    }

    // Public API & pages — no auth required
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/join') ||               // FEAT21: public invite acceptance page
      pathname.startsWith('/api/team/join') ||       // FEAT21: public join POST endpoint
      pathname.startsWith('/api/team/invite/') ||    // FEAT21: public token validation GET
      pathname.startsWith('/api/admin/') ||          // Admin scripts — secret-protected internally
      pathname.startsWith('/api/tenant/config') // Required for public branding / TenantContext
    ) {
      if (pathname.startsWith('/api/tenant/config')) {
        const slug = extractSubdomain(host) ?? req.nextUrl.searchParams.get('tenant') ?? 'vschool'
        const headers = new Headers(req.headers)
        headers.set('x-tenant-slug', slug)
        return NextResponse.next({ request: { headers } })
      }
      return NextResponse.next()
    }

    let slug = extractSubdomain(host)
    if (!slug) {
      slug = req.nextUrl.searchParams.get('tenant') || 'vschool'
    }

    // Get JWT token
    let token = null
    try {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    } catch (err) {
      console.error('[Middleware] Token error', err)
    }

    // [AUTH GATE] Redirect unauthenticated users to /login
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // [TENANT PINNING] Block cross-tenant access & Session validation
    if (!token.tenantId || !token.tenantSlug) {
      console.error(`[Middleware] Malformed Session: User(${token.email}) missing tenant metadata.`)
      return NextResponse.redirect(new URL('/login?error=session_corrupt', req.url))
    }

    if (slug !== 'vschool' && token.tenantSlug !== slug) {
      console.warn(`[Middleware] Tenant Mismatch: User(${token.email}) session(${token.tenantSlug}) vs Request(${slug})`)
      
      // Redirect to their assigned subdomain if mismatch occurs
      const url = req.nextUrl.clone()
      const hostname = host.split(':')[0]
      const currentRoot = slug ? hostname.replace(`${slug}.`, '') : hostname
      url.hostname = `${token.tenantSlug}.${currentRoot}`
      return NextResponse.redirect(url)
    }

    // [PAGE RBAC] Block unauthorized roles from restricted pages
    const pageAcl = PAGE_ACL.find(({ prefix }) => pathname.startsWith(prefix))
    if (pageAcl) {
      const normalizedRoles = normalizeRoles(token.roles)
      if (!canCheck(normalizedRoles, pageAcl.domain, pageAcl.action)) {
        console.warn(`[Middleware] RBAC Blocked: roles(${normalizedRoles}) → ${pathname}`)
        return NextResponse.redirect(new URL('/overview?error=forbidden', req.url))
      }
    }

    // Inject tenant context headers
    const headers = new Headers(req.headers)
    headers.set('x-tenant-slug', slug)
    if (token?.tenantId) {
      headers.set('x-tenant-id', token.tenantId)
    }

    return NextResponse.next({ request: { headers } })

  } catch (err) {
    // SAFETY NET: Never crash the Edge Runtime — fail-open with logging
    console.error('[Middleware] Unhandled error — fail-open:', err?.message || err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
