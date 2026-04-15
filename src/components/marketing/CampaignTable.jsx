'use client';

import Badge from '../ui/Badge';

const statusColor = {
  Active: 'green',
  Paused: 'yellow',
  Ended: 'gray',
  Draft: 'blue',
};

export default function CampaignTable({ campaigns = [], loading = false, onRowClick }) {
  const columns = ['Campaign', 'Status', 'Spend', 'Revenue', 'ROAS', 'Clicks', 'CPL'];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No campaigns found.
                  </td>
                </tr>
              )
            : campaigns.map((c) => {
                const roas = c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '—';
                const cpl = c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : '—';
                return (
                  <tr
                    key={c.id}
                    onClick={() => onRowClick?.(c)}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor[c.status] ?? 'gray'}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">฿{c.spend?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">฿{c.revenue?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${parseFloat(roas) >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                        {roas}x
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.clicks?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{cpl !== '—' ? `฿${cpl}` : '—'}</td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
