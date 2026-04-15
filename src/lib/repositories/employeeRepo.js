// Created At: 2026-04-12 05:55:00 +07:00 (v1.3.22)
// Previous version: 2026-04-11 20:35:57 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:55:00 +07:00 (v1.3.22)

import { getPrisma } from '@/lib/db'
import { isMockMode, MOCK_ADMIN } from '@/lib/mockMode'


export async function findByEmail(email) {
  const prisma = await getPrisma()
  return prisma.employee.findUnique({ where: { email } })
}


export async function findMany(tenantId, { status = 'ACTIVE' } = {}) {
  const prisma = await getPrisma()
  return prisma.employee.findMany({
    where: { tenantId, status },
    orderBy: { firstName: 'asc' },
  })
}

export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.employee.findFirst({
    where: { id, tenantId },
  })
}

/**
 * List employees with pagination — alias used by /api/employees GET
 */
export async function getEmployees({ tenantId, page = 1, limit = 20 } = {}) {
  const prisma = await getPrisma()
  const offset = (page - 1) * limit
  return prisma.employee.findMany({
    where: { tenantId, status: 'ACTIVE' },
    orderBy: { firstName: 'asc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Create a new employee with secure password and sequential ID
 */
export async function createEmployee(data) {
  const { 
    tenantId, 
    firstName, 
    lastName, 
    nickName,
    email, 
    role = 'STF', 
    phone, 
    lineUserId,
    department,
    jobTitle,
    hiredAt
  } = data

  // 1. Hash password - Lazy load bcryptjs for edge-compatibility in shared libs
  const bcrypt = (await import('bcryptjs')).default
  const hashed = await bcrypt.hash('Standard@123', 10)

  const prisma = await getPrisma()

  // 2. Check for existing email (Prisma unique constraint)
  const existing = await prisma.employee.findUnique({ where: { email } })
  if (existing) throw new Error('Email already in use')

  // 3. Generate Sequential Employee ID (e.g., TVS-EMP-ADM-001)
  const { generateEmployeeId } = await import('@/lib/idGenerator')
  const employeeId = await generateEmployeeId(department || 'General', 'employee')

  // 4. Create in DB
  const employee = await prisma.employee.create({
    data: {
      tenantId,
      employeeId,
      firstName,
      lastName,
      nickName,
      email,
      phone,
      lineUserId,
      department,
      jobTitle,
      hiredAt: hiredAt ? new Date(hiredAt) : undefined,
      role: role.toUpperCase(),
      passwordHash: hashed,
      roles: [role.toUpperCase()]
    }
  })

  return employee
}

export async function updateEmployee(tenantId, id, data) {
  const employee = await findById(tenantId, id)
  if (!employee) throw new Error('Employee not found or access denied')

  // Handle roles specifically if role is updated, also update the Array
  const updateData = { ...data }
  if (updateData.role && !updateData.roles) {
    updateData.roles = [updateData.role]
  }

  const prisma = await getPrisma()
  return prisma.employee.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteEmployee(tenantId, id) {
  const employee = await findById(tenantId, id)
  if (!employee) throw new Error('Employee not found or access denied')

  const prisma = await getPrisma()
  return prisma.employee.update({
    where: { id },
    data: { status: 'INACTIVE' },
  })
}
