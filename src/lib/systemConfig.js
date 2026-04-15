// Created At: 2026-04-12 11:30:00 +07:00 (v1.2.0)
// Previous version: 2026-04-04 09:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 11:30:00 +07:00 (v1.2.0)

import YAML from 'yaml'

let _config = null

/**
 * Load system_config.yaml — Single Source of Truth
 * Sanitized for Edge Runtime compatibility.
 */
export async function getConfig() {
  if (_config) return _config

  // Protect Vercel Edge Runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    // In Edge, we cannot read the filesystem. 
    // Return a minimal fail-safe config or throw if absolutely required.
    // For Zuri, most edge logic (RBAC) is current hardcoded in permissionMatrix,
    // so we return an empty object to prevent crash.
    return {}
  }

  try {
    const fs = (await import('fs')).default
    const path = (await import('path')).default
    
    const filePath = path.join(process.cwd(), 'system_config.yaml')
    const file = fs.readFileSync(filePath, 'utf8')
    _config = YAML.parse(file)
    return _config
  } catch (err) {
    console.error('[systemConfig] Failed to load config:', err.message)
    return {}
  }
}

// ─── Shortcut Exports (Now Async) ──────────────────────────

export async function getRoles() {
  const cfg = await getConfig()
  return cfg.rbac?.roles || []
}

export async function getRoleByCode(code) {
  const roles = await getRoles()
  return roles.find(r => r.code === code)
}

export async function getExecRoles() {
  const cfg = await getConfig()
  return cfg.rbac?.exec_roles || []
}

export async function getDashboardMap() {
  const cfg = await getConfig()
  return cfg.rbac?.dashboard_map || {}
}

export async function getVatRate() {
  const cfg = await getConfig()
  return cfg.vat?.rate || 7
}

export async function getOrderStatuses() {
  const cfg = await getConfig()
  return cfg.orders?.statuses || []
}

export async function getOrderTypes() {
  const cfg = await getConfig()
  return cfg.orders?.types || []
}

export async function getPaymentMethods() {
  const cfg = await getConfig()
  return cfg.payment?.methods || []
}

export async function getCourseCategories() {
  const cfg = await getConfig()
  return cfg.products?.course_categories || []
}

export async function getFoodCategories() {
  const cfg = await getConfig()
  return cfg.products?.food_categories || []
}

export async function getEquipmentCategories() {
  const cfg = await getConfig()
  return cfg.products?.equipment_categories || []
}

export async function getOriginCountries() {
  const cfg = await getConfig()
  return cfg.products?.origin_countries || []
}

export async function getEnrollmentStatuses() {
  const cfg = await getConfig()
  return cfg.enrollment?.statuses || []
}

export async function getTaskPriorities() {
  const cfg = await getConfig()
  return cfg.tasks?.priorities || []
}

export async function getTaskStatuses() {
  const cfg = await getConfig()
  return cfg.tasks?.statuses || []
}

export async function getTaskTypes() {
  const cfg = await getConfig()
  return cfg.tasks?.types || []
}

export async function getLotStatuses() {
  const cfg = await getConfig()
  return cfg.inventory?.lot_statuses || []
}

export async function getPoStatuses() {
  const cfg = await getConfig()
  return cfg.procurement?.po_statuses || []
}

export async function getEmployeeGrades() {
  const cfg = await getConfig()
  return cfg.employee?.grades || []
}

export async function getEmploymentTypes() {
  const cfg = await getConfig()
  return cfg.employee?.employment_types || {}
}

export async function getDepartmentCodes() {
  const cfg = await getConfig()
  return cfg.employee?.department_codes || {}
}

export async function getLoyaltyTiers() {
  const cfg = await getConfig()
  return cfg.loyalty?.tiers || []
}

export async function getVpRate() {
  const cfg = await getConfig()
  return cfg.loyalty?.vp_rate || 0
}

export async function getCertThresholds() {
  const cfg = await getConfig()
  return cfg.certificates?.thresholds || {}
}

export async function getCacheTTL() {
  const cfg = await getConfig()
  return cfg.cache?.default_ttl || 3600
}

export async function getThemeColors() {
  const cfg = await getConfig()
  return cfg.theme?.colors || {}
}

export async function getPieChartPalette() {
  const cfg = await getConfig()
  return cfg.theme?.pie_chart_palette || []
}

export async function getSessionTypes() {
  const cfg = await getConfig()
  return cfg.scheduling?.session_types || []
}

export async function getScheduleStatuses() {
  const cfg = await getConfig()
  return cfg.scheduling?.statuses || []
}
