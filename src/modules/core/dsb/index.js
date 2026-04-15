/**
 * Daily Sales Brief (DSB) Module — AI-generated daily summary and insights
 * @module core/dsb
 */

// Repositories
export { default as dailyBriefRepo } from '../../../lib/repositories/dailyBriefRepo.js'

// Shared repositories (SSOT stays in their owning module)
export { default as customerProfileRepo } from '../../../lib/repositories/customerProfileRepo.js'

// Shared components (SSOT stays in marketing module)
export { default as DailyBriefCard } from '../../../components/marketing/DailyBriefCard.jsx'

// Constants
export const MODULE_NAME = 'dsb'
