'use client';

// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

// Admin > Tenants — List, activate/deactivate, impersonate.
// Restricted to DEV role (enforced by middleware on app.zuri.app + layout guard).

import { useState, useEffect, useCallback } from 'react';

export default function AdminTenantsPage() {
  const [tenants,  setTenants]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [toggling, setToggling] = useState(null); // tenantId being toggled
  const [imping,   setImping]   = useState(null); // tenantSlug being impersonated

  const [auditLog, setAuditLog] = useState([]);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/tenants');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setTenants(json.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLog = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/impersonate');
      const json = await res.json();
      if (res.ok) setAuditLog(json.data ?? []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadTenants();
    loadAuditLog();
  }, [loadTenants, loadAuditLog]);

  const toggleActive = async (tenant) => {
    setToggling(tenant.id);
    try {
      const res  = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: !tenant.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setTenants((prev) =>
        prev.map((t) => t.id === tenant.id ? { ...t, isActive: json.data.isActive } : t)
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(null);
    }
  };

  const impersonate = async (tenantSlug) => {
    setImping(tenantSlug);
    try {
      const res  = await fetch('/api/admin/impersonate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tenantSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      window.open(json.url, '_blank', 'noopener,noreferrer');
      loadAuditLog();
    } catch (err) {
      alert(err.message);
    } finally {
      setImping(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tenants</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tenants.length} tenants registered</p>
        </div>
        <button
          onClick={loadTenants}
          className="h-8 px-3 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tenant table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        )}
        {error && (
          <div className="p-6 text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Tenant</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Slug</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-white">{tenant.tenantName}</td>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{tenant.tenantSlug}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tenant.isActive
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(tenant.createdAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Impersonate */}
                      <button
                        onClick={() => impersonate(tenant.tenantSlug)}
                        disabled={imping === tenant.tenantSlug || !tenant.isActive}
                        className="h-7 px-3 text-xs text-orange-400 bg-orange-950 hover:bg-orange-900 disabled:opacity-40 rounded-lg transition-colors"
                      >
                        {imping === tenant.tenantSlug ? '…' : 'View'}
                      </button>
                      {/* Toggle active */}
                      <button
                        onClick={() => toggleActive(tenant)}
                        disabled={toggling === tenant.id}
                        className={`h-7 px-3 text-xs rounded-lg transition-colors disabled:opacity-40 ${
                          tenant.isActive
                            ? 'text-red-400 bg-red-950 hover:bg-red-900'
                            : 'text-green-400 bg-green-950 hover:bg-green-900'
                        }`}
                      >
                        {toggling === tenant.id ? '…' : tenant.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Impersonation audit log */}
      {auditLog.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Impersonation Audit Log</h2>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-400">
                <span className="text-gray-600 font-mono">
                  {new Date(entry.timestamp).toLocaleString('th-TH')}
                </span>
                <span className="text-orange-400">{entry.adminEmail}</span>
                <span className="text-gray-600">→</span>
                <span className="font-mono text-gray-300">{entry.tenantSlug}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
