/**
 * When a class starts, auto-deduct ingredient stock (FEFO)
 * Triggered by core event: schedule.started
 */
export async function onClassStarted(tenantId, schedule) {
  // TODO: implement in Phase 4
  // 1. Lookup CourseMenu → Recipe → RecipeIngredient
  // 2. Calculate: ingredientQty × studentCount
  // 3. deductFEFO() from oldest lots
  // 4. Check low stock → emit 'stock.low' if needed
}
