'use client';

// Courses — Course detail page
// Shows course info, curriculum, enrolled students list, sessions, and attendance data.

import { useState } from 'react';

const TABS = ['Overview', 'Curriculum', 'Students', 'Sessions', 'Settings'];

export default function CourseDetailPage({ params }) {
  const [activeTab, setActiveTab] = useState('Overview');
  // TODO: const { data: course } = useSWR(`/api/courses/${params.id}`)

  return (
    <div className="p-6 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/courses" className="hover:text-orange-500 transition-colors">Courses</a>
        <span>/</span>
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Course hero header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cover image / banner */}
        <div className="h-40 bg-gradient-to-r from-orange-200 to-amber-100 relative">
          {/* TODO: edit cover image button */}
          <div className="absolute top-3 right-3 h-8 w-24 bg-white/70 rounded-lg" />
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              {/* Course title */}
              <div className="h-7 w-64 bg-gray-200 rounded animate-pulse" />
              {/* Instructor + category */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-200" />
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-5 w-20 bg-orange-50 rounded-full" />
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 flex-shrink-0">
              {/* TODO: Publish / Edit / Duplicate / Archive */}
              <div className="h-9 w-24 bg-gray-100 rounded-lg" />
              <div className="h-9 w-24 bg-orange-500 rounded-lg" />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100">
            {['Duration', 'Level', 'Enrolled', 'Capacity', 'Completion Rate'].map((label) => (
              <div key={label}>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <div className="h-5 w-14 bg-gray-100 rounded mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Description</h3>
              {/* TODO: Rich text editor (Tiptap / Lexical) */}
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
                <div className="h-4 w-4/6 bg-gray-100 rounded" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700 pt-2">What students will learn</h3>
              {/* TODO: bullet list of learning outcomes */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-green-100 rounded-sm flex-shrink-0" />
                  <div className="h-3.5 w-56 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
            {/* Sidebar details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Details</h3>
              {['Start Date', 'End Date', 'Schedule', 'Location / Room', 'Price', 'Instructor'].map((f) => (
                <div key={f} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400">{f}</span>
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Curriculum' && (
          // TODO: Drag-and-drop module/lesson list (react-beautiful-dnd or dnd-kit)
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50">
                  <div className="h-4 w-4 bg-gray-300 rounded flex-shrink-0" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="ml-auto h-4 w-16 bg-gray-100 rounded" />
                </div>
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 hover:bg-gray-50">
                    <div className="h-4 w-4 bg-gray-200 rounded flex-shrink-0" />
                    <div className="h-3.5 w-48 bg-gray-100 rounded" />
                    <div className="ml-auto h-3.5 w-12 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ))}
            <button className="text-sm text-orange-500 hover:underline">+ Add module</button>
          </div>
        )}

        {activeTab === 'Students' && (
          // TODO: Enrolled students table with attendance %, grade, payment status
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex gap-3">
              <div className="flex-1 h-9 bg-gray-50 border border-gray-200 rounded-lg" />
              <div className="h-9 w-32 bg-orange-500 rounded-lg" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-36 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                {/* attendance bar */}
                <div className="w-24 space-y-1">
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-orange-400 rounded-full" style={{ width: `${50 + i * 8}%` }} />
                  </div>
                </div>
                <div className="h-5 w-16 bg-green-50 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Sessions' && (
          // TODO: Session schedule list with date, time, room, attendance count
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="h-10 w-10 bg-orange-50 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
                <div className="h-5 w-20 bg-blue-50 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Settings' && (
          // TODO: Course settings (visibility, enrollment cap, prerequisites, certificate template)
          <div className="space-y-5 max-w-lg">
            {['Enrollment Cap', 'Prerequisite Course', 'Certificate Template', 'Visibility'].map((label) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg" />
              </div>
            ))}
            <div className="h-9 w-24 bg-orange-500 rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
