// Created At: 2026-04-12 03:00:00 +07:00 (v1.0.1)
// Previous version: 2026-04-12 03:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 03:40:00 +07:00 (v1.1.0)

'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Users, TrendingUp, DollarSign, Calendar,
  ExternalLink, UserCheck, UserMinus, ChevronRight
} from 'lucide-react';

/**
 * Premium Interactive Employee Card with Stack Physics
 * Implements FEAT20 — Interactive Employee Card (Deck View)
 */
export default function EmployeeCardInteractive({ employee, kpis, onSwipe, index }) {
  const [status, setStatus] = useState(employee.status || 'ACTIVE');
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const getInitials = (f, l) => `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase() || 'E';

  const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);

  function handleDragEnd(_, info) {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(employee.id);
    }
  }

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: 100 - index }}
      drag="x"
      dragConstraints={{ left: -400, right: 400 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.25 } }}
      className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing p-4"
    >
      <div className="relative w-full max-w-[340px] h-[520px] rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] bg-white/10 backdrop-blur-2xl border border-white/20 flex flex-col">
        
        {/* Background Decorative Gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        {/* 1. Header Area */}
        <div className="p-8 pb-4 flex flex-col items-center text-center relative z-10">
          <div className="relative mb-4">
             <div className="h-24 w-24 rounded-full bg-gradient-to-br from-brand/40 to-brand/10 border-2 border-white/30 flex items-center justify-center text-3xl font-black text-white shadow-[0_8px_32px_rgba(232,130,12,0.3)]">
               {getInitials(employee.firstName, employee.lastName)}
             </div>
             <div className={`absolute bottom-0 right-0 h-6 w-6 rounded-full border-4 border-[#1a1a1a] ${status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </div>

          <h3 className="text-2xl font-bold text-white font-prompt tracking-tight">
            {employee.firstName} {employee.lastName}
          </h3>
          <p className="text-white/60 text-sm font-medium mt-1">
            {employee.jobTitle || 'Team Member'}
          </p>
          <div className="mt-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-extrabold text-white/80 tracking-widest uppercase">
            {employee.department || 'GENERAL'} • #{employee.employeeId?.split('-')?.pop() || '000'}
          </div>
        </div>

        {/* 2. Dashboard (KPIs) */}
        <div className="px-6 py-4 grid grid-cols-2 gap-3 relative z-10">
          <KPITile 
            icon={Users} 
            label="Customers" 
            value={kpis?.customers || 0} 
            sub="Active Accounts" 
          />
          <KPITile 
            icon={DollarSign} 
            label="Sales" 
            value={formatCurrency(kpis?.sales || 0)} 
            sub={`Growth: ${kpis?.growth || 0}%`}
            highlight={kpis?.growth > 0}
          />
          <KPITile 
            icon={Calendar} 
            label="Tenure" 
            value={`${kpis?.tenure || 0} Mo`} 
            sub="Total Experience" 
          />
          <KPITile 
            icon={TrendingUp} 
            label="Perf. Score" 
            value={kpis?.score || 0} 
            sub="Weighted Rank" 
          />
        </div>

        {/* 3. Footer / Actions */}
        <div className="mt-auto p-6 bg-black/20 backdrop-blur-lg flex gap-2 border-t border-white/5 relative z-10">
          <button 
            onClick={() => setStatus(s => s === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
            className={`flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              status === 'ACTIVE' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {status === 'ACTIVE' ? <UserCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
            {status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </button>
          
          <button className="h-[46px] w-[46px] bg-brand rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(232,130,12,0.3)] hover:scale-105 transition-all">
            <ExternalLink className="h-5 w-5" />
          </button>
        </div>

        {/* Swipe Instruction Overlay (Faint) */}
        <div className="absolute inset-x-0 bottom-24 flex justify-center opacity-20 pointer-events-none">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest">
            Swipe to Next <ChevronRight className="h-3 w-3 animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KPITile({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-1">
      <div className="flex items-center gap-2 text-white/40 mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-white leading-tight truncate">
        {value}
      </div>
      <div className={`text-[9px] font-medium truncate ${highlight ? 'text-emerald-400' : 'text-white/40'}`}>
        {sub}
      </div>
    </div>
  );
}
