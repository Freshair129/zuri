/**
 * Multi-Tenant Module — Tenant resolution, Prisma middleware, RLS
 * @module shared/multi-tenant
 */

export { getTenantFromRequest } from '../../../lib/tenant.js'

export const MODULE_NAME = 'multi-tenant'

// Default tenant for V School
export const VSCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001'

// Tenant plans
export const TENANT_PLANS = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE']
export const TENANT_STATUSES = ['ACTIVE', 'SUSPENDED', 'TRIAL']

// System tables that bypass tenant middleware
export const SYSTEM_TABLES = ['Tenant', 'MarketPrice']
