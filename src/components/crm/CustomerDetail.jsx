'use client';

import { useState } from 'react';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

const TABS = ['Info', 'Orders', 'Conversations', 'Enrollment'];

const lifecycleColor = {
  Lead: 'yellow',
  Prospect: 'blue',
  Active: 'green',
  Churned: 'red',
};

function InfoTab({ customer }) {
  const fields = [
    { label: 'Phone', value: customer.phone },
    { label: 'Email', value: customer.email },
    { label: 'Line ID', value: customer.lineId },
    { label: 'Facebook', value: customer.facebook },
    { label: 'Address', value: customer.address },
    { label: 'Date of Birth', value: customer.dob },
    { label: 'Joined', value: customer.joinedAt },
    { label: 'Notes', value: customer.notes },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

function OrdersTab({ orders = [] }) {
  if (orders.length === 0) return <p className="text-sm text-gray-400">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
            <p className="text-xs text-gray-500">{order.date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">฿{order.total?.toLocaleString()}</p>
            <Badge color={order.statusColor ?? 'gray'}>{order.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationsTab({ conversations = [] }) {
  if (conversations.length === 0) return <p className="text-sm text-gray-400">No conversations yet.</p>;
  return (
    <div className="space-y-2">
      {conversations.map((conv) => (
        <div key={conv.id} className="flex items-center gap-3 py-2 border-b border-gray-100">
          <Badge color={conv.channel === 'FB' ? 'blue' : 'green'}>{conv.channel}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 truncate">{conv.lastMessage}</p>
          </div>
          <span className="text-xs text-gray-400">{conv.time}</span>
        </div>
      ))}
    </div>
  );
}

function EnrollmentTab({ enrollments = [] }) {
  if (enrollments.length === 0) return <p className="text-sm text-gray-400">No enrollments yet.</p>;
  return (
    <div className="space-y-3">
      {enrollments.map((e) => (
        <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-900">{e.courseName}</p>
            <p className="text-xs text-gray-500">{e.enrolledAt}</p>
          </div>
          <Badge color={e.statusColor ?? 'blue'}>{e.status}</Badge>
        </div>
      ))}
    </div>
  );
}

export default function CustomerDetail({ customer = null }) {
  const [activeTab, setActiveTab] = useState('Info');

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Select a customer to view details.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl shrink-0">
            {customer.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <Badge color={lifecycleColor[customer.lifecycle] ?? 'gray'}>
                {customer.lifecycle ?? 'Unknown'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact info'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Spend</p>
            <p className="text-2xl font-bold text-indigo-600">
              ฿{(customer.totalSpend ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card noPadding>
        <div className="flex border-b border-gray-200 px-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-5 py-3.5 text-sm font-medium transition-colors
                ${activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'Info' && <InfoTab customer={customer} />}
          {activeTab === 'Orders' && <OrdersTab orders={customer.orders} />}
          {activeTab === 'Conversations' && <ConversationsTab conversations={customer.conversations} />}
          {activeTab === 'Enrollment' && <EnrollmentTab enrollments={customer.enrollments} />}
        </div>
      </Card>
    </div>
  );
}
