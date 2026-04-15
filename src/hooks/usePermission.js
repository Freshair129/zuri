import { useSession } from 'next-auth/react'
import { can } from '@/lib/permissionMatrix'

const LEGACY_ROLE_MAP = {
  MGR: 'MANAGER', ADM: 'MANAGER', HR: 'MANAGER',
  SLS: 'SALES',   AGT: 'SALES',   MKT: 'SALES',
  TEC: 'KITCHEN', PUR: 'KITCHEN', PD:  'KITCHEN',
  ACC: 'FINANCE',
  STF: 'STAFF',
}

function normalizeRole(r) {
  if (!r) return 'STAFF'
  const upper = r.toUpperCase()
  return LEGACY_ROLE_MAP[upper] ?? upper
}

/**
 * Returns true if the current user has permission to perform `action` on `domain`.
 *
 * @param {string} domain - e.g. 'orders', 'customers', 'inbox'
 * @param {'R'|'A'|'F'} action - R=read, A=approve, F=full
 * @returns {boolean}
 */
export function usePermission(domain, action = 'R') {
  const { data: session, status } = useSession()

  if (status === 'loading' || !session) return false

  const roles = (session.user.roles ?? [session.user.role]).filter(Boolean).map(normalizeRole)
  return can(roles, domain, action)
}
