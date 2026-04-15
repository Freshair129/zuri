'use client';

import { useState } from 'react';
import Badge from '../ui/Badge';
import { Phone, Mail, Megaphone, Target, Briefcase, Plus, Send, Clock, Sparkles } from 'lucide-react';

const STATUS_FLOW = ['NEW', 'CONTACTED', 'INTERESTED', 'ENROLLED', 'PAID'];

const lifecycleColorMap = {
  NEW: 'gray',
  CONTACTED: 'yellow',
  INTERESTED: 'blue',
  ENROLLED: 'green',
  PAID: 'emerald',
};

export default function ProfileTab({ customer, onUpdate = null }) {
  const [loading, setLoading] = useState(false);
  const displayName = customer.facebookName ?? customer.lineName ?? customer.name ?? 'ลูกค้า';

  const handleStatusChange = async (newStatus) => {
    if (newStatus === customer.lifecycleStage) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifecycleStage: newStatus }),
      });
      const data = await res.json();
      if (onUpdate) onUpdate(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white divide-y divide-gray-100 pb-12">
      {/* 1. Profile Header & Status */}
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shadow-inner uppercase">
            {displayName[0] || '?'}
          </div>
          {customer.intentScore >= 70 && (
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white border-2 border-white animate-bounce shadow-lg">
               <Sparkles size={12} />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900">{displayName}</h3>
          <p className="text-[11px] text-gray-400 font-mono">ID: {customer.customerId ?? customer.id?.split('-')[0]}</p>
        </div>
        
        {/* Status Dropdown */}
        <select
          value={customer.lifecycleStage || 'NEW'}
          disabled={loading}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={`
            mt-1 w-full max-w-[140px] text-center rounded-full text-xs font-bold py-1.5 px-3 border-none shadow-sm cursor-pointer transition-all
            ${lifecycleColorMap[customer.lifecycleStage || 'NEW'] === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
            ${lifecycleColorMap[customer.lifecycleStage || 'NEW'] === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${lifecycleColorMap[customer.lifecycleStage || 'NEW'] === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
            ${lifecycleColorMap[customer.lifecycleStage || 'NEW'] === 'green' ? 'bg-green-100 text-green-800' : ''}
            ${lifecycleColorMap[customer.lifecycleStage || 'NEW'] === 'emerald' ? 'bg-emerald-100 text-emerald-800' : ''}
          `}
        >
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* 2. Contact Info */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Phone className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium">{customer.phonePrimary || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Mail className="h-3.5 w-3.5 text-gray-400" />
          <span className="truncate">{customer.email || '—'}</span>
        </div>
      </div>

      {/* 3. Ads Attribution */}
      <div className="px-5 py-4 space-y-3 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Megaphone className="h-3.5 w-3.5" />
            Ads Attribution
          </div>
          <Badge color="gray">{customer.firstTouchAdId ? 'FB Ads' : 'Direct'}</Badge>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500">Ad ID: <span className="text-gray-900 font-medium font-mono">{customer.firstTouchAdId || 'Direct'}</span></p>
          <button className="text-indigo-600 text-[11px] font-semibold hover:underline">View Campaign ↗</button>
        </div>
      </div>

      {/* 4. Intent & Intelligence */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          <Target className="h-3.5 w-3.5" />
          Customer Intent
        </div>
        <div className="space-y-4 mt-2">
          {/* Purchase Intent Heatmap */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-400 uppercase">Purchase Intent</p>
              <span className={`text-[10px] font-black ${customer.intentScore >= 70 ? 'text-red-500' : 'text-orange-500'}`}>
                {customer.intentScore || 0}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full ${customer.intentScore >= 70 ? 'bg-red-500' : 'bg-orange-500'}`} 
                 style={{ width: `${customer.intentScore || 0}%` }}
               />
            </div>
            {customer.intentScore >= 70 && (
              <p className="text-[9px] font-bold text-red-500 uppercase tracking-tighter animate-pulse">🔥 High Intent / Ready to Buy</p>
            )}
          </div>

          {/* AI Summary */}
          {customer.insight?.summary && (
            <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-xl">
               <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                 <Sparkles size={10} /> AI Insight
               </p>
               <p className="text-[11px] text-indigo-900 leading-relaxed font-medium">
                 {customer.insight.summary}
               </p>
            </div>
          )}

          {/* Fallback to old profile fields if no AI summary */}
          {!customer.insight?.summary && Object.entries(customer.profile || {}).map(([key, val]) => {
            if (['id', 'customerId', 'updatedAt', 'inferenceCount', 'lastInferredAt'].includes(key)) return null;
            if (!val || val.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-[10px] text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-[11px] text-gray-900 font-medium">{Array.isArray(val) ? val.join(', ') : val}</p>
              </div>
            );
          })}
          {(!customer.insight?.summary && (!customer.profile || Object.keys(customer.profile).length === 0)) && (
             <p className="text-[11px] text-gray-400 italic">No intelligence data yet.</p>
          )}
        </div>
      </div>

      {/* 5. Quick Actions (CTAs) */}
      <div className="px-5 py-6 space-y-2 mt-auto">
        <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
          <Briefcase className="h-3.5 w-3.5" />
          ลงเรียน (Enroll)
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 py-2 px-3 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-all">
            <Send className="h-3.5 w-3.5" />
            ส่ง Invoice
          </button>
          <button className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-100 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold transition-all">
            <Clock className="h-3.5 w-3.5" />
            Follow up
          </button>
        </div>
        
        {/* Full Profile Link */}
        <button 
          onClick={() => window.open(`/crm/${customer.id}`, '_blank')}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 hover:text-indigo-600 transition-colors border-t border-gray-50 pt-4"
        >
          View Full Profile <Plus className="h-3 w-3 rotate-45" />
        </button>
      </div>
    </div>
  );
}
