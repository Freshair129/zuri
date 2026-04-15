'use client';

// Kitchen — Procurement page
// Manages the full Purchase Order (PO) lifecycle:
// Draft → Sent → Confirmed → Received → Closed / Cancelled

import { useState, useEffect } from 'react';
import { Search, Plus, Truck, X } from 'lucide-react';

const PO_STATUSES = ['All', 'draft', 'pending_approval', 'approved', 'received', 'cancelled'];
const STATUS_LABELS = {
  draft: 'Draft', pending_approval: 'Pending', approved: 'Approved',
  received: 'Received', cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  draft:            'bg-gray-100 text-gray-600',
  pending_approval: 'bg-blue-100 text-blue-700',
  approved:         'bg-purple-100 text-purple-700',
  received:         'bg-green-100 text-green-700',
  cancelled:        'bg-red-100 text-red-600',
};

function formatCurrency(v) {
  if (v == null) return '—';
  return `฿${Number(v).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ─── New PO Modal ─────────────────────────────────────────────────────────────
function NewPOModal({ onClose, onCreated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ supplierId: '', expectedDeliveryDate: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/procurement/suppliers')
      .then(r => r.json())
      .then(json => setSuppliers(json.data || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplierId) { setError('กรุณาเลือก Supplier'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/procurement/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: form.supplierId,
          items: [],
          expectedDeliveryDate: form.expectedDeliveryDate || undefined,
          note: form.note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'สร้าง PO ไม่ได้');
      onCreated(json.data);
      onClose();
    } catch (err) {
      console.error('[ProcurementPage] create PO', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-bold text-gray-900">New Purchase Order</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier *</label>
            <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50">
              <option value="">เลือก Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {suppliers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">ยังไม่มี Supplier — เพิ่มได้ที่ Settings</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Expected Delivery Date</label>
            <input type="date" value={form.expectedDeliveryDate} onChange={e => set('expectedDeliveryDate', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">หมายเหตุ</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors">
              {saving ? 'กำลังสร้าง...' : '+ สร้าง PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProcurementPage() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch]   = useState('');
  const [pos, setPOs]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchPOs(); }, [statusFilter]);

  async function fetchPOs() {
    setLoading(true);
    try {
      const url = new URL('/api/procurement/po', window.location.origin);
      url.searchParams.set('limit', '30');
      if (statusFilter !== 'All') url.searchParams.set('status', statusFilter);
      const res  = await fetch(url);
      const json = await res.json();
      setPOs(json.data || []);
    } catch (err) {
      console.error('[ProcurementPage] fetch', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? pos.filter(p => p.poNumber?.toLowerCase().includes(search.toLowerCase()) || p.supplier?.name?.toLowerCase().includes(search.toLowerCase()))
    : pos;

  const openCount = pos.filter(p => ['draft','pending_approval','approved'].includes(p.status)).length;
  const pendingValue = pos.filter(p => p.status !== 'received' && p.status !== 'cancelled')
    .reduce((s, p) => s + (p.totalAmount || 0), 0);

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500 mt-0.5">Purchase order lifecycle management</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-orange-100"
        >
          <Plus className="h-4 w-4" /> New PO
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open POs',       value: loading ? '—' : openCount,                    bg: 'bg-blue-50' },
          { label: 'Pending Value',  value: loading ? '—' : formatCurrency(pendingValue),  bg: 'bg-white' },
          { label: 'Total POs',      value: loading ? '—' : pos.length,                   bg: 'bg-white' },
          { label: 'Received',       value: loading ? '—' : pos.filter(p=>p.status==='received').length, bg: 'bg-green-50' },
        ].map(({ label, value, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-100 p-4 shadow-sm`}>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + status pills */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา PO หรือ Supplier..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PO_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'All' ? 'All' : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-2">PO #</div>
          <div className="col-span-3">Supplier</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Expected</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Actions</div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="h-6 w-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">ยังไม่มี Purchase Order</p>
            <button onClick={() => setShowModal(true)} className="mt-3 px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors">
              + New PO
            </button>
          </div>
        ) : filtered.map(po => (
          <div key={po.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-orange-50/20 transition-colors items-center">
            <div className="col-span-2 font-mono text-xs font-semibold text-gray-700">{po.poNumber || po.id?.slice(0,8)}</div>
            <div className="col-span-3 text-sm text-gray-700">{po.supplier?.name || '—'}</div>
            <div className="col-span-2 text-sm font-semibold text-gray-800">{formatCurrency(po.totalAmount)}</div>
            <div className="col-span-2 text-xs text-gray-500">{formatDate(po.expectedDeliveryDate)}</div>
            <div className="col-span-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[po.status] || po.status}
              </span>
            </div>
            <div className="col-span-1 flex gap-1">
              <button className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50" title="View">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <NewPOModal onClose={() => setShowModal(false)} onCreated={po => { setPOs(prev => [po, ...prev]); }} />
      )}
    </div>
  );
}
