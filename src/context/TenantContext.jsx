'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TenantContext = createContext({
  tenant:       null,
  loading:      true,
  error:        null,
  refresh:      async () => {},
  updateConfig: async () => {},
});

/**
 * TenantProvider — loads branding + config from /api/tenant/config.
 *
 * Tenant Sovereignty Rule (ADR-056): use useTenant() for all tenant-specific
 * UI (logo, brandColor, name) — never hardcode tenant values.
 */
export function TenantProvider({ children }) {
  const [tenant,  setTenant]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res  = await fetch('/api/tenant/config');
      const json = await res.json();
      if (json.data) {
        setTenant(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to load tenant config');
      }
    } catch (err) {
      console.error('[TenantContext] fetchConfig', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Inject CSS custom properties so all components can use --brand-primary etc.
  useEffect(() => {
    if (!tenant) return
    const root = document.documentElement
    root.style.setProperty('--brand-primary',   tenant.brandColor          ?? '#E8820C')
    root.style.setProperty('--brand-secondary',  tenant.brandColorSecondary ?? '#1A1710')
    root.style.setProperty('--brand-font',       tenant.brandFont           ?? 'IBM Plex Sans Thai')
  }, [tenant?.brandColor, tenant?.brandColorSecondary, tenant?.brandFont]);

  /**
   * Optimistically update tenant config and persist via PATCH /api/tenant/config.
   * Reverts on failure.
   * @param {Object} updates  — keys: brandColor, logoUrl, vatRate, currency, timezone
   * @returns {{ ok: boolean, error?: string }}
   */
  const updateConfig = useCallback(async (updates) => {
    setTenant((prev) => prev ? { ...prev, ...updates } : prev);
    try {
      const res  = await fetch('/api/tenant/config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) {
        await fetchConfig();
        return { ok: false, error: json.error ?? 'Update failed' };
      }
      setTenant(json.data);
      return { ok: true };
    } catch (err) {
      console.error('[TenantContext] updateConfig', err);
      await fetchConfig();
      return { ok: false, error: err.message };
    }
  }, [fetchConfig]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refresh: fetchConfig, updateConfig }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
