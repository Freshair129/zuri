'use client';

import Badge from '../ui/Badge';

function StockStatus({ current, min }) {
  if (current === 0) return <Badge color="red">Out of Stock</Badge>;
  if (current <= min) return <Badge color="yellow">Low Stock</Badge>;
  return <Badge color="green">OK</Badge>;
}

function ExpiryAlert({ expiryDate }) {
  if (!expiryDate) return <span className="text-gray-400 text-sm">—</span>;
  const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <Badge color="red">Expired</Badge>;
  if (days <= 7) return <Badge color="yellow">{days}d left</Badge>;
  return <span className="text-sm text-gray-600">{expiryDate}</span>;
}

export default function StockTable({ ingredients = [], loading = false, onReorder }) {
  const columns = ['Ingredient', 'Unit', 'Current Stock', 'Min Stock', 'Lots', 'Nearest Expiry', 'Status'];

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
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No ingredients found.
                  </td>
                </tr>
              )
            : ingredients.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.currentStock <= item.minStock ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.currentStock}</td>
                  <td className="px-4 py-3 text-gray-600">{item.minStock}</td>
                  <td className="px-4 py-3 text-gray-600">{item.lotCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <ExpiryAlert expiryDate={item.nearestExpiry} />
                  </td>
                  <td className="px-4 py-3">
                    <StockStatus current={item.currentStock} min={item.minStock} />
                  </td>
                  <td className="px-4 py-3">
                    {item.currentStock <= item.minStock && (
                      <button
                        onClick={() => onReorder?.(item)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Reorder
                      </button>
                    )}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
