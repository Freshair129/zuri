/**
 * POS Module — Point-of-sale orders, cart management
 * @module core/pos
 */

// Repositories
export { default as orderRepo } from '../../../lib/repositories/orderRepo.js'

// Components
export { default as PremiumPOS } from '../../../components/pos/PremiumPOS.jsx'
export { default as CartPanel } from '../../../components/pos/CartPanel.jsx'

// Shared components (also used by inbox)
export { default as ChatPOS } from '../../../components/inbox/ChatPOS.jsx'

// Constants
export const MODULE_NAME = 'pos'
