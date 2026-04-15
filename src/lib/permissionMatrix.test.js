// Created At: 2026-04-10 05:40:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:40:00 +07:00 (v1.0.0)

/**
 * permissionMatrix — can() truth-table tests
 * M6 Feature D1 RBAC Enforcement (ZDEV-TSK-20260410-023)
 *
 * Exhaustively validates the ADR-068 Persona-Based RBAC matrix:
 * 7 roles (DEV + 6 personas) × 9 domains × 3 action levels (R/A/F).
 *
 * The matrix is the source of truth for every page-level check in
 * middleware.js and every API-level check via withAuth(). A regression
 * here is a security-grade incident, so coverage is intentionally broad.
 */

import { describe, it, expect } from 'vitest'
import { can, permissionMatrix, PERMISSIONS } from './permissionMatrix.js'

describe('permissionMatrix — shape', () => {
  it('exports both permissionMatrix and legacy PERMISSIONS alias', () => {
    expect(permissionMatrix).toBeDefined()
    expect(PERMISSIONS).toBe(permissionMatrix)
  })

  it('defines all 7 canonical roles', () => {
    const expected = ['DEV', 'OWNER', 'MANAGER', 'SALES', 'KITCHEN', 'FINANCE', 'STAFF']
    expect(Object.keys(permissionMatrix).sort()).toEqual(expected.sort())
  })

  it('every role defines all 10 domains', () => {
    const expectedDomains = [
      'dashboard', 'customers', 'inbox', 'marketing',
      'kitchen', 'orders', 'employees', 'accounting', 'audit', 'system',
    ].sort()
    for (const role of Object.keys(permissionMatrix)) {
      expect(Object.keys(permissionMatrix[role]).sort(), `role=${role}`)
        .toEqual(expectedDomains)
    }
  })

  it('every cell is one of F/A/R/N', () => {
    const valid = new Set(['F', 'A', 'R', 'N'])
    for (const [role, domains] of Object.entries(permissionMatrix)) {
      for (const [domain, level] of Object.entries(domains)) {
        expect(valid.has(level), `${role}.${domain}=${level}`).toBe(true)
      }
    }
  })
})

describe('can() — level hierarchy', () => {
  // Level ranking: F(3) > A(2) > R(1) > N(0)
  // Higher levels satisfy lower-level checks, never the reverse.

  it('F satisfies R, A, and F checks', () => {
    expect(can('MANAGER', 'inbox', 'R')).toBe(true)
    expect(can('MANAGER', 'inbox', 'A')).toBe(true)
    expect(can('MANAGER', 'inbox', 'F')).toBe(true)
  })

  it('A satisfies R and A but NOT F', () => {
    expect(can('OWNER', 'orders', 'R')).toBe(true)
    expect(can('OWNER', 'orders', 'A')).toBe(true)
    expect(can('OWNER', 'orders', 'F')).toBe(false)
  })

  it('R satisfies only R', () => {
    expect(can('OWNER', 'dashboard', 'R')).toBe(true)
    expect(can('OWNER', 'dashboard', 'A')).toBe(false)
    expect(can('OWNER', 'dashboard', 'F')).toBe(false)
  })

  it('N blocks all actions', () => {
    expect(can('SALES', 'kitchen', 'R')).toBe(false)
    expect(can('SALES', 'kitchen', 'A')).toBe(false)
    expect(can('SALES', 'kitchen', 'F')).toBe(false)
  })
})

describe('can() — DEV role has universal access', () => {
  const domains = [
    'dashboard', 'customers', 'inbox', 'marketing',
    'kitchen', 'orders', 'employees', 'accounting', 'audit', 'system',
  ]
  const actions = ['R', 'A', 'F']

  for (const domain of domains) {
    for (const action of actions) {
      it(`DEV can ${action} on ${domain}`, () => {
        expect(can('DEV', domain, action)).toBe(true)
      })
    }
  }
})

describe('can() — OWNER persona', () => {
  it('can read (but not full-write) dashboard, customers, inbox, marketing, kitchen, employees, accounting', () => {
    const readOnly = ['dashboard', 'customers', 'inbox', 'marketing', 'kitchen', 'employees', 'accounting']
    for (const d of readOnly) {
      expect(can('OWNER', d, 'R'), `OWNER.${d} R`).toBe(true)
      expect(can('OWNER', d, 'F'), `OWNER.${d} F`).toBe(false)
    }
  })

  it('has APPROVE on orders (M4-A3 human gate)', () => {
    expect(can('OWNER', 'orders', 'A')).toBe(true)
    expect(can('OWNER', 'orders', 'F')).toBe(false)
  })

  it('is blocked from system domain (DEV only)', () => {
    expect(can('OWNER', 'system', 'R')).toBe(false)
    expect(can('OWNER', 'system', 'F')).toBe(false)
  })
})

describe('can() — MANAGER persona', () => {
  it('has FULL access to operational domains', () => {
    const full = ['dashboard', 'customers', 'inbox', 'marketing', 'kitchen', 'orders', 'employees']
    for (const d of full) {
      expect(can('MANAGER', d, 'F'), `MANAGER.${d} F`).toBe(true)
    }
  })

  it('can only READ accounting (not modify)', () => {
    expect(can('MANAGER', 'accounting', 'R')).toBe(true)
    expect(can('MANAGER', 'accounting', 'F')).toBe(false)
  })

  it('is blocked from system domain', () => {
    expect(can('MANAGER', 'system', 'R')).toBe(false)
  })
})

describe('can() — SALES persona', () => {
  it('has FULL customers, inbox, marketing, orders', () => {
    expect(can('SALES', 'customers', 'F')).toBe(true)
    expect(can('SALES', 'inbox',     'F')).toBe(true)
    expect(can('SALES', 'marketing', 'F')).toBe(true)
    expect(can('SALES', 'orders',    'F')).toBe(true)
  })

  it('can READ dashboard', () => {
    expect(can('SALES', 'dashboard', 'R')).toBe(true)
    expect(can('SALES', 'dashboard', 'F')).toBe(false)
  })

  it('is BLOCKED from kitchen, employees, accounting, system', () => {
    expect(can('SALES', 'kitchen',    'R')).toBe(false)
    expect(can('SALES', 'employees',  'R')).toBe(false)
    expect(can('SALES', 'accounting', 'R')).toBe(false)
    expect(can('SALES', 'system',     'R')).toBe(false)
  })
})

describe('can() — KITCHEN persona', () => {
  it('has FULL kitchen only', () => {
    expect(can('KITCHEN', 'kitchen', 'F')).toBe(true)
  })

  it('can READ dashboard only (no customer or inbox access)', () => {
    expect(can('KITCHEN', 'dashboard', 'R')).toBe(true)
    expect(can('KITCHEN', 'customers', 'R')).toBe(false)
    expect(can('KITCHEN', 'inbox',     'R')).toBe(false)
  })

  it('is BLOCKED from marketing, orders, employees, accounting, system', () => {
    expect(can('KITCHEN', 'marketing',  'R')).toBe(false)
    expect(can('KITCHEN', 'orders',     'R')).toBe(false)
    expect(can('KITCHEN', 'employees',  'R')).toBe(false)
    expect(can('KITCHEN', 'accounting', 'R')).toBe(false)
    expect(can('KITCHEN', 'system',     'R')).toBe(false)
  })
})

describe('can() — FINANCE persona', () => {
  it('has FULL accounting only', () => {
    expect(can('FINANCE', 'accounting', 'F')).toBe(true)
  })

  it('can READ dashboard, customers, orders', () => {
    expect(can('FINANCE', 'dashboard', 'R')).toBe(true)
    expect(can('FINANCE', 'customers', 'R')).toBe(true)
    expect(can('FINANCE', 'orders',    'R')).toBe(true)
  })

  it('cannot MODIFY orders or customers', () => {
    expect(can('FINANCE', 'orders',    'F')).toBe(false)
    expect(can('FINANCE', 'customers', 'F')).toBe(false)
  })

  it('is BLOCKED from inbox, marketing, kitchen, employees, system', () => {
    expect(can('FINANCE', 'inbox',     'R')).toBe(false)
    expect(can('FINANCE', 'marketing', 'R')).toBe(false)
    expect(can('FINANCE', 'kitchen',   'R')).toBe(false)
    expect(can('FINANCE', 'employees', 'R')).toBe(false)
    expect(can('FINANCE', 'system',    'R')).toBe(false)
  })
})

describe('can() — STAFF persona (least privilege)', () => {
  it('has no FULL access anywhere', () => {
    const domains = [
      'dashboard', 'customers', 'inbox', 'marketing',
      'kitchen', 'orders', 'employees', 'accounting', 'audit', 'system',
    ]
    for (const d of domains) {
      expect(can('STAFF', d, 'F'), `STAFF.${d} F`).toBe(false)
    }
  })

  it('can READ dashboard, customers, inbox, kitchen, orders', () => {
    expect(can('STAFF', 'dashboard', 'R')).toBe(true)
    expect(can('STAFF', 'customers', 'R')).toBe(true)
    expect(can('STAFF', 'inbox',     'R')).toBe(true)
    expect(can('STAFF', 'kitchen',   'R')).toBe(true)
    expect(can('STAFF', 'orders',    'R')).toBe(true)
  })

  it('is BLOCKED from marketing, employees, accounting, system', () => {
    expect(can('STAFF', 'marketing',  'R')).toBe(false)
    expect(can('STAFF', 'employees',  'R')).toBe(false)
    expect(can('STAFF', 'accounting', 'R')).toBe(false)
    expect(can('STAFF', 'system',     'R')).toBe(false)
  })
})

describe('can() — audit domain (ZDEV-TSK-20260410-026)', () => {
  it('DEV has FULL access to audit', () => {
    expect(can('DEV', 'audit', 'F')).toBe(true)
  })

  it('OWNER and MANAGER can READ audit (compliance viewers)', () => {
    expect(can('OWNER',   'audit', 'R')).toBe(true)
    expect(can('MANAGER', 'audit', 'R')).toBe(true)
  })

  it('OWNER and MANAGER cannot write audit (immutable)', () => {
    expect(can('OWNER',   'audit', 'F')).toBe(false)
    expect(can('MANAGER', 'audit', 'F')).toBe(false)
    expect(can('OWNER',   'audit', 'A')).toBe(false)
    expect(can('MANAGER', 'audit', 'A')).toBe(false)
  })

  it('SALES, KITCHEN, FINANCE, STAFF cannot read audit', () => {
    for (const role of ['SALES', 'KITCHEN', 'FINANCE', 'STAFF']) {
      expect(can(role, 'audit', 'R'), `${role}.audit R`).toBe(false)
    }
  })
})

describe('can() — multi-role (any-role-wins)', () => {
  it('returns true when ANY role in the list can perform the action', () => {
    // User has both KITCHEN and SALES — needs inbox.R (SALES grants it)
    expect(can(['KITCHEN', 'SALES'], 'inbox', 'R')).toBe(true)
  })

  it('returns false when no role in the list has permission', () => {
    // Neither SALES nor STAFF can write to accounting
    expect(can(['SALES', 'STAFF'], 'accounting', 'F')).toBe(false)
  })

  it('promotes to highest level available across roles', () => {
    // MANAGER.orders=F so any list including MANAGER grants orders F
    expect(can(['STAFF', 'MANAGER'], 'orders', 'F')).toBe(true)
  })

  it('accepts a single string as a one-item role list', () => {
    expect(can('MANAGER', 'inbox', 'F')).toBe(true)
  })
})

describe('can() — edge cases', () => {
  it('returns false for unknown role', () => {
    expect(can('HACKER', 'orders', 'R')).toBe(false)
  })

  it('returns false for unknown domain', () => {
    expect(can('MANAGER', 'nuclear_launch', 'F')).toBe(false)
  })

  it('defaults action to R when omitted', () => {
    expect(can('MANAGER', 'dashboard')).toBe(true)
  })

  it('returns false for empty roles array', () => {
    expect(can([], 'inbox', 'R')).toBe(false)
  })

  it('returns false when a role entry is null', () => {
    expect(can([null], 'inbox', 'R')).toBe(false)
  })

  it('returns false when roles itself is null (non-array input)', () => {
    // Array.isArray(null) → false, wraps as [null] → findable as invalid role
    expect(can(null, 'dashboard', 'R')).toBe(false)
  })

  it('returns false when domain is null', () => {
    expect(can('DEV', null, 'R')).toBe(false)
  })

  it('returns false for domains that look similar but are wrong (pos vs orders)', () => {
    // Guard against copy-paste errors with the domain name
    expect(can('DEV', 'pos',        'R')).toBe(false)   // correct is 'orders'
    expect(can('DEV', 'finance',    'R')).toBe(false)   // correct is 'accounting'
    expect(can('DEV', 'enrollment', 'R')).toBe(false)
    expect(can('DEV', 'tasks',      'R')).toBe(false)
  })

  it('grants permission when one role in a mixed array is valid', () => {
    // Non-existent roles should be ignored, valid ones should still grant
    expect(can(['NON_EXISTENT', 'OWNER'], 'dashboard', 'R')).toBe(true)
  })
})
