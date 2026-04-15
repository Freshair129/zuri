'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import Badge from '../ui/Badge';
import Pagination from '../shared/Pagination';

const LIFECYCLE_OPTIONS = ['All', 'Lead', 'Prospect', 'Active', 'Churned'];

const lifecycleColor = {
  Lead: 'yellow',
  Prospect: 'blue',
  Active: 'green',
  Churned: 'red',
};

export default function CustomerList({
  customers = [],
  loading = false,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  onRowClick,
}) {
  const [search, setSearch] = useState('');
  const [lifecycle, setLifecycle] = useState('All');

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchesLifecycle = lifecycle === 'All' || c.lifecycle === lifecycle;
    return matchesSearch && matchesLifecycle;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1">
          {LIFECYCLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setLifecycle(opt)}
              className={`
                px-3 py-1.5 text-sm rounded-lg font-medium transition-colors
                ${lifecycle === opt ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}
              `}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Phone', 'Email', 'Lifecycle', 'Joined', 'Total Spend'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                      No customers found.
                    </td>
                  </tr>
                )
              : filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => onRowClick?.(customer)}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge color={lifecycleColor[customer.lifecycle] ?? 'gray'}>
                        {customer.lifecycle ?? '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{customer.joinedAt ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {customer.totalSpend != null ? `฿${customer.totalSpend.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
