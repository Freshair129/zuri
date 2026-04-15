import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-config'
import { can } from '@/lib/permissionMatrix'

// Re-export authOptions for modules that import it from @/lib/auth
export { authOptions }

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  // ZDEV-TSK-20260410-025: session validation for Server Components/Actions
  // TEMPORARY BYPASS (ZDEV-TSK-20260412-018)
  /*
  const isValid = await validateSession(session.user.id, session.user.sessionId)
  if (!isValid) {
    throw new Error('Session Expired')
  }
  */

  return session
}

/**
 * Legacy role mapping (ADR-068)
 * Maps old 12-role system → new 6-role system
 */
export function normalizeRole(role) {
  if (!role) return 'STAFF'
  const upper = role.toUpperCase()
  const legacyMap = {
    MGR: 'MANAGER', ADM: 'MANAGER', HR: 'MANAGER',
    SLS: 'SALES',   AGT: 'SALES',   MKT: 'SALES',
    TEC: 'KITCHEN', PUR: 'KITCHEN', PD:  'KITCHEN',
    ACC: 'FINANCE',
    STF: 'STAFF',
  }
  return legacyMap[upper] ?? upper
}

import { validateSession } from './session-manager'
import { maskPii } from './utils/masking'

/**
 * withAuth HOC for API route handlers (ADR-068)
 *
 * Action values:
 *   'R' — read (any role with R or higher on domain)
 *   'W' — write (roles with F on domain)
 *   'A' — approve (roles with A or higher on domain)
 *   'F' — full (same as W, convenience alias)
 *
 * Usage:
 *   export const GET = withAuth(handler, { domain: 'customers', action: 'R', maskPii: true })
 *   export const PATCH = withAuth(handler, { domain: 'customers', action: 'W' })
 */
export function withAuth(handler, { domain, action = 'R', maskPii: shouldMask = false } = {}) {
  return async function (request, context) {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ZDEV-TSK-20260410-025: Enforce Session Pinning & Concurrent Control
    // Verify if the session is still active in the database (not revoked)
    // TEMPORARY BYPASS (ZDEV-TSK-20260412-018)
    /*
    const isValid = await validateSession(session.user.id, session.user.sessionId)
    if (!isValid) {
      return NextResponse.json({ 
        error: 'Session Expired', 
        code: 'SESSION_REVOKED',
        message: 'Your session has been terminated (max 2 sessions exceeded or forced logout).'
      }, { status: 401 })
    }
    */

    const roles = (session.user.roles ?? []).map(normalizeRole)

    if (domain) {
      // Map action aliases: 'W' and 'F' both require full-write level
      const matrixAction = action === 'W' ? 'F' : action
      const allowed = can(roles, domain, matrixAction)
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    try {
      const { withTenantContext } = await import('./tenantContext')
      
      return withTenantContext(session.user.tenantId, async () => {
        const response = await handler(request, { ...context, session })

        // Apply PII masking if requested and response is successful JSON
        if (shouldMask && response.status >= 200 && response.status < 300) {
          try {
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
              const body = await response.json()
              const maskedData = maskPii(body, roles)
              return NextResponse.json(maskedData, { status: response.status })
            }
          } catch (err) {
            console.error('[withAuth] Masking error:', err)
          }
        }

        return response
      })
    } catch (error) {
      console.error('[withAuth] Global Error Handler:', error)
      return NextResponse.json({ 
        error: error.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 })
    }
  }
}
