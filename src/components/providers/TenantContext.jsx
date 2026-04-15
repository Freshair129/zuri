/**
 * Canonical re-export of TenantProvider and useTenant.
 * Source of truth: src/context/TenantContext.jsx
 *
 * New code should import from here.
 * Existing imports from @/context/TenantContext continue to work unchanged.
 */
export { TenantProvider, useTenant } from '@/context/TenantContext';
