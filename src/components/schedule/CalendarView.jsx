'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function ClassCard({ cls }) {
  return (
    <div className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-indigo-200 transition-colors">
      {cls.time} {cls.name}
    </div>
  );
}

export default function CalendarView({ classes = [], onDateClick, onClassClick }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const { year, month } = viewDate;
  const calDays = getCalendarDays(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setViewDate(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );

  const getClassesForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return classes.filter((c) => c.date === dateStr);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewDate({ year: today.getFullYear(), month: today.getMonth() })}
            className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
          >
            Today
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calDays.map((day, idx) => {
          const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const dayClasses = getClassesForDay(day);
          return (
            <div
              key={idx}
              onClick={() => day && onDateClick?.({ year, month, day })}
              className={`
                min-h-[80px] p-2 border-b border-r border-gray-100
                ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
              `}
            >
              {day && (
                <>
                  <span className={`
                    inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium
                    ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}
                  `}>
                    {day}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayClasses.slice(0, 2).map((cls, i) => (
                      <ClassCard key={i} cls={cls} onClick={() => onClassClick?.(cls)} />
                    ))}
                    {dayClasses.length > 2 && (
                      <span className="text-[10px] text-gray-400 pl-1">+{dayClasses.length - 2} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
