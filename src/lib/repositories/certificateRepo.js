// Created At: 2026-04-12 05:45:00 +07:00 (v1.3.20)
// Previous version: 2026-04-11 20:35:29 +07:00 (v1.2.0)
// Last Updated: 2026-04-12 05:45:00 +07:00 (v1.3.20)

import { getPrisma } from '@/lib/db'

/**
 * Generate certificate ID per id_standards.yaml
 * Format: CERT-{YYYYMMDD}-{seq padded 3}
 * Scope: daily (resets per day per tenant)
 */
export async function generateCertId(tenantId) {
  const prisma = await getPrisma()
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const prefix = `CERT-${dateStr}-`

  const last = await prisma.certificate.findFirst({
    where: { tenantId, certificateId: { startsWith: prefix } },
    orderBy: { certificateId: 'desc' },
    select: { certificateId: true },
  })

  let seq = 1
  if (last) {
    const parts = last.certificateId.split('-')
    seq = parseInt(parts[parts.length - 1], 10) + 1
  }

  return `${prefix}${String(seq).padStart(3, '0')}`
}

/**
 * Determine certificate level based on hoursCompleted
 */
export function getCertLevel(hoursCompleted) {
  if (hoursCompleted >= 201) return 'MASTER_201H'
  if (hoursCompleted >= 111) return 'PRO_111H'
  if (hoursCompleted >= 30)  return 'BASIC_30H'
  return null
}

/**
 * List all certificates for tenant, newest first
 */
export async function findMany(tenantId, { limit = 50, skip = 0, customerId } = {}) {
  const prisma = await getPrisma()
  return prisma.certificate.findMany({
    where: {
      tenantId,
      ...(customerId ? { customerId } : {}),
    },
    include: {
      enrollment: {
        select: {
          enrollmentId: true,
          hoursCompleted: true,
          enrolledAt: true,
          product: { select: { name: true } },
          customer: { select: { name: true, lineDisplayName: true } },
        },
      },
    },
    orderBy: { issuedDate: 'desc' },
    take: limit,
    skip,
  })
}

/**
 * Get single certificate by UUID or certificateId
 */
export async function findById(tenantId, id) {
  const prisma = await getPrisma()
  return prisma.certificate.findFirst({
    where: {
      tenantId,
      OR: [{ id }, { certificateId: id }],
    },
    include: {
      enrollment: {
        select: {
          enrollmentId: true,
          hoursCompleted: true,
          completedAt: true,
          enrolledAt: true,
          product: { select: { id: true, name: true } },
          customer: {
            select: {
              id: true,
              name: true,
              lineDisplayName: true,
              facebookName: true,
              phone: true,
              email: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Create a certificate record for a completed enrollment.
 */
export async function createForEnrollment(tenantId, { enrollmentId, customerId, hoursCompleted }) {
  const prisma = await getPrisma()
  const existing = await prisma.certificate.findFirst({
    where: { enrollmentId },
  })
  if (existing) return { cert: existing, created: false }

  const level = getCertLevel(hoursCompleted)
  if (!level) throw new Error(`hoursCompleted ${hoursCompleted} does not qualify for any certificate`)

  const certificateId = await generateCertId(tenantId)

  const cert = await prisma.certificate.create({
    data: {
      certificateId,
      tenantId,
      enrollmentId,
      customerId,
      level,
      issuedDate: new Date(),
    },
  })

  return { cert, created: true }
}

/**
 * Mark certificate as notified (LINE/Email sent)
 */
export async function markNotified(id) {
  const prisma = await getPrisma()
  return prisma.certificate.update({
    where: { id },
    data: { notifiedAt: new Date() },
  })
}

/**
 * Update pdfUrl after async generation
 */
export async function updatePdfUrl(id, pdfUrl) {
  const prisma = await getPrisma()
  return prisma.certificate.update({
    where: { id },
    data: { pdfUrl },
  })
}

/**
 * Find enrollments ready to complete
 */
export async function findCompletableEnrollments(tenantId) {
  const prisma = await getPrisma()
  return prisma.enrollment.findMany({
    where: {
      tenantId,
      status: 'IN_PROGRESS',
      hoursCompleted: { gte: 30 },
      certificate: null,
    },
    select: {
      id: true,
      enrollmentId: true,
      customerId: true,
      hoursCompleted: true,
      productId: true,
    },
  })
}

/**
 * Mark enrollment as COMPLETED
 */
export async function completeEnrollment(enrollmentId) {
  const prisma = await getPrisma()
  return prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })
}
