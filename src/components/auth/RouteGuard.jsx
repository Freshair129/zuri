'use client'
// Created At: 2026-04-10 04:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:30:00 +07:00 (v1.0.0)
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermission } from '@/hooks/usePermission'
import { useSession } from 'next-auth/react'

/**
 * Client-side route guard HOC.
 * Renders children only when the user has the required permission.
 * Redirects to /overview on forbidden, /login when unauthenticated.
 *
 * Usage:
 *   <RouteGuard domain="employees" action="R">
 *     <EmployeesPage />
 *   </RouteGuard>
 *
 * Or as a HOC:
 *   export default withRouteGuard(EmployeesPage, { domain: 'employees', action: 'R' })
 *
 * @param {string} domain  - permission domain (customers, inbox, kitchen…)
 * @param {'R'|'A'|'F'} action  - minimum required level
 * @param {React.ReactNode} children
 * @param {React.ReactNode} [fallback]  - shown while loading (default: null)
 */
export function RouteGuard({ domain, action = 'R', children, fallback = null }) {
  const router = useRouter()
  const { status } = useSession()
  const allowed = usePermission(domain, action)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/overview?error=forbidden')
    }
  }, [status, allowed, router])

  if (status === 'loading') return fallback
  if (status === 'unauthenticated') return fallback
  if (!allowed) return fallback

  return children
}

/**
 * Higher-order component variant.
 *
 * @param {React.ComponentType} Component
 * @param {{ domain: string, action?: string }} opts
 */
export function withRouteGuard(Component, { domain, action = 'R' }) {
  function GuardedComponent(props) {
    return (
      <RouteGuard domain={domain} action={action}>
        <Component {...props} />
      </RouteGuard>
    )
  }
  GuardedComponent.displayName = `RouteGuard(${Component.displayName ?? Component.name ?? 'Component'})`
  return GuardedComponent
}
