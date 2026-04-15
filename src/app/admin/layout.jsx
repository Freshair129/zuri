'use client';

// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

// Platform Admin Layout — app.zuri.app
// Restricted to DEV role. No tenant context — platform-wide view.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

const NAV = [
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/usage',   label: 'Usage' },
];

export default function AdminLayout({ children }) {
  const pathname  = usePathname();
  const { user }  = useSession();

  const isDev = user?.roles?.includes('DEV');

  if (user && !isDev) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">403</p>
          <p className="text-sm text-gray-500 mt-1">DEV role required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top nav */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 gap-6">
        <span className="text-sm font-bold text-orange-400 tracking-wide">ZURI ADMIN</span>
        <nav className="flex items-center gap-1 ml-2">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto text-xs text-gray-500">
          {user?.email}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
