// Created At: 2026-04-10 05:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 05:30:00 +07:00 (v1.0.0)

import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findById } from '@/lib/repositories/employeeRepo'
import { getPrisma } from '@/lib/db'
import { auditAction, AUDIT_ACTIONS } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/employees/[id]/password
 * Change an employee's password.
 *
 * Rules:
 *   - Self-service (caller.id === params.id): requires `currentPassword`
 *   - MANAGER/OWNER reset: no currentPassword needed
 *
 * Body: { newPassword: string, currentPassword?: string }
 * Emits: EMPLOYEE_PASSWORD_CHANGE audit log (password hashes are NEVER stored in audit)
 */
export const PATCH = withAuth(async (request, { params, session }) => {
  const tenantId = await getTenantId(request)
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { newPassword, currentPassword } = body
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'newPassword must be at least 8 characters' }, { status: 400 })
  }

  const employee = await findById(tenantId, id)
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const bcrypt = (await import('bcryptjs')).default
  const isSelf = session?.user?.id === id || session?.user?.employeeId === employee.employeeId
  const isManager = ['OWNER', 'MANAGER', 'DEV'].includes(session?.user?.role)

  // Self-service: verify current password
  if (isSelf && !isManager) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'currentPassword is required for self-service change' }, { status: 400 })
    }
    const valid = await bcrypt.compare(currentPassword, employee.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
    }
  }

  const newHash = await bcrypt.hash(newPassword, 10)

  await getPrisma().employee.update({
    where: { id, tenantId },
    data:  { passwordHash: newHash, updatedAt: new Date() },
  })

  // Audit — never log the actual password or hash
  await auditAction({
    request,
    session,
    tenantId,
    action:     AUDIT_ACTIONS.EMPLOYEE_PASSWORD_CHANGE,
    target:     id,
    targetType: 'employee',
    details: {
      email:    employee.email,
      selfChange: isSelf && !isManager,
      adminReset: isManager && !isSelf,
    },
  })

  return NextResponse.json({ ok: true })
}, { domain: 'employees', action: 'W' })
