/**
 * Inventory Module — Warehouse stock management, movements, stock counts
 * @module shared/inventory
 */

export const MODULE_NAME = 'inventory'

export const MOVEMENT_TYPES = ['RECEIVE', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'RETURN']
export const WAREHOUSE_TYPES = ['MAIN', 'BRANCH', 'VIRTUAL']
export const STOCK_COUNT_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
export const PRODUCT_TYPES = ['PRODUCT', 'INGREDIENT']
