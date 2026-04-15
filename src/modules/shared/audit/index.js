/**
 * Audit Module — Audit logging and approval workflows
 * @module shared/audit
 */

export const MODULE_NAME = 'audit'

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'EXPORT']
export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ESCALATED']
