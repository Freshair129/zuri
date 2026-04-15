/**
 * Culinary Kitchen Sub-module
 * @module industry/culinary/kitchen
 *
 * Owns: Recipes, FEFO ingredient stock, prep sheets, stock movements
 */

// Repositories
export { default as ingredientRepo } from '@/lib/repositories/ingredientRepo'

// Constants
export const STOCK_MOVEMENT_TYPES = {
  IN: 'IN',           // Receiving stock (PO receipt)
  OUT: 'OUT',         // Consumption / deduction
  ADJUST: 'ADJUST',  // Manual inventory adjustment
  WASTE: 'WASTE',    // Spoilage / waste write-off
  TRANSFER: 'TRANSFER', // Between locations/stations
}

// FEFO = First Expired, First Out
export const FEFO_STRATEGY = 'FEFO'

// Trigger 'stock.low' event when available qty drops to or below this multiplier of reorder point
export const LOW_STOCK_THRESHOLD = 1.0 // 1× reorder point

export const MODULE_NAME = 'culinary/kitchen'

// Module default export (for plugin manifest sub-module loading)
export default {
  name: MODULE_NAME,
  STOCK_MOVEMENT_TYPES,
  FEFO_STRATEGY,
  LOW_STOCK_THRESHOLD,
}
