import { NextResponse } from 'next/server'
import { getTenantId } from '@/lib/tenant'
import { withAuth } from '@/lib/auth'
import { getEmployees, createEmployee } from '@/lib/repositories/employeeRepo'

export const dynamic = 'force-dynamic'

// GET /api/employees - List employees for the tenant
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const employees = await getEmployees({ tenantId, page, limit })

    // Optional: map to safe employee representation (omit passwordHash)
    const safeEmployees = employees.map(({ passwordHash, ...rest }) => rest)

    return NextResponse.json({ data: safeEmployees, page, limit })
  } catch (error) {
    console.error('[Employees_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { domain: 'employees', action: 'R', maskPii: true })

// POST /api/employees - Create a new employee
export const POST = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      firstName, 
      lastName, 
      nickName, 
      email, 
      role, 
      phone, 
      lineUserId, 
      department, 
      jobTitle, 
      hiredAt 
    } = body

    if (!firstName || !email || !role) {
      return NextResponse.json({ error: 'firstName, email, and role are required' }, { status: 400 })
    }

    const employee = await createEmployee({ 
      tenantId, 
      firstName, 
      lastName, 
      nickName, 
      email, 
      role, 
      phone, 
      lineUserId, 
      department, 
      jobTitle, 
      hiredAt 
    })

    const { passwordHash, ...safeEmployee } = employee;

    return NextResponse.json(safeEmployee, { status: 201 })
  } catch (error) {
    console.error('[Employees_POST]', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}, { domain: 'employees', action: 'W' })
