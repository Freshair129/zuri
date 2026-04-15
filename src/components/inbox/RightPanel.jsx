'use client';

import { useState } from 'react';
import ProfileTab from './ProfileTab';
import ActivityTab from './ActivityTab';
import { User, Activity, CreditCard } from 'lucide-react';

const TABS = [
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function RightPanel({ customer = null, onUpdate = null }) {
  const [activeTab, setActiveTab] = useState('activity');

  if (!customer) {
    return (
      <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex items-center justify-center text-gray-400 text-sm">
        Select a conversation to view details.
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors
                ${isActive ? 'text-indigo-600 bg-indigo-50/30 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
              `}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'activity' && <ActivityTab customerId={customer.id} />}
        {activeTab === 'profile' && <ProfileTab customer={customer} onUpdate={onUpdate} />}
        {activeTab === 'billing' && (
          <div className="p-8 text-center text-gray-400 text-sm">
            Billing history coming soon (Phase 3).
          </div>
        )}
      </div>
    </div>
  );
}
