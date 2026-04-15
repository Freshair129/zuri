/**
 * Auth Module — Employee identity, RBAC permission matrix
 * @module core/auth
 */

// Repositories
export { default as employeeRepo } from '../../../lib/repositories/employeeRepo.js'

// Permission utilities (ADR-045)
export { can } from '../../../lib/permissionMatrix.js'

// RBAC roles — mirrors system_config.yaml SSOT
export const ROLES = [
  'DEV', 'TEC', 'MGR', 'MKT', 'HR',
  'PUR', 'PD', 'ADM', 'ACC', 'SLS',
  'AGT', 'STF', 'OWNER',
]

// Constants
export const MODULE_NAME = 'auth'
