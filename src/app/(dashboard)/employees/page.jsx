'use client';

// Employees — Staff Roster (Redesigned v2 · The Silent Supporter)
// Redesigned layout with Stats Bar, glassmorphism cards, and extended New Employee modal.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UserPlus, Mail, Users, Briefcase, TrendingUp,
  Phone, Calendar, ChevronDown, Search, MapPin,
} from 'lucide-react';
import EmployeeCarousel from '@/components/shared/EmployeeCarousel';
import EmployeeCard from '@/components/ui/EmployeeCard';
import EmployeeCardInteractive from '@/components/crm/EmployeeCardInteractive';

const DEPARTMENT_FILTERS = ['All', 'Instructors', 'Kitchen', 'Administration', 'Operations', 'Sales & Marketing'];
const STATUS_FILTERS = ['All', 'ACTIVE', 'INACTIVE'];
const DEPARTMENTS = ['Instructors', 'Kitchen', 'Administration', 'Operations', 'Sales & Marketing'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'];
const EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERN: 'Intern' };

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'brand', delay = 0 }) {
  const colorMap = {
    brand:  { bg: 'bg-brand/10',   icon: 'text-brand',   ring: 'ring-brand/20' },
    green:  { bg: 'bg-green-50',   icon: 'text-green-600', ring: 'ring-green-200' },
    blue:   { bg: 'bg-blue-50',    icon: 'text-blue-600',  ring: 'ring-blue-200' },
    purple: { bg: 'bg-purple-50',  icon: 'text-purple-600',ring: 'ring-purple-200' },
  };
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-4 bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl px-5 py-4 shadow-sm"
    >
      <div className={`h-11 w-11 rounded-xl ${c.bg} flex items-center justify-center ring-1 ${c.ring} flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50 transition-all bg-white';
const selectCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50 transition-all bg-white appearance-none cursor-pointer';

// ─── New Employee Modal ───────────────────────────────────────────────────────
function NewEmployeeModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1 = ข้อมูลพื้นฐาน, 2 = รายละเอียดงาน
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'STF', jobTitle: '', department: 'Administration',
    employmentType: 'FULL_TIME', hiredAt: '', nickName: '', lineUserId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) { setError('กรุณากรอกชื่อและอีเมล'); return; }
    setSaving(true); setError(null);
    try {
      // API expects: name (full), email, role, phone, lineId
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          nickName: form.nickName.trim(),
          email: form.email.trim(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          lineUserId: form.lineUserId.trim() || undefined,
          department: form.department,
          jobTitle: form.jobTitle,
          hiredAt: form.hiredAt || undefined
        }),
      });
      let responseData;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Server error occurred');
        responseData = text;
      }

      if (!res.ok) {
        throw new Error(responseData?.error || 'สร้างพนักงานไม่ได้');
      }

      onCreated(responseData);
      onClose();
    } catch (err) {
      console.error('[EmployeesPage] create', err);
      setError(err.message);
      setStep(1);
    } finally {
      setSaving(false);
    }
  }

  const canProceed = form.firstName.trim() && form.email.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-brand/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-brand/10 rounded-xl flex items-center justify-center">
              <UserPlus className="h-4.5 w-4.5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">เพิ่มพนักงานใหม่</h2>
              <p className="text-[11px] text-gray-400 font-medium">ขั้นตอน {step} จาก 2</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand' : 'bg-gray-100'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {step === 1 ? (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลส่วนตัว</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ชื่อ *">
                    <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)}
                      placeholder="ชื่อ" className={inputCls} autoFocus />
                  </Field>
                  <Field label="นามสกุล">
                    <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)}
                      placeholder="นามสกุล" className={inputCls} />
                  </Field>
                </div>
                <Field label="อีเมล *">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="email@example.com" className={`${inputCls} pl-9`} />
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="เบอร์โทรศัพท์">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="0xx-xxx-xxxx" className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Link รูปโปรไฟล์">
                    <input type="url" value={form.avatarUrl} onChange={e => set('avatarUrl', e.target.value)}
                      placeholder="https://..." className={inputCls} />
                  </Field>
                </div>
                <Field label="ที่อยู่">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-300" />
                    <textarea value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="บ้านเลขที่, ถนน, แขวง, เขต, จังหวัด" rows={2}
                      className={`${inputCls} pl-9 resize-none`} />
                  </div>
                </Field>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลงาน</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ชื่อเล่น">
                    <input type="text" value={form.nickName} onChange={e => set('nickName', e.target.value)}
                      placeholder="เช่น โบ๊ท, แนน" className={inputCls} autoFocus />
                  </Field>
                  <Field label="บทบาท (Role)">
                    <div className="relative">
                      <select value={form.role} onChange={e => set('role', e.target.value)} className={selectCls}>
                        <option value="STF">Staff</option>
                        <option value="MGR">Manager</option>
                        <option value="ADM">Admin</option>
                        <option value="OWN">Owner</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="แผนก">
                    <div className="relative">
                      <select value={form.department} onChange={e => set('department', e.target.value)} className={selectCls}>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="ตำแหน่งงาน">
                    <input type="text" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)}
                      placeholder="เช่น Head Chef" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันเริ่มงาน">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                      <input type="date" value={form.hiredAt} onChange={e => set('hiredAt', e.target.value)}
                        className={`${inputCls} pl-9`} />
                    </div>
                  </Field>
                  <Field label="LINE User ID">
                    <input type="text" value={form.lineUserId} onChange={e => set('lineUserId', e.target.value)}
                      placeholder="U1234abcd..." className={inputCls} />
                  </Field>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                <X className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-6 pb-6">
            {step === 1 ? (
              <>
                <button type="button" onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  ยกเลิก
                </button>
                <button type="button" onClick={() => setStep(2)} disabled={!canProceed}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(232,130,12,0.25)]">
                  ถัดไป →
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  ← ย้อนกลับ
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-60 transition-all shadow-[0_4px_12px_rgba(232,130,12,0.25)]">
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังบันทึก...
                    </span>
                  ) : '✓ เพิ่มพนักงาน'}
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Invite Staff Modal ───────────────────────────────────────────────────────
function InviteStaffModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('STAFF');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('กรุณาใส่อีเมล'); return; }
    setSending(true); setError(null);
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Server error');
        data = text;
      }

      if (!res.ok) throw new Error(data.error || 'ส่งคำเชิญไม่ได้');
      setSent(true);
    } catch (err) {
      console.error('[EmployeesPage] invite', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-brand/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-brand/10 rounded-xl flex items-center justify-center">
              <Mail className="h-4.5 w-4.5 text-brand" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Invite Staff</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <div className="p-6">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <div className="h-14 w-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <Mail className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm font-bold text-gray-800">ส่งคำเชิญสำเร็จ!</p>
              <p className="text-xs text-gray-500">ส่งอีเมลคำเชิญไปยัง <span className="font-semibold text-brand">{email}</span> แล้ว</p>
              <button onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand/90 transition-colors">
                ปิด
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="อีเมลพนักงานใหม่ *">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="staff@example.com" autoFocus className={`${inputCls} pl-9`} />
                </div>
              </Field>
              <Field label="บทบาท">
                <div className="relative">
                  <select value={role} onChange={e => setRole(e.target.value)} className={selectCls}>
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </Field>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={sending}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-60 transition-all">
                  {sending ? 'กำลังส่ง...' : 'ส่งคำเชิญ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [view, setView] = useState('Grid');
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [stats, setStats] = useState({});
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);

  useEffect(() => {
    if (view === 'Deck') {
      fetchStats();
    }
  }, [view]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/employees/stats');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        setStats(json.data || {});
      }
    } catch (err) {
      console.error('[EmployeesPage] fetchStats', err);
    }
  }

  const getInitials = (firstName, lastName) =>
    `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || 'E';

  useEffect(() => { fetchEmployees(); }, [departmentFilter, statusFilter]);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await fetch('/api/employees');
      const contentType = res.headers.get('content-type');
      
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        let data = json.data || [];
        if (statusFilter !== 'All') data = data.filter(e => e.status === statusFilter);
        if (departmentFilter !== 'All') data = data.filter(e => e.department === departmentFilter || e.role === departmentFilter);
        setEmployees(data);
      } else if (!res.ok) {
        const text = await res.text();
        console.error('[EmployeesPage] fetch error:', text);
      }
    } catch (error) {
      console.error('[EmployeesPage] fetch', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(newEmp) { setEmployees(prev => [newEmp, ...prev]); }

  // Search filter (client-side)
  const filtered = employees.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.firstName || '').toLowerCase().includes(q) ||
      (e.lastName || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.jobTitle || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    );
  });

  const featuredEmployees = [...employees].sort((a, b) =>
    (b.hiredAt ? new Date(b.hiredAt).getTime() : 0) - (a.hiredAt ? new Date(a.hiredAt).getTime() : 0)
  ).slice(0, 5);

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;
  const deptCount = new Set(employees.map(e => e.department).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-surface p-6 space-y-8 custom-scrollbar">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 font-prompt">Staff Roster</h1>
            <span className="px-2.5 py-1 bg-brand/10 text-brand text-[10px] font-extrabold rounded-lg uppercase tracking-widest">
              Support Crew
            </span>
          </div>
          <p className="text-sm text-gray-400 max-w-md">
            ทีม Silent Supporter ผู้ขับเคลื่อนโรงเรียนสอนทำอาหารอยู่เบื้องหลัง
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex gap-3 flex-shrink-0"
        >
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Invite Staff
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-bold shadow-[0_4px_15px_rgba(232,130,12,0.3)] hover:shadow-[0_8px_25px_rgba(232,130,12,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            New Employee
          </button>
        </motion.div>
      </div>

      {/* ── Stats Bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="พนักงานทั้งหมด"  value={employees.length} color="brand"  delay={0} />
        <StatCard icon={TrendingUp} label="กำลังทำงาน"      value={activeCount}       color="green"  delay={0.06} />
        <StatCard icon={Briefcase}  label="แผนก"            value={deptCount}         color="blue"   delay={0.12} />
        <StatCard icon={UserPlus}   label="เพิ่มใหม่เดือนนี้" value={
          employees.filter(e => {
            if (!e.hiredAt) return false;
            const d = new Date(e.hiredAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length
        } color="purple" delay={0.18} />
      </div>

      {/* ── Featured Carousel ────────────────────────────────────────────────── */}
      {!loading && featuredEmployees.length > 0 && (
        <section className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <EmployeeCarousel employees={featuredEmployees} />
        </section>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col xl:flex-row gap-3 justify-between items-stretch xl:items-center bg-white/70 backdrop-blur-sm border border-white/80 p-4 rounded-2xl shadow-sm">

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, อีเมล..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/40 bg-white/80 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100/80 rounded-xl overflow-x-auto scrollbar-hide">
              {DEPARTMENT_FILTERS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDepartmentFilter(d)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    departmentFilter === d
                      ? 'bg-white text-brand shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* Status */}
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    statusFilter === s
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* View Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg gap-0.5">
              {['Grid', 'List', 'Deck'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${view === v ? 'bg-white shadow-sm text-brand' : 'text-gray-400 hover:text-gray-600'}`}
                  title={v}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result Count */}
        {search && (
          <p className="text-xs text-gray-400 px-1">
            พบ <span className="font-bold text-gray-700">{filtered.length}</span> รายการ สำหรับ "{search}"
          </p>
        )}

        {/* ── Content Area ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center justify-center gap-4 text-gray-400"
            >
              <div className="h-9 w-9 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
              <p className="text-sm font-medium">กำลังโหลดรายชื่อทีม...</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-24 text-center bg-white/50 border border-dashed border-gray-200 rounded-3xl"
            >
              <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">ไม่พบพนักงานที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-gray-300 mt-1">ลองเปลี่ยน filter หรือ ค้นหาใหม่</p>
            </motion.div>
          ) : view === 'Grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-5"
            >
              {filtered.map((emp, i) => (
                <motion.div key={emp.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <EmployeeCard employee={emp} />
                </motion.div>
              ))}
            </motion.div>
          ) : view === 'Deck' ? (
            <motion.div
              key="deck"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="relative h-[600px] w-full max-w-4xl mx-auto flex items-center justify-center overflow-hidden rounded-3xl bg-nav-dark"
            >
              {/* Stack background hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-50 scale-95 translate-y-4 blur-sm pointer-events-none">
                 <div className="w-[340px] h-[520px] rounded-[2.5rem] bg-white/5 border border-white/10" />
              </div>

              <div className="relative w-full h-full">
                <AnimatePresence initial={false}>
                  {filtered.slice(activeDeckIndex, activeDeckIndex + 1).map((emp) => (
                    <EmployeeCardInteractive 
                      key={emp.id} 
                      employee={emp} 
                      kpis={stats[emp.id]}
                      index={0}
                      onSwipe={() => {
                        setActiveDeckIndex(prev => (prev + 1) % filtered.length);
                      }}
                    />
                  ))}
                </AnimatePresence>
                
                {/* Deck Navigation Controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[200]">
                   <button 
                     onClick={() => setActiveDeckIndex(prev => (prev - 1 + filtered.length) % filtered.length)}
                     className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
                   >
                     <ChevronDown className="h-5 w-5 rotate-90" />
                   </button>
                   <div className="text-sm font-bold text-white/60 font-prompt">
                     {activeDeckIndex + 1} / {filtered.length}
                   </div>
                   <button 
                     onClick={() => setActiveDeckIndex(prev => (prev + 1) % filtered.length)}
                     className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
                   >
                     <ChevronDown className="h-5 w-5 -rotate-90" />
                   </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm overflow-hidden"
            >
              <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-gray-100 bg-gray-50/70 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                <div className="col-span-4">พนักงาน</div>
                <div className="col-span-2">ตำแหน่ง</div>
                <div className="col-span-2">แผนก</div>
                <div className="col-span-2 text-center">สถานะ</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {filtered.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-brand/5 items-center transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm flex-shrink-0">
                      {getInitials(emp.firstName, emp.lastName)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 font-prompt truncate">{emp.firstName || 'Unknown'} {emp.lastName || ''}</div>
                      <div className="text-[10px] text-gray-400 font-medium truncate">{emp.email || 'No email'}</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs font-semibold text-gray-700 truncate">{emp.jobTitle || emp.role || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="px-2.5 py-1 bg-rest-blue text-rest-blue-text text-[10px] font-bold rounded-full">
                      {emp.department || 'GEN'}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {emp.status}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button className="p-2 text-gray-300 hover:text-brand hover:bg-brand/10 rounded-xl transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewModal && <NewEmployeeModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} />}
        {showInviteModal && <InviteStaffModal onClose={() => setShowInviteModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
