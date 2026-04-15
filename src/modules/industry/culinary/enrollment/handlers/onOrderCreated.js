/**
 * When an order is created with package items, auto-create enrollment
 * Triggered by core event: order.created
 */
export async function onOrderCreated(tenantId, order) {
  // TODO: implement in Phase 4
  // 1. Check if order contains package items
  // 2. Create Enrollment record (status: PENDING)
  // 3. Create EnrollmentItems for each course in package
  // 4. Emit 'enrollment.created' event
}
