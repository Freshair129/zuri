/**
 * Culinary Enrollment Sub-module
 * @module industry/culinary/enrollment
 *
 * Owns: Course & Package enrollment, class scheduling, QR attendance, certificates
 */

// Repositories
export { default as enrollmentRepo } from '@/lib/repositories/enrollmentRepo'
export { default as productRepo } from '@/lib/repositories/productRepo'
export { default as scheduleRepo } from '@/lib/repositories/scheduleRepo'

// Constants
export const ENROLLMENT_STATUSES = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
}

export const ATTENDANCE_STATUSES = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
}

// Format: CERT-[YEAR]-[ULID]
export const CERT_NUMBER_FORMAT = 'CERT-{YEAR}-{ULID}'

export const MODULE_NAME = 'culinary/enrollment'

// Module default export (for plugin manifest sub-module loading)
export default {
  name: MODULE_NAME,
  ENROLLMENT_STATUSES,
  ATTENDANCE_STATUSES,
  CERT_NUMBER_FORMAT,
}
