import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { findById, updateEmployee, deleteEmployee } from '@/lib/repositories/employeeRepo'
import { auditAction, AUDIT_ACTIONS, diffFields } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET /api/employees/[id] - Get employee detail
export const GET = withAuth(async (request, { params }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const employee = await findById(tenantId, id)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    
    const { passwordHash, ...safeEmployee } = employee

    return NextResponse.json({ data: safeEmployee })
  } catch (error) {
    console.error('[Employee_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'employees', action: 'R' })

// PATCH /api/employees/[id] - Update employee fields
export const PATCH = withAuth(async (request, { params, session }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, nickName, phone, department, jobTitle, role, status } = body

    // construct updates ensuring we don't accidentally update things like passwordHash or tenantId
    const updates = {}
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName
    if (nickName !== undefined) updates.nickName = nickName
    if (phone !== undefined) updates.phone = phone
    if (department !== undefined) updates.department = department
    if (jobTitle !== undefined) updates.jobTitle = jobTitle
    if (role !== undefined) updates.role = role
    if (status !== undefined) updates.status = status

    // Snapshot BEFORE state for the audit log so we can prove the diff
    const before = await findById(tenantId, id)
    if (!before) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const updatedEmployee = await updateEmployee(tenantId, id, updates)
    const { passwordHash, ...safeEmployee } = updatedEmployee

    // Audit: only when role or status actually changed (these are the
    // sensitive fields per ZDEV-TSK-20260410-026 requirements)
    const sensitiveFields = ['role', 'status']
    const sensitiveDiff = diffFields(before, updatedEmployee, sensitiveFields)
    if (Object.keys(sensitiveDiff).length > 0) {
      const action = sensitiveDiff.role
        ? AUDIT_ACTIONS.EMPLOYEE_ROLE_CHANGE
        : AUDIT_ACTIONS.EMPLOYEE_STATUS_CHANGE
      await auditAction({
        request,
        session,
        tenantId,
        action,
        target: id,
        targetType: 'employee',
        before: { role: before.role, status: before.status },
        after: { role: updatedEmployee.role, status: updatedEmployee.status },
        details: { diff: sensitiveDiff, email: before.email },
      })
    }

    return NextResponse.json({ data: safeEmployee })
  } catch (error) {
    console.error('[Employee_PATCH]', error)
    const status = error?.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}, { domain: 'employees', action: 'W' })

// DELETE /api/employees/[id] - Soft delete/deactivate an employee
export const DELETE = withAuth(async (request, { params, session }) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const before = await findById(tenantId, id)
    if (!before) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    await deleteEmployee(tenantId, id)

    await auditAction({
      request,
      session,
      tenantId,
      action: AUDIT_ACTIONS.EMPLOYEE_DELETE,
      target: id,
      targetType: 'employee',
      before: { status: before.status, role: before.role, email: before.email },
      after: { status: 'INACTIVE' },
    })

    return NextResponse.json({ success: true, message: 'Employee deactivated' })
  } catch (error) {
    console.error('[Employee_DELETE]', error)
    const status = error?.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}, { domain: 'employees', action: 'W' })
