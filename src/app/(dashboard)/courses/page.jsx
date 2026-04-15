'use client';

// Created At: 2026-04-12 03:00:00 +07:00 (v1.0.0)
// Previous version: 2026-04-12 03:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 08:15:00 +07:00 (v2.0.0)
// Courses — Course list + Enrollment Flow (FEAT07 Phase 1) [ZUR-19]

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, BookOpen, Clock, Users, X, ChevronRight,
  UserPlus, CheckCircle, XCircle, Loader2, AlertCircle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FILTERS = ['All', 'Active', 'Inactive'];
const STATUS_COLORS  = {
  Active:   'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-500',
};
const ENROLLMENT_STATUS_STYLES = {
  PENDING:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  CONFIRMED:   'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-brand/10 text-brand border-brand/20',
  COMPLETED:   'bg-green-50 text-green-700 border-green-200',
  CANCELLED:   'bg-gray-50 text-gray-500 border-gray-200',
};
const ENROLLMENT_STATUS_LABELS = {
  PENDING: 'รอยืนยัน', CONFIRMED: 'ยืนยันแล้ว',
  IN_PROGRESS: 'กำลังเรียน', COMPLETED: 'เรียนจบ', CANCELLED: 'ยกเลิก',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(price) {
  return price ? `฿${Number(price).toLocaleString()}` : 'ฟรี';
}
function customerName(c) {
  if (!c) return '—';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || '—';
}

// ─── New Course Modal ─────────────────────────────────────────────────────────
function NewCourseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', basePrice: '', hours: '',
    sessionType: 'GROUP', category: 'COURSE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อหลักสูตร'); return; }
    setSaving(true); setError(null);
    try {
      const res  = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          description: form.description.trim() || undefined,
          category:    'COURSE',
          basePrice:   form.basePrice ? Number(form.basePrice) : 0,
          hours:       form.hours     ? Number(form.hours)     : undefined,
          sessionType: form.sessionType,
          isPosVisible: true,
          isActive:     true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'สร้างหลักสูตรไม่ได้');
      onCreated(json.data);
      onClose();
    } catch (err) {
      console.error('[CoursesPage] create', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand" />
            <h2 className="text-base font-bold text-gray-900">New Course</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อหลักสูตร *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="เช่น Basic Thai Cooking" autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ราคา (บาท)</label>
              <input type="number" value={form.basePrice} onChange={e => set('basePrice', e.target.value)}
                placeholder="0" min="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">จำนวนชั่วโมง</label>
              <input type="number" value={form.hours} onChange={e => set('hours', e.target.value)}
                placeholder="6" min="0" step="0.5"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภทเรียน</label>
            <select value={form.sessionType} onChange={e => set('sessionType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40">
              <option value="GROUP">Group</option>
              <option value="PRIVATE">Private 1:1</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">คำอธิบาย</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="รายละเอียดหลักสูตร..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-60 transition-colors">
              {saving ? 'กำลังบันทึก...' : '+ สร้างหลักสูตร'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Enroll Student Modal ─────────────────────────────────────────────────────
function EnrollModal({ course, onClose, onEnrolled }) {
  const [customers, setCustomers]   = useState([]);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [loadingC, setLoadingC]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    async function loadCustomers() {
      setLoadingC(true);
      try {
        const url = `/api/customers?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        const res  = await fetch(url);
        const json = await res.json();
        setCustomers(json.data || []);
      } catch (err) {
        console.error('[EnrollModal] loadCustomers', err);
      } finally {
        setLoadingC(false);
      }
    }
    loadCustomers();
  }, [search]);

  async function handleEnroll() {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selected.id,
          productId:  course.id,
          totalPrice: course.basePrice || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ลงทะเบียนไม่ได้');
      onEnrolled(json.data);
      onClose();
    } catch (err) {
      console.error('[EnrollModal] enroll', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand/5 to-transparent">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand" />
              <h2 className="text-base font-bold text-gray-900">ลงทะเบียนนักเรียน</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{course.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Course Summary */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-sm">
            <span className="text-gray-500">ราคา</span>
            <span className="font-bold text-brand">{formatPrice(course.basePrice)}</span>
          </div>

          {/* Customer Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">เลือกลูกค้า *</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                placeholder="ค้นหาชื่อ, เบอร์, อีเมล..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
              {loadingC ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="h-5 w-5 text-gray-300 animate-spin" />
                </div>
              ) : customers.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">ไม่พบลูกค้า</div>
              ) : (
                customers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      selected?.id === c.id
                        ? 'bg-brand/5 border-l-2 border-brand'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {(c.firstName?.[0] || c.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {customerName(c)}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">{c.phone || c.email || '—'}</div>
                    </div>
                    {selected?.id === c.id && (
                      <CheckCircle className="h-4 w-4 text-brand flex-shrink-0 ml-auto" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            ยกเลิก
          </button>
          <button onClick={handleEnroll} disabled={!selected || saving}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(232,130,12,0.25)]">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                กำลังลงทะเบียน...
              </span>
            ) : '✓ ลงทะเบียน'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Enrollment Drawer ────────────────────────────────────────────────────────
function EnrollmentDrawer({ course, onClose }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  const load = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/enrollments?productId=${course.id}`);
      const json = await res.json();
      setEnrollments(json.data || []);
    } catch (err) {
      console.error('[EnrollmentDrawer] load', err);
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => { load(); }, [load]);

  function handleEnrolled(newEnrollment) {
    setEnrollments(prev => [newEnrollment, ...prev]);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-brand/5 to-transparent flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <h2 className="text-base font-bold text-gray-900 truncate max-w-[260px]">{course?.name}</h2>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {course?.hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.hours}h</span>}
              <span className="font-semibold text-brand">{formatPrice(course?.basePrice)}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{enrollments.length} คน</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Enroll Button */}
        <div className="px-6 py-4 border-b border-gray-50 flex-shrink-0">
          <button
            onClick={() => setShowEnrollModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-all shadow-[0_4px_12px_rgba(232,130,12,0.2)]"
          >
            <UserPlus className="h-4 w-4" />
            ลงทะเบียนนักเรียนใหม่
          </button>
        </div>

        {/* Enrollment List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">กำลังโหลด...</p>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">ยังไม่มีนักเรียนลงทะเบียน</p>
              <p className="text-xs text-gray-300 mt-1">กดปุ่มด้านบนเพื่อเพิ่มนักเรียนคนแรก</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {enrollments.map(enr => (
                <div key={enr.id} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-brand/10 text-brand text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {(enr.customer?.firstName?.[0] || '?').toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {customerName(enr.customer)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ENROLLMENT_STATUS_STYLES[enr.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                        {ENROLLMENT_STATUS_LABELS[enr.status] || enr.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(enr.enrolledAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>
                  {/* Price */}
                  <div className="text-xs font-bold text-gray-700 flex-shrink-0">
                    {formatPrice(enr.totalPrice)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Enroll Modal (on top of drawer) */}
      <AnimatePresence>
        {showEnrollModal && (
          <EnrollModal
            course={course}
            onClose={() => setShowEnrollModal(false)}
            onEnrolled={handleEnrolled}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [view, setView]           = useState('Grid');
  const [statusFilter, setStatus] = useState('All');
  const [search, setSearch]       = useState('');
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeCourse, setActiveCourse] = useState(null); // drives drawer

  useEffect(() => { fetchCourses(); }, [statusFilter, search]);

  async function fetchCourses() {
    setLoading(true);
    try {
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.set('category', 'COURSE');
      url.searchParams.set('limit', '50');
      if (search) url.searchParams.set('search', search);
      if (statusFilter === 'Active')   url.searchParams.set('isActive', 'true');
      if (statusFilter === 'Inactive') url.searchParams.set('isActive', 'false');
      const res  = await fetch(url);
      const json = await res.json();
      
      // Robust extraction: Handle paginated {products: []} or legacy []
      const data = json.data?.products ?? (Array.isArray(json.data) ? json.data : []);
      setCourses(data);
    } catch (err) {
      console.error('[CoursesPage] fetch', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage your culinary programs</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-colors shadow-md shadow-brand/10"
        >
          <Plus className="h-4 w-4" /> New Course
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: courses.length },
          { label: 'Active',        value: courses.filter(c => c.isActive).length },
          { label: 'Inactive',      value: courses.filter(c => !c.isActive).length },
          { label: 'Avg Price',     value: courses.length
              ? formatPrice(courses.reduce((s, c) => s + (c.basePrice || 0), 0) / courses.length)
              : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาหลักสูตร..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Status pills */}
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatus(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === f ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {['Grid', 'List'].map(m => (
              <button key={m} onClick={() => setView(m)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${view === m ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className={view === 'Grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
          <BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">ยังไม่มีหลักสูตร</p>
          <p className="text-xs text-gray-400 mb-4">สร้างหลักสูตรแรกของคุณได้เลย</p>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-colors">
            + New Course
          </button>
        </div>
      ) : view === 'Grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveCourse(course)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-brand/30 transition-all cursor-pointer group"
            >
              <div className="h-36 bg-gradient-to-br from-brand/10 to-amber-50 flex items-center justify-center relative overflow-hidden">
                {course.imageUrl ? (
                  <img src={course.imageUrl} alt={course.name} className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-10 w-10 text-brand/30" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs font-bold text-brand bg-white/90 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> ดูนักเรียน
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${course.isActive ? STATUS_COLORS.Active : STATUS_COLORS.Inactive}`}>
                    {course.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {course.sessionType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">
                      {course.sessionType}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-brand transition-colors">{course.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {course.hours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.hours}h</span>}
                  <span className="font-semibold text-brand">{formatPrice(course.basePrice)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-5">หลักสูตร</div>
            <div className="col-span-2">ประเภท</div>
            <div className="col-span-2">ชั่วโมง</div>
            <div className="col-span-2">ราคา</div>
            <div className="col-span-1">Status</div>
          </div>
          {courses.map(course => (
            <div
              key={course.id}
              onClick={() => setActiveCourse(course)}
              className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-50 hover:bg-brand/5 items-center cursor-pointer transition-colors"
            >
              <div className="col-span-5 font-medium text-sm text-gray-800 flex items-center gap-2">
                {course.name}
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
              </div>
              <div className="col-span-2 text-xs text-gray-600">{course.sessionType || '—'}</div>
              <div className="col-span-2 text-xs text-gray-600">{course.hours ? `${course.hours}h` : '—'}</div>
              <div className="col-span-2 text-xs font-semibold text-brand">{formatPrice(course.basePrice)}</div>
              <div className="col-span-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${course.isActive ? STATUS_COLORS.Active : STATUS_COLORS.Inactive}`}>
                  {course.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals & Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <NewCourseModal
            onClose={() => setShowModal(false)}
            onCreated={c => setCourses(prev => [c, ...prev])}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCourse && (
          <EnrollmentDrawer
            course={activeCourse}
            onClose={() => setActiveCourse(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
