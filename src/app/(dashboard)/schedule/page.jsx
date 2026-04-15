'use client';

// Schedule — Calendar view + QR attendance
// Shows class sessions on a week/month calendar.
// Staff can generate QR codes for each session to mark student attendance.

import { useState } from 'react';

const VIEWS = ['Day', 'Week', 'Month'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00 – 17:00

export default function SchedulePage() {
  const [calView, setCalView] = useState('Week');
  const [showQRModal, setShowQRModal] = useState(false);

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage class sessions and attendance</p>
        </div>
        <div className="flex gap-2">
          {/* TODO: Generate QR button → opens QR modal for session selection */}
          <button
            onClick={() => setShowQRModal(true)}
            className="h-9 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            QR Attendance
          </button>
          {/* TODO: New session button */}
          <div className="h-9 w-32 bg-orange-500 rounded-lg" />
        </div>
      </div>

      {/* Calendar toolbar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        {/* Navigation arrows + current period label */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gray-100 rounded-lg" />
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-8 bg-gray-100 rounded-lg" />
        </div>

        <div className="flex items-center gap-3">
          {/* TODO: Course / Room / Instructor filter dropdowns */}
          <div className="h-8 w-28 bg-gray-100 rounded-lg" />
          <div className="h-8 w-28 bg-gray-100 rounded-lg" />

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setCalView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  calView === v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Day-of-week header */}
        <div className="grid grid-cols-8 border-b border-gray-100">
          <div className="p-3 text-xs text-gray-400 border-r border-gray-100" />
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="p-3 text-center border-r border-gray-50 last:border-0">
              <p className="text-xs text-gray-400 font-medium">{d}</p>
              {/* TODO: date number, highlight today */}
              <div className="h-7 w-7 rounded-full bg-gray-100 mx-auto mt-1" />
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="overflow-y-auto max-h-[520px]">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-50 min-h-[56px]">
              <div className="px-3 pt-2 border-r border-gray-100">
                <span className="text-xs text-gray-400">{hour}:00</span>
              </div>
              {/* TODO: render SessionBlock components positioned by start/end time */}
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="border-r border-gray-50 last:border-0 relative hover:bg-orange-50/30 transition-colors cursor-pointer"
                >
                  {/* Placeholder event block example */}
                  {hour === 9 && i === 1 && (
                    <div className="absolute inset-x-1 top-1 h-12 bg-orange-100 border border-orange-200 rounded p-1">
                      <div className="h-3 w-20 bg-orange-300 rounded" />
                      <div className="h-2.5 w-14 bg-orange-200 rounded mt-1" />
                    </div>
                  )}
                  {hour === 10 && i === 3 && (
                    <div className="absolute inset-x-1 top-1 h-16 bg-blue-50 border border-blue-200 rounded p-1">
                      <div className="h-3 w-16 bg-blue-200 rounded" />
                      <div className="h-2.5 w-12 bg-blue-100 rounded mt-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* QR Attendance Modal */}
      {/* TODO: Replace with a real modal (Dialog from Radix / shadcn) */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">QR Attendance</h2>
            <p className="text-sm text-gray-500">Select a session to generate a QR code</p>

            {/* TODO: session selector dropdown */}
            <div className="h-10 bg-gray-100 rounded-lg" />

            {/* TODO: QR code rendered with qrcode.react */}
            <div className="h-48 w-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center">
              <span className="text-xs text-gray-400">QR code here</span>
            </div>

            {/* TODO: Download QR / Copy link / Auto-expire timer */}
            <div className="flex gap-2">
              <div className="flex-1 h-9 bg-orange-500 rounded-lg" />
              <div className="h-9 w-9 bg-gray-100 rounded-lg" />
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TODO: Upcoming sessions mini-list sidebar (toggle panel) */}
    </div>
  );
}
