// Created At: 2026-04-12 12:10:00 +07:00 (v1.3.0)
// Previous version: 2026-04-12 12:10:00 +07:00 (v1.3.0)
// Last Updated: 2026-04-12 19:10:00 +07:00 (v1.4.0)

import { getPrisma } from '@/lib/db'

/**
 * Generate sequential ID with format: PREFIX-YYYYMMDD-SERIAL
 * Sanitized for Edge Runtime compatibility.
 */
async function generateDailyId(model, field, prefix, padding = 3) {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const pattern = `${prefix}-${dateStr}-`

  const prisma = await getPrisma()
  const last = await prisma[model].findFirst({
    where: { [field]: { startsWith: pattern } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  })

  let serial = 1
  if (last) {
    const parts = last[field].split('-')
    serial = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${pattern}${String(serial).padStart(padding, '0')}`
}

/**
 * Generate sequential ID with format: PREFIX-SERIAL (global scope)
 */
async function generateGlobalId(model, field, prefix, padding = 3) {
  const prisma = await getPrisma()
  const last = await prisma[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  })

  let serial = 1
  if (last) {
    const parts = last[field].split('-')
    serial = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}-${String(serial).padStart(padding, '0')}`
}

// ─── Domain-Specific Generators ────────────────────────────

export async function generateCustomerId(channel) {
  const today = new Date()
  const yymm = today.toISOString().slice(2, 4) + String(today.getMonth() + 1).padStart(2, '0')
  const prefix = `TVS-CUS-${channel}-${yymm}`

  const prisma = await getPrisma()
  const last = await prisma.customer.findFirst({
    where: { customerId: { startsWith: prefix } },
    orderBy: { customerId: 'desc' },
    select: { customerId: true },
  })

  let serial = 1
  if (last) {
    const parts = last.customerId.split('-')
    serial = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}-${String(serial).padStart(4, '0')}`
}

export async function generateEmployeeId(department, employmentType) {
  const { getEmploymentTypes, getDepartmentCodes } = await import('@/lib/systemConfig')
  const types = await getEmploymentTypes()
  const depts = await getDepartmentCodes()

  const typeCode = types[employmentType] || 'EMP'
  const deptCode = depts[department] || 'GEN'
  const prefix = `TVS-${typeCode}-${deptCode}`

  const prisma = await getPrisma()
  const last = await prisma.employee.findFirst({
    where: { employeeId: { startsWith: prefix } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true },
  })

  let serial = 1
  if (last) {
    const parts = last.employeeId.split('-')
    serial = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}-${String(serial).padStart(3, '0')}`
}

export async function generateOrderId() {
  return generateDailyId('order', 'orderId', 'ORD')
}

export async function generateSku(data = {}) {
  const { group = 'JP', fc = '2FC', prop = 'HO', category } = data

  if (category === 'package' || group === 'PKG') {
    const prisma = await getPrisma()
    const last = await prisma.product.findFirst({
      where: { sku: { startsWith: 'TVS-PKG' } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    })

    let serial = 1
    if (last) {
      const match = last.sku.match(/TVS-PKG(\d+)/)
      if (match) serial = parseInt(match[1], 10) + 1
    }

    return `TVS-PKG${String(serial).padStart(2, '0')}`
  }

  const prefix = `TVS-${group}-${fc}-${prop}`

  const prisma = await getPrisma()
  const last = await prisma.product.findFirst({
    where: { sku: { startsWith: prefix } },
    orderBy: { sku: 'desc' },
    select: { sku: true },
  })

  let serial = 1
  if (last) {
    const parts = last.sku.split('-')
    serial = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}-${String(serial).padStart(2, '0')}`
}

/** @deprecated Use generateSku() — kept for backward compatibility */
export const generateProductId = generateSku

export async function generateTransactionId() {
  return generateDailyId('transaction', 'transactionId', 'PAY')
}

export async function generateEnrollmentId() {
  return generateDailyId('enrollment', 'enrollmentId', 'ENR')
}

export async function generateTaskId() {
  return generateDailyId('task', 'taskId', 'TSK')
}

export async function generateScheduleId() {
  return generateDailyId('courseSchedule', 'scheduleId', 'SCH')
}

export async function generateLotId() {
  return generateDailyId('ingredientLot', 'lotId', 'LOT')
}

export async function generatePurchaseOrderId() {
  return generateDailyId('purchaseOrderV2', 'poId', 'PO')
}

export async function generateRecipeId() {
  return generateGlobalId('recipe', 'recipeId', 'RCP', 4)
}

export async function generateInvoiceId() {
  return generateDailyId('order', 'orderId', 'INV')
}