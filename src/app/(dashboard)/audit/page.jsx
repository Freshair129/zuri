// Created At: 2026-04-10 07:50:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 07:50:00 +07:00 (v1.0.0)

'use client'

/**
 * Compliance Audit Log viewer (M6 Feature D4 / ZDEV-TSK-20260410-026)
 *
 * Tenant-scoped table of audit log entries. Filter by action / actor /
 * date range, paginate via cursor-style page numbers, and expand a row
 * to see the before/after diff and request metadata.
 *
 * RBAC: enforced upstream by middleware PAGE_ACL → audit:R
 * (DEV F, OWNER R, MANAGER R; everyone else 403).
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield, RefreshCw, Filter, Search, ChevronDown, ChevronRight,
  AlertTriangle, KeyRound, Power, FileDown, UserCog, Trash2, Loader2,
  Download, Calendar,
} from 'lucide-react'

const PAGE_SIZE = 25

// Action label + icon registry. Falls back to a generic shield for unknown actions.
const ACTION_META = {
  EMPLOYEE_ROLE_CHANGE:     { label: 'Role change',         icon: UserCog,        color: 'text-amber-600 bg-amber-50' },
  EMPLOYEE_STATUS_CHANGE:   { label: 'Status change',       icon: UserCog,        color: 'text-blue-600 bg-blue-50' },
  EMPLOYEE_PASSWORD_CHANGE: { label: 'Password change',     icon: KeyRound,       color: 'text-rose-600 bg-rose-50' },
  EMPLOYEE_DELETE:          { label: 'Employee deactivate', icon: Trash2,         color: 'text-red-600 bg-red-50' },
  INTEGRATION_TOGGLE:       { label: 'Integration toggle',  icon: Power,          color: 'text-purple-600 bg-purple-50' },
  INTEGRATION_CONNECT:      { label: 'Integration connect', icon: Power,          color: 'text-green-600 bg-green-50' },
  INTEGRATION_DISCONNECT:   { label: 'Integration disconnect', icon: Power,       color: 'text-red-600 bg-red-50' },
  REVENUE_EXPORT:           { label: 'Revenue export',      icon: FileDown,       color: 'text-orange-600 bg-orange-50' },
  TENANT_CONFIG_CHANGE:     { label: 'Tenant config',       icon: Shield,         color: 'text-sky-600 bg-sky-50' },
  IMPERSONATE_TENANT:       { label: 'Tenant impersonate',  icon: AlertTriangle,  color: 'text-rose-600 bg-rose-50' },
}

const ACTION_OPTIONS = ['', ...Object.keys(ACTION_META)]

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('th-TH', {
      dateStyle: 'short', timeStyle: 'medium',
    })
  } catch {
    return iso
  }
}

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action, icon: Shield, color: 'text-gray-600 bg-gray-100' }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${meta.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  )
}

function DiffBlock({ before, after }) {
  if (!before && !after) return null
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3">
        <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wide mb-1">Before</div>
        <pre className="text-rose-900 whitespace-pre-wrap break-all font-mono text-[11px]">
          {before ? JSON.stringify(before, null, 2) : '—'}
        </pre>
      </div>
      <div className="bg-green-50/60 border border-green-200 rounded-lg p-3">
        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">After</div>
        <pre className="text-green-900 whitespace-pre-wrap break-all font-mono text-[11px]">
          {after ? JSON.stringify(after, null, 2) : '—'}
        </pre>
      </div>
    </div>
  )
}

function MetaRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-mono break-all">{String(value)}</span>
    </div>
  )
}

function LogRow({ log }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-orange-50/30 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-3 py-2.5 align-top">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600 font-mono align-top whitespace-nowrap">
          {fmtDate(log.createdAt)}
        </td>
        <td className="px-3 py-2.5 align-top">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-3 py-2.5 text-sm text-gray-800 align-top">
          <div className="font-medium">{log.actorRole || '—'}</div>
          <div className="text-xs text-gray-500 font-mono">{log.actor}</div>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-700 align-top">
          {log.targetType && <span className="text-gray-400">{log.targetType}:</span>}{' '}
          <span className="font-mono">{log.target || '—'}</span>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500 font-mono align-top whitespace-nowrap">
          {log.ipAddress || '—'}
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/60">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-3">
              <DiffBlock before={log.before} after={log.after} />
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Details</div>
                  <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all font-mono">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-1">
                <MetaRow label="Log ID"     value={log.id} />
                <MetaRow label="Actor ID"   value={log.actorId} />
                <MetaRow label="User Agent" value={log.userAgent} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function AuditLogPage() {
  const [logs,     setLogs]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [page,     setPage]     = useState(1)
  const [exporting, setExporting] = useState(false)
  const [filters,  setFilters]  = useState({
    action: '', actor: '', search: '', since: '', until: '',
  })

  const buildParams = useCallback((extra = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (filters.action) params.set('action', filters.action)
    if (filters.actor)  params.set('actor',  filters.actor)
    if (filters.since)  params.set('since',  new Date(filters.since).toISOString())
    if (filters.until) {
      // Include full day for "until"
      const d = new Date(filters.until)
      d.setHours(23, 59, 59, 999)
      params.set('until', d.toISOString())
    }
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return params
  }, [page, filters.action, filters.actor, filters.since, filters.until])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/audit?${buildParams().toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setLogs(data.data || [])
      setTotal(data.total ?? 0)
    } catch (err) {
      console.error('[AuditLog] fetch failed:', err)
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const handleExport = useCallback(async (format = 'csv') => {
    setExporting(true)
    try {
      const params = buildParams({ page: '1', limit: '5000', format })
      const res = await fetch(`/api/audit/export?${params.toString()}`)
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message)
    } finally {
      setExporting(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Client-side text search across actor + target + JSON-serialized details
  const visibleLogs = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((l) => {
      const haystack = [l.actor, l.actorId, l.target, l.targetType, JSON.stringify(l.details ?? {})]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [logs, filters.search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            Compliance Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Immutable trail of sensitive actions across this tenant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            title="Export CSV (up to 5000 rows with current filters)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
          {/* Refresh */}
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filters.action}
          onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1) }}
          className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a || 'all'} value={a}>
              {a ? (ACTION_META[a]?.label || a) : 'All actions'}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filters.actor}
          onChange={(e) => { setFilters((f) => ({ ...f, actor: e.target.value })); setPage(1) }}
          placeholder="Actor (e.g. EMP-12)"
          className="h-9 px-3 w-44 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={filters.since}
            onChange={(e) => { setFilters((f) => ({ ...f, since: e.target.value })); setPage(1) }}
            title="From date"
            className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="date"
            value={filters.until}
            onChange={(e) => { setFilters((f) => ({ ...f, until: e.target.value })); setPage(1) }}
            title="To date"
            className="h-9 px-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          {(filters.since || filters.until) && (
            <button
              onClick={() => { setFilters((f) => ({ ...f, since: '', until: '' })); setPage(1) }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Full-text search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search target, IP, details…"
            className="h-9 pl-8 pr-3 w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={fetchLogs} className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-md text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">When</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actor</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Target</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                Loading audit logs…
              </td></tr>
            ) : visibleLogs.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                No audit log entries match the current filters.
              </td></tr>
            ) : (
              visibleLogs.map((log) => <LogRow key={log.id} log={log} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-md bg-white border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-500">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md bg-white border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
