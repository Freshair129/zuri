'use client';

import { useState, useCallback } from 'react';
import { useSession } from '@/hooks/useSession';
import Sidebar from '@/components/layouts/Sidebar';
import Topbar from '@/components/layouts/Topbar';
import { TenantProvider } from '@/context/TenantContext';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isLoading } = useSession();

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <TenantProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Topbar: module switcher tabs + user */}
        <Topbar user={user} onMenuToggle={openSidebar} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar: hidden on mobile, visible on md+ */}
          <Sidebar mobileOpen={sidebarOpen} onClose={closeSidebar} />

          {/* Main content area — full width on mobile */}
          <main className="flex-1 overflow-y-auto custom-scrollbar w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  );
}
