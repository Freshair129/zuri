'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { User, Tag, ArrowRight, MessageSquare, Briefcase } from 'lucide-react';

const ACTION_ICONS = {
  CUSTOMER_UPDATE: User,
  STATUS_CHANGED: ArrowRight,
  TAGS_UPDATED: Tag,
  ORDER_CREATED: Briefcase,
  NOTE_ADDED: MessageSquare,
};

export default function ActivityTab({ customerId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/customers/${customerId}/activity`)
      .then((res) => res.json())
      .then((res) => {
        setLogs(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [customerId]);

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading activity...</div>;
  if (logs.length === 0) return <div className="p-8 text-center text-gray-400 text-sm">No activity logged yet.</div>;

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="relative space-y-6 after:absolute after:inset-y-0 after:left-4 after:w-px after:bg-gray-100 after:-z-10">
        {logs.map((log) => {
          const Icon = ACTION_ICONS[log.action] || MessageSquare;
          return (
            <div key={log.id} className="flex gap-4 items-start group">
              <div className="h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 z-10 transition-colors group-hover:border-indigo-200">
                <Icon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {parseActionText(log)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {log.actor} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {log.details?.changes && (
                  <div className="mt-2 bg-gray-50/50 rounded-lg p-2 text-[11px] text-gray-500 font-mono">
                    {JSON.stringify(log.details.changes, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseActionText(log) {
  switch (log.action) {
    case 'CUSTOMER_UPDATE':
      return 'Updated profile information';
    case 'STATUS_CHANGED':
      return `Changed status to ${log.details?.to || 'Unknown'}`;
    case 'TAGS_UPDATED':
      return 'Modified tags/labels';
    default:
      return log.action.replace(/_/g, ' ').toLowerCase();
  }
}
