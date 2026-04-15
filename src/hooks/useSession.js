import { useSession as useNextAuthSession } from 'next-auth/react'

/**
 * Wraps next-auth useSession.
 * Returns { user, roles, tenantId, isLoading }
 */
export function useSession() {
  const result = useNextAuthSession()

  // During SSR prerendering, useSession may return undefined (no SessionProvider)
  const session = result?.data ?? null
  const status = result?.status ?? 'loading'

  const isLoading = status === 'loading'
  const user = session?.user ?? null
  const roles = session?.user?.roles ?? []
  const tenantId = session?.user?.tenantId ?? null

  return { user, roles, tenantId, isLoading }
}
