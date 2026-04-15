'use client';

// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

// Admin > Usage — Platform-wide stats (messages, conversations, customers last 30d).
// Restricted to DEV role.

import { useState, useEffect, useCallback } from 'react';

function Stat({ label, value }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value?.toLocaleString() ?? '—'}</p>
    </div>
  );
}

export default function AdminUsagePage() {
  const [rows,    setRows]    = useState([]);
  const [totals,  setTotals]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [sort,    setSort]    = useState('messages30d');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/admin/usage');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setRows(json.data ?? []);
      setTotals(json.totals ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);

  const SORT_COLS = [
    { key: 'messages30d',      label: 'Messages (30d)' },
    { key: 'conversations30d', label: 'Convs (30d)' },
    { key: 'totalCustomers',   label: 'Customers' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Usage</h1>
          <p className="text-sm text-gray-400 mt-0.5">Last 30 days — platform-wide</p>
        </div>
        <button
          onClick={load}
          className="h-8 px-3 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Platform totals */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Tenants"       value={totals.tenants} />
          <Stat label="Active"        value={totals.activeTenants} />
          <Stat label="Messages 30d"  value={totals.messages30d} />
          <Stat label="Convs 30d"     value={totals.conversations30d} />
          <Stat label="Customers"     value={totals.totalCustomers} />
        </div>
      )}

      {/* Per-tenant table */}
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
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Plan</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400">Status</th>
                {SORT_COLS.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSort(key)}
                      className={`text-xs font-semibold transition-colors ${
                        sort === key ? 'text-orange-400' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {label} {sort === key && '↓'}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.tenantName}</p>
                    <p className="text-xs text-gray-500 font-mono">{row.tenantSlug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${row.isActive ? 'bg-green-400' : 'bg-red-500'}`} />
                    <span className="text-xs text-gray-400">{row.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{row.messages30d.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{row.conversations30d.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{row.totalCustomers.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
