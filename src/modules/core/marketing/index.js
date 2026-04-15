/**
 * Marketing Module — Campaign management, ads analytics, ROAS tracking
 * @module core/marketing
 */

// Repositories
export { default as campaignRepo } from '../../../lib/repositories/campaignRepo.js'

// Components
export { default as CampaignTable } from '../../../components/marketing/CampaignTable.jsx'
export { default as MetricCard } from '../../../components/marketing/MetricCard.jsx'
export { default as ROASChart } from '../../../components/marketing/ROASChart.jsx'
export { default as DailyBriefCard } from '../../../components/marketing/DailyBriefCard.jsx'

// Constants
export const MODULE_NAME = 'marketing'
