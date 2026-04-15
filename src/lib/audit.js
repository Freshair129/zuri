// Created At: 2026-04-10 07:35:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 07:35:00 +07:00 (v1.0.0)

/**
 * Audit helper — request metadata extraction + sensitive-action logger.
 * M6 Feature D4 (ZDEV-TSK-20260410-026).
 *
 * Why a thin wrapper around auditRepo?
 *   1. Keeps every API route's audit call to a single line.
 *   2. Centralizes IP / userAgent extraction so we never miss a header
 *      variant (Vercel uses x-forwarded-for; some proxies use x-real-ip).
 *   3. Normalizes the actor label across the codebase: prefers
 *      `EMP-<id>` form so audit search by actor stays consistent.
 *
 * IMPORTANT: never throw from this module — a logging failure must not
 * break the user-facing action. Errors are logged but swallowed.
 */

import * as auditRepo from '@/lib/repositories/auditRepo'

const ACTIONS = Object.freeze({
  // Employee management
  EMPLOYEE_ROLE_CHANGE:     'EMPLOYEE_ROLE_CHANGE',
  EMPLOYEE_STATUS_CHANGE:   'EMPLOYEE_STATUS_CHANGE',
  EMPLOYEE_PASSWORD_CHANGE: 'EMPLOYEE_PASSWORD_CHANGE',
  EMPLOYEE_DELETE:          'EMPLOYEE_DELETE',

  // Integrations / accounting
  INTEGRATION_TOGGLE:       'INTEGRATION_TOGGLE',
  INTEGRATION_CONNECT:      'INTEGRATION_CONNECT',
  INTEGRATION_DISCONNECT:   'INTEGRATION_DISCONNECT',
  REVENUE_EXPORT:           'REVENUE_EXPORT',

  // Marketing / Meta Ads
  AD_TOGGLE:                'AD_TOGGLE',
  AD_BULK_TOGGLE:           'AD_BULK_TOGGLE',

  // Tenant / system
  TENANT_CONFIG_CHANGE:     'TENANT_CONFIG_CHANGE',
  IMPERSONATE_TENANT:       'IMPERSONATE_TENANT',
})

export { ACTIONS as AUDIT_ACTIONS }

/**
 * Pull IP + userAgent from a Next.js Request. Resilient to header casing
 * and missing values. Returns `{ ipAddress, userAgent }`.
 */
export function extractRequestMeta(request) {
  if (!request || !request.headers) {
    return { ipAddress: null, userAgent: null }
  }

  const headers = request.headers
  const get = (k) => (typeof headers.get === 'function' ? headers.get(k) : headers[k])

  // Vercel / most proxies set x-forwarded-for as a comma-separated list,
  // with the original client first.
  const xff = get('x-forwarded-for')
  const ipAddress = xff
    ? String(xff).split(',')[0].trim()
    : get('x-real-ip') ?? get('cf-connecting-ip') ?? null

  const userAgent = get('user-agent') ?? null

  return { ipAddress, userAgent }
}

/**
 * Build a stable actor label from a NextAuth session.
 * Prefers `EMP-<id>` for consistent search; falls back to email or 'system'.
 */
export function actorFromSession(session) {
  if (!session?.user) return { actor: 'system', actorId: null, actorRole: null }
  const u = session.user
  const actorId = u.id ?? u.employeeId ?? null
  const role = Array.isArray(u.roles) ? u.roles[0] : u.role
  const actor = actorId ? `EMP-${actorId}` : (u.email ?? 'unknown')
  return { actor, actorId, actorRole: role ?? null }
}

/**
 * One-shot audit logger for sensitive actions.
 *
 * @param {object} ctx
 * @param {Request} ctx.request   - the API route Request
 * @param {object}  ctx.session   - NextAuth session ({ user })
 * @param {string}  ctx.tenantId  - tenant scope
 * @param {string}  ctx.action    - one of AUDIT_ACTIONS or any UPPER_SNAKE verb
 * @param {string}  [ctx.target]  - resource id
 * @param {string}  [ctx.targetType] - resource type
 * @param {object}  [ctx.before]  - pre-change snapshot (PII-safe)
 * @param {object}  [ctx.after]   - post-change snapshot (PII-safe)
 * @param {object}  [ctx.details] - free-form metadata
 * @returns {Promise<void>}
 */
export async function auditAction(ctx) {
  const {
    request, session, tenantId,
    action, target, targetType,
    before, after, details,
  } = ctx

  if (!tenantId || !action) {
    console.warn('[audit] auditAction called without tenantId/action — skipped')
    return
  }

  try {
    const meta = extractRequestMeta(request)
    const { actor, actorId, actorRole } = actorFromSession(session)

    await auditRepo.create(tenantId, {
      actor,
      actorId,
      actorRole,
      action,
      target: target ?? null,
      targetType: targetType ?? null,
      before: before ?? null,
      after: after ?? null,
      details: details ?? null,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
  } catch (err) {
    // NEVER throw — audit failure must not break the user action.
    console.error('[audit] failed to write audit log:', err.message)
  }
}

/**
 * Compute the field-level diff between two objects, returning a plain
 * `{ field: { from, to } }` map. Used by routes that want a focused
 * before/after instead of dumping the whole record.
 */
export function diffFields(before = {}, after = {}, fields = []) {
  const out = {}
  const keys = fields.length > 0 ? fields : Object.keys({ ...before, ...after })
  for (const k of keys) {
    if (before?.[k] !== after?.[k]) {
      out[k] = { from: before?.[k] ?? null, to: after?.[k] ?? null }
    }
  }
  return out
}
