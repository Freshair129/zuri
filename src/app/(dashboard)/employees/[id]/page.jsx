'use client';

// Employees — Employee detail page
// Full profile: personal info, role/contract, assigned courses, attendance, and documents.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Calendar, Briefcase, User, Trash2 } from 'lucide-react';
import SimpleEditModal from '@/components/employees/SimpleEditModal';

const TABS = ['Profile', 'Schedule', 'Courses', 'Documents', 'Activity'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase() || 'E';
}

export default function EmployeeDetailPage({ params }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Profile');
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    fetch(`/api/employees/${params.id}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setEmployee(json.data);
        else setError(json.error || 'ไม่พบข้อมูลพนักงาน');
      })
      .catch(err => {
        console.error('[EmployeeDetail]', err);
        setError('ไม่สามารถโหลดข้อมูลได้');
      })
      .finally(() => setLoading(false));
  }, [params?.id, router]);

  async function handleDelete() {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการระงับการใช้งานพนักงานคนนี้?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${params.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/employees');
      } else {
        const json = await res.json();
        alert(json.error || 'ลบไม่สำเร็จ');
      }
    } catch (err) {
      console.error('[EmployeeDetail] delete', err);
      alert('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/employees" className="hover:text-orange-500 transition-colors">Employees</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">
          {loading ? '...' : employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Not found'}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Link href="/employees" className="mt-3 inline-block text-sm text-orange-500 hover:underline">← กลับหน้า Employees</Link>
        </div>
      )}

      {!loading && employee && (
        <>
          {/* Profile header */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600 flex-shrink-0 shadow-sm">
                {getInitials(employee.firstName, employee.lastName)}
              </div>

              <div className="flex-1 space-y-1.5">
                <h2 className="text-xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {employee.jobTitle && (
                    <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full">
                      {employee.jobTitle}
                    </span>
                  )}
                  {employee.department && (
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                      {employee.department}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {employee.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 pt-0.5">
                  {employee.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="h-3.5 w-3.5" /> {employee.email}
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone className="h-3.5 w-3.5" /> {employee.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  แก้ไข
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Start Date</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatDate(employee.hiredAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Employment</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{(employee.employmentType || '—').replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Employee ID</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 font-mono">{employee.employeeId || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Role</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{employee.role || '—'}</p>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            {activeTab === 'Profile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
                  {[
                    { label: 'Full Name',  value: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '—' },
                    { label: 'Email',      value: employee.email   || '—' },
                    { label: 'Phone',      value: employee.phone   || '—' },
                    { label: 'National ID',value: employee.nationalId || '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Employment Details</h3>
                  {[
                    { label: 'Employee ID',      value: employee.employeeId || '—' },
                    { label: 'Department',        value: employee.department || '—' },
                    { label: 'Role / Title',      value: employee.jobTitle   || employee.role || '—' },
                    { label: 'Employment Type',   value: (employee.employmentType || '—').replace('_', ' ') },
                    { label: 'Start Date',        value: formatDate(employee.hiredAt) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== 'Profile' && (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">แท็บ {activeTab} — coming soon</p>
              </div>
            )}
          </div>
        </>
      )}

      {showEditModal && (
        <SimpleEditModal 
          employee={employee} 
          onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => setEmployee(updated)}
        />
      )}
    </div>
  );
}
