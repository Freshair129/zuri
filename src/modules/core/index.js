/**
 * Zuri Platform — Core Modules Barrel
 * Re-exports all 8 core modules for convenient single-import access.
 *
 * Usage:
 *   import { customerRepo, CustomerList } from '@/modules/core/crm'
 *   import { conversationRepo, ChatView } from '@/modules/core/inbox'
 *
 * @module core
 */

export * as crm from './crm/index.js'
export * as inbox from './inbox/index.js'
export * as pos from './pos/index.js'
export * as marketing from './marketing/index.js'
export * as dsb from './dsb/index.js'
export * as tasks from './tasks/index.js'
export * as notifications from './notifications/index.js'
export * as auth from './auth/index.js'
