'use client';

// Marketing — Daily Strategy Brief (DSB)
// AI-generated daily marketing brief showing yesterday's performance,
// recommended actions, budget pacing, and alerts. Filterable by date.

import { useState } from 'react';

export default function DailyBriefPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Strategy Brief</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-generated daily marketing performance summary</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date filter */}
          {/* TODO: Replace with a DatePicker component (react-day-picker / shadcn/ui) */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          {/* TODO: Send brief via email button */}
          <div className="h-9 w-32 bg-orange-500 rounded-lg" />
        </div>
      </div>

      {/* Brief meta info bar */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* AI generated indicator */}
          <div className="h-6 w-6 bg-orange-200 rounded-full" />
          <div className="space-y-1">
            <div className="h-4 w-48 bg-orange-200 rounded" />
            <div className="h-3 w-32 bg-orange-100 rounded" />
          </div>
        </div>
        {/* TODO: regenerate brief button */}
        <div className="h-8 w-28 bg-orange-200 rounded-lg" />
      </div>

      {/* TODO: Executive summary block (AI narrative text) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Executive Summary</h2>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-4 w-4/5 bg-gray-100 rounded" />
          <div className="h-4 w-2/3 bg-gray-100 rounded" />
        </div>
      </div>

      {/* KPI snapshot grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend (Yesterday)', trend: 'up', color: 'text-green-600' },
          { label: 'Revenue Generated', trend: 'up', color: 'text-green-600' },
          { label: 'ROAS', trend: 'down', color: 'text-red-500' },
          { label: 'New Leads', trend: 'up', color: 'text-green-600' },
        ].map(({ label, trend, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <div className="h-7 w-20 bg-gray-100 rounded mt-2 animate-pulse" />
            <div className={`flex items-center gap-1 mt-1 ${color}`}>
              <div className="h-3 w-3 bg-current opacity-30 rounded-sm" />
              <div className="h-3 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* TODO: Channel performance breakdown table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Channel Performance</h2>
          <div className="space-y-0">
            <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-gray-400 pb-2 border-b border-gray-100">
              <div className="col-span-2">Channel</div>
              <div>Spend</div>
              <div>Revenue</div>
              <div>ROAS</div>
            </div>
            {['Meta Ads', 'Google Ads', 'LINE OA', 'TikTok', 'Email'].map((ch) => (
              <div key={ch} className="grid grid-cols-5 gap-2 py-2.5 border-b border-gray-50 items-center">
                <div className="col-span-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-300" />
                  <span className="text-sm text-gray-600">{ch}</span>
                </div>
                <div className="h-4 w-14 bg-gray-100 rounded" />
                <div className="h-4 w-14 bg-gray-100 rounded" />
                {/* TODO: color-code ROAS */}
                <div className="h-4 w-10 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* TODO: Recommended actions list (AI-generated) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recommended Actions</h2>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                {/* Priority badge */}
                <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-red-100 text-red-600' : i === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {['!', '!', 'i', 'i'][i]}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-4/5 bg-gray-100 rounded" />
                </div>
                {/* TODO: Mark done / Dismiss button */}
                <div className="h-6 w-6 bg-gray-100 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TODO: Budget pacing section — daily spend vs daily target per campaign */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Budget Pacing</h2>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-40 flex-shrink-0">
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-orange-400 rounded-full"
                    style={{ width: `${25 + i * 18}%` }}
                  />
                </div>
              </div>
              {/* pacing % */}
              <div className="w-12 flex-shrink-0">
                <div className="h-4 w-10 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TODO: Alerts section — anomaly detection, budget warnings, low CTR flags */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Alerts</h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                i === 0 ? 'border-red-100 bg-red-50' : 'border-yellow-100 bg-yellow-50'
              }`}
            >
              <div className={`h-4 w-4 rounded-full flex-shrink-0 ${i === 0 ? 'bg-red-300' : 'bg-yellow-300'}`} />
              <div className="h-4 w-72 bg-gray-200 rounded" />
              <div className="ml-auto h-6 w-16 bg-white rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
