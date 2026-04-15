'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  Tag, 
  User, 
  Calendar, 
  Clock, 
  CreditCard, 
  BookOpen, 
  MessageSquare, 
  Sparkles,
  ExternalLink,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/context/TenantContext';
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatRelativeTime } from '@/lib/utils/format';

const TABS = [
  { id: 'overview', label: 'ภาพรวม', icon: User },
  { id: 'activity', label: 'กิจกรรม', icon: Clock },
  { id: 'history', label: 'ประวัติการซื้อ', icon: CreditCard },
  { id: 'intelligence', label: 'วิเคราะห์ AI', icon: Sparkles }
];

const STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'ENROLLED', 'PAID'];

export default function CustomerDetailPage({ params }) {
  const { tenant } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [customer, setCustomer] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  // Auto-activate edit mode from URL param (?edit=true)
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setEditMode(true);
    }
  }, [searchParams]);

  // 1. Fetch Data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [custRes, actRes] = await Promise.all([
          fetch(`/api/customers/${params.id}`),
          fetch(`/api/customers/${params.id}/activity`)
        ]);

        const custJson = await custRes.json();
        const actJson = await actRes.json();

        if (custJson.data) {
          setCustomer(custJson.data);
          setFormData(custJson.data);
          setActivity(actJson.data || []);
        } else {
          setError(custJson.error || 'ไม่พบข้อมูลลูกค้า');
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  // 2. Actions
  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.data) {
        setCustomer(json.data);
        setEditMode(false);
      }
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const updateStage = async (newStage) => {
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifecycleStage: newStage })
      });
      const json = await res.json();
      if (json.data) setCustomer(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshAI = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/customers/${params.id}/enrich`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('AI Enrichment Job Enqueued. Refreshing in 5s...');
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50">
      <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  if (error) return (
    <div className="p-10 text-center space-y-4">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-xl font-bold text-gray-900">{error}</h1>
      <button onClick={() => router.back()} className="text-orange-500 hover:underline">ย้อนกลับ</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8">
      {/* 1. Header Toolbar */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all shadow-sm"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <nav className="text-sm font-medium flex items-center gap-2">
              <span className="text-gray-400">CRM</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900">{customer?.facebookName || customer?.phonePrimary}</span>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={customer?.lifecycleStage || 'NEW'}
              onChange={(e) => updateStage(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              style={{ color: tenant?.primaryColor }}
            >
              {STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>
            <button 
              onClick={() => router.push('/inbox')}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: tenant?.primaryColor || '#f97316' }}
            >
              <MessageSquare size={16} />
              ไปที่ inbox
            </button>
          </div>
        </div>

        {/* 2. Main Profile Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 overflow-hidden relative">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 p-8 text-gray-50 opacity-50 -z-0">
            <User size={120} strokeWidth={1} />
          </div>

          <div className="flex flex-col md:flex-row gap-10 relative z-10">
            <div className="relative group">
              <div className="h-28 w-28 rounded-[2.5rem] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-orange-500 border-4 border-white shadow-xl">
                {customer?.facebookPicture ? (
                  <img src={customer.facebookPicture} alt="" className="h-full w-full object-cover rounded-[2.2rem]" />
                ) : (
                  <User size={40} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border border-gray-100 shadow-lg flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                  {customer?.facebookName || 'ไม่ระบุชื่อ'}
                </h1>
                <p className="text-gray-500 text-sm font-medium mt-1 flex items-center gap-2">
                  <Tag size={14} className="text-orange-400" />
                  ID: {customer?.id.split('-')[0].toUpperCase()}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50">
                  <Mail size={16} className="text-gray-400" />
                  <span className="font-semibold">{customer?.email || 'ไม่มีอีเมล'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100/50">
                  <Phone size={16} className="text-gray-400" />
                  <span className="font-semibold tracking-wider font-mono">{formatPhone(customer?.phonePrimary)}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-center min-w-[120px]">
                <p className="text-[10px] uppercase font-black text-orange-400 tracking-widest mb-1">ยอดใช้จ่าย</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(customer?.totalSpend || 0)}</p>
              </div>
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50 text-center min-w-[120px]">
                <p className="text-[10px] uppercase font-black text-purple-400 tracking-widest mb-1">คะแนน V POINT</p>
                <p className="text-xl font-black text-gray-900">{customer?.vPoints || 0} VP</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit mx-auto md:mx-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={activeTab === tab.id ? { backgroundColor: tenant?.primaryColor } : {}}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4. Content Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900">ข้อมูลส่วนตัว</h2>
                    <button 
                      onClick={() => editMode ? handleSave() : setEditMode(true)}
                      className="text-sm font-bold text-orange-500 flex items-center gap-2 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: tenant?.primaryColor }}
                    >
                      {saving ? <Loader2 className="animate-spin" size={16} /> : (editMode ? <Save size={16} /> : <User size={16} />)}
                      {editMode ? 'บันทึก' : 'แก้ไข'}
                    </button>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="group">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">ชื่อ (Facebook/LINE)</label>
                        {editMode ? (
                          <input 
                            value={formData.facebookName || ''} 
                            onChange={e => setFormData({...formData, facebookName: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900 px-1">{customer?.facebookName || '-'}</p>
                        )}
                      </div>
                      <div className="group">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">เบอร์โทรสาร</label>
                        {editMode ? (
                          <input 
                            value={formData.phonePrimary || ''} 
                            onChange={e => setFormData({...formData, phonePrimary: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 tracking-widest"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900 px-1 font-mono">{formatPhone(customer?.phonePrimary) || '-'}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="group">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">อีเมล</label>
                        {editMode ? (
                          <input 
                            value={formData.email || ''} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        ) : (
                          <p className="text-sm font-bold text-gray-900 px-1">{customer?.email || '-'}</p>
                        )}
                      </div>
                      <div className="group">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1.5 block">ที่อยู่ (จากระบบ)</label>
                        <p className="text-sm font-bold text-gray-900 px-1 leading-relaxed capitalize">{customer?.profile?.address || 'ไม่ระบุ'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
                >
                  <h2 className="text-lg font-black text-gray-900 mb-8">ไทม์ไลน์กิจกรรม</h2>
                  <div className="space-y-8 relative">
                    <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-50" />
                    {activity.length > 0 ? activity.map((item, idx) => (
                      <div key={idx} className="flex gap-6 relative">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm ${
                          item.action === 'CUSTOMER_UPDATE' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {item.action === 'CUSTOMER_UPDATE' ? <User size={14} /> : <Sparkles size={14} />}
                        </div>
                        <div className="flex-1 pb-8 border-b border-gray-50 last:border-0 last:pb-0">
                          <p className="text-sm font-bold text-gray-900">{item.action.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.actor} • {formatDateTime(item.createdAt)}</p>
                          {item.details && (
                            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-[11px] text-gray-600 font-mono">
                              {JSON.stringify(item.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-10">
                        <p className="text-gray-400 text-sm italic">ไม่มีบันทึกกิจกรรม</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
                >
                  <h2 className="text-lg font-black text-gray-900 mb-6">ประวัติรายการสินค้า/เรียน</h2>
                  <div className="space-y-4">
                    {/* Simplified history view for now */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 font-black">สมัครเรียนคอร์สอาหารญี่ปุ่น</p>
                          <p className="text-xs font-medium text-gray-500">สมัครเมื่อ 2 วันที่แล้ว</p>
                        </div>
                      </div>
                      <span className="text-xs font-black uppercase text-green-500 bg-green-50 px-3 py-1 rounded-full">ยืนยันแล้ว</span>
                    </div>
                    <div className="text-center py-6">
                      <p className="text-[10px] uppercase font-black text-gray-300 tracking-[0.2em]">End of History</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'intelligence' && (
                <motion.div
                  key="intelligence"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-900">AI Intelligence</h2>
                        <p className="text-xs text-gray-500 font-medium">วิเคราะห์โดย Gemini 1.5 Flash • {customer?.insight?.enrichedAt ? formatRelativeTime(customer.insight.enrichedAt) : 'ยังไม่เคยวิเคราะห์'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={refreshAI}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      รีเฟรช AI
                    </button>
                  </div>

                  {/* 1. Behavioral Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest block">Purchase Intent</label>
                        <span className={`text-xs font-black ${customer?.intentScore >= 70 ? 'text-red-500' : 'text-orange-500'}`}>
                          {customer?.intentScore || 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-1000 ${customer?.intentScore >= 70 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${customer?.intentScore || 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">ความพร้อมซื้อ: {customer?.intentScore >= 70 ? '🔥 สูงมาก (Hot Lead)' : 'กำลังพิจารณา'}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest block">Churn Risk</label>
                        <span className={`text-xs font-black ${customer?.churnScore >= 70 ? 'text-red-600' : 'text-green-500'}`}>
                          {customer?.churnScore || 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full transition-all duration-1000 ${customer?.churnScore >= 70 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${customer?.churnScore || 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">ความเสี่ยงเลิกติดตาม: {customer?.churnScore >= 70 ? '⚠️ เสี่ยงสูง (At-Risk)' : 'ปกติ'}</p>
                    </div>
                  </div>

                  {/* 2. Insights Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Interests (สิ่งที่สนใจ)</label>
                        <div className="flex flex-wrap gap-2">
                          {customer?.insight?.interests?.length > 0 ? customer.insight.interests.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100/50">#{tag}</span>
                          )) : <span className="text-xs text-gray-300 italic">ไม่มีข้อมูลความสนใจ</span>}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Objections (ข้อโต้แย้ง)</label>
                        <div className="flex flex-wrap gap-2">
                          {customer?.insight?.objections?.length > 0 ? customer.insight.objections.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100/50">⚠️ {tag}</span>
                          )) : <span className="text-xs text-gray-300 italic">ไม่มีข้อโต้แย้ง</span>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Communication Style</label>
                        <p className="text-sm font-bold text-gray-700 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                          {customer?.insight?.commStyle || 'ยังไม่ระบุ'}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 block">Key Facts</label>
                        <ul className="space-y-1.5">
                          {customer?.insight?.keyFacts?.length > 0 ? customer.insight.keyFacts.map((fact, i) => (
                            <li key={i} className="text-xs font-medium text-gray-600 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                              {fact}
                            </li>
                          )) : <p className="text-xs text-gray-300 italic">ไม่มีบันทึกข้อมูลสำคัญ</p>}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* 3. Summary */}
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl border border-gray-100 relative overflow-hidden group">
                    <Sparkles className="absolute -top-2 -right-2 text-gray-200 group-hover:text-orange-200 transition-colors" size={60} />
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3 block relative z-10">AI Summary & Next Action</label>
                    <p className="text-sm text-gray-700 leading-relaxed font-bold relative z-10">
                      {customer?.insight?.summary || 'ยังไม่มีข้อมูลสรุปจาก AI รอการวิเคราะห์รอบถัดไป'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Mini Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
              <h3 className="text-sm font-black text-gray-900 border-b border-gray-50 pb-4">ตระกร้าสินค้า (Wishlist)</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 py-1">
                    <div className="h-4 w-full bg-gray-100 rounded-lg mb-1" />
                    <div className="h-3 w-1/2 bg-gray-50 rounded-lg" />
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <p className="text-xs font-bold text-orange-600">ตะกร้าว่าง</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
              <h3 className="text-sm font-black text-gray-900 border-b border-gray-50 pb-4">ช่องทางติดต่อ</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-bold">Facebook</span>
                  <ExternalLink size={14} className="text-blue-500 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 font-bold">LINE OA</span>
                  <ExternalLink size={14} className="text-green-500 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
