'use client';

import { useState } from 'react';
import { Phone, Mail, Tag, Megaphone, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import Badge from '../ui/Badge';

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function CustomerCard({ customer = null }) {
  if (!customer) {
    return (
      <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex items-center justify-center text-gray-400 text-sm">
        No customer selected.
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-4 border-b border-gray-100 text-center">
        <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
          {customer.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{customer.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">ID: #{customer.id}</p>
        </div>
        <Badge color={customer.lifecycleColor ?? 'indigo'}>{customer.lifecycle ?? 'Lead'}</Badge>
      </div>

      {/* Contact info */}
      <Section title="Contact" icon={Phone}>
        <div className="space-y-2 text-sm text-gray-700">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-gray-400" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Labels */}
      <Section title="Labels" icon={Tag}>
        <div className="flex flex-wrap gap-1.5">
          {(customer.labels ?? []).map((label) => (
            <Badge key={label} color="gray">{label}</Badge>
          ))}
          {(!customer.labels || customer.labels.length === 0) && (
            <p className="text-xs text-gray-400">No labels assigned.</p>
          )}
        </div>
      </Section>

      {/* Ad attribution */}
      <Section title="Ad Attribution" icon={Megaphone} defaultOpen={false}>
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">Campaign</span>
            <span className="font-medium">{customer.adCampaign ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ad Set</span>
            <span className="font-medium">{customer.adSet ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Source</span>
            <span className="font-medium">{customer.adSource ?? '—'}</span>
          </div>
        </div>
      </Section>

      {/* Courses owned */}
      <Section title="Courses Owned" icon={BookOpen} defaultOpen={false}>
        <div className="space-y-2">
          {(customer.courses ?? []).map((course, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate">{course.name}</span>
              <Badge color={course.statusColor ?? 'blue'}>{course.status}</Badge>
            </div>
          ))}
          {(!customer.courses || customer.courses.length === 0) && (
            <p className="text-xs text-gray-400">No courses purchased.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
