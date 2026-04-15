/**
 * CRM Module — Customer management, lead funnel, identity resolution
 * @module core/crm
 */

// Repositories
export { default as customerRepo } from '../../../lib/repositories/customerRepo.js'
export { default as customerProfileRepo } from '../../../lib/repositories/customerProfileRepo.js'

// Components
export { default as CustomerList } from '../../../components/crm/CustomerList.jsx'
export { default as CustomerDetail } from '../../../components/crm/CustomerDetail.jsx'

// Constants
export const CRM_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'ENROLLED', 'PAID']
export const MODULE_NAME = 'crm'
