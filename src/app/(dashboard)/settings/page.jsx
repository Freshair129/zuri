// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// Previous version: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 22:00:00 +07:00 (v1.1.0)
// FEAT21: Team invite + Ownership transfer UI added
'use client';

// Settings — Account & workspace settings page
// Sections: General, Workspace, Team & Roles, Ownership, Billing, Integrations, Notifications, Danger Zone

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTenant } from '@/context/TenantContext';
import { can } from '@/lib/permissionMatrix';

const ROLE_OPTIONS = ['MANAGER', 'SALES', 'KITCHEN', 'FINANCE', 'STAFF'];

export default function SettingsPage() {
  const { data: session } = useSession();
  const userRoles = session?.user?.roles ?? (session?.user?.role ? [session.user.role] : []);
  const canInvite = can(userRoles, 'team', 'A');
  const canTransferOwnership = can(userRoles, 'ownership', 'F');

  const SECTIONS = [
    { key: 'general',    label: 'General' },
    { key: 'workspace',  label: 'Workspace' },
    { key: 'team',       label: 'Team & Roles' },
    ...(canTransferOwnership ? [{ key: 'ownership', label: 'Ownership' }] : []),
    { key: 'billing',        label: 'Billing' },
    { key: 'integrations',   label: 'Integrations' },
    { key: 'notifications',  label: 'Notifications' },
    { key: 'danger',         label: 'Danger Zone' },
  ];

  const [activeSection, setActiveSection] = useState('general');
  const { tenant, updateConfig } = useTenant();

  // Workspace form state — synced from TenantContext
  const [wsForm,    setWsForm]    = useState({ brandColor: '#E8820C', brandColorSecondary: '#1A1710', brandFont: 'IBM Plex Sans Thai', currency: 'THB', vatRate: 7, timezone: 'Asia/Bangkok' });
  const [wsSaving,  setWsSaving]  = useState(false);
  const [wsSuccess, setWsSuccess] = useState(false);
  const [wsError,   setWsError]   = useState(null);

  // Integrations form state
  const [intForm,    setIntForm]    = useState({ fbPageId: '', fbPageToken: '', lineOaId: '', lineChannelToken: '' });
  const [intSaving,  setIntSaving]  = useState(false);
  const [intSuccess, setIntSuccess] = useState(false);
  const [intError,   setIntError]   = useState(null);
  const [showFbToken,   setShowFbToken]   = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);

  // Team invite state
  const [inviteForm,    setInviteForm]    = useState({ email: '', role: 'STAFF' });
  const [inviting,      setInviting]      = useState(false);
  const [inviteResult,  setInviteResult]  = useState(null); // { success, inviteUrl } | { error, message }
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [invitesLoaded,  setInvitesLoaded]  = useState(false);

  // Ownership state
  const [ownership,      setOwnership]      = useState(null); // { pendingRequest, eligibleRecipients }
  const [ownershipLoaded, setOwnershipLoaded] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [initiating,     setInitiating]     = useState(false);
  const [showOtpModal,   setShowOtpModal]   = useState(false);
  const [otp,            setOtp]            = useState('');
  const [verifying,      setVerifying]      = useState(false);
  const [ownershipMsg,   setOwnershipMsg]   = useState(null); // { type: 'success'|'error', text }

  // Sync workspace form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setWsForm({
        brandColor:          tenant.brandColor          ?? '#E8820C',
        brandColorSecondary: tenant.brandColorSecondary ?? '#1A1710',
        brandFont:           tenant.brandFont           ?? 'IBM Plex Sans Thai',
        currency:            tenant.currency            ?? 'THB',
        vatRate:             tenant.vatRate             ?? 7,
        timezone:            tenant.timezone            ?? 'Asia/Bangkok',
      });
    }
  }, [tenant]);

  // Load team invites when switching to team tab
  useEffect(() => {
    if (activeSection === 'team' && !invitesLoaded && canInvite) {
      loadPendingInvites();
    }
  }, [activeSection]);

  // Load ownership data when switching to ownership tab
  useEffect(() => {
    if (activeSection === 'ownership' && !ownershipLoaded && canTransferOwnership) {
      loadOwnership();
    }
  }, [activeSection]);

  // ── Team helpers ─────────────────────────────────────────────
  async function loadPendingInvites() {
    try {
      const res = await fetch('/api/team/invite');
      const data = await res.json();
      if (res.ok) setPendingInvites(data.invitations ?? []);
    } catch {}
    setInvitesLoaded(true);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult({ success: true, inviteUrl: data.inviteUrl });
        setInviteForm({ email: '', role: 'STAFF' });
        loadPendingInvites();
      } else {
        setInviteResult({ error: true, message: data.message ?? data.error ?? 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setInviteResult({ error: true, message: 'เกิดข้อผิดพลาด' });
    } finally {
      setInviting(false);
    }
  }

  async function handleRevokeInvite(token) {
    try {
      await fetch(`/api/team/invite/${token}`, { method: 'DELETE' });
      loadPendingInvites();
    } catch {}
  }

  // ── Ownership helpers ─────────────────────────────────────────
  async function loadOwnership() {
    try {
      const res = await fetch('/api/settings/ownership');
      const data = await res.json();
      if (res.ok) setOwnership(data);
    } catch {}
    setOwnershipLoaded(true);
  }

  async function handleInitiateTransfer() {
    if (!selectedRecipient) return;
    setInitiating(true);
    setOwnershipMsg(null);
    try {
      const res = await fetch('/api/settings/ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmployeeId: selectedRecipient }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowOtpModal(true);
        setOwnershipMsg({ type: 'info', text: data.message });
        loadOwnership();
      } else {
        setOwnershipMsg({ type: 'error', text: data.message ?? data.error ?? 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setOwnershipMsg({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    } finally {
      setInitiating(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setVerifying(true);
    setOwnershipMsg(null);
    try {
      const res = await fetch('/api/settings/ownership/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowOtpModal(false);
        setOwnershipMsg({ type: 'success', text: data.message });
        // Force reload — ownership changed, session invalid
        setTimeout(() => window.location.href = '/login', 2000);
      } else {
        setOwnershipMsg({ type: 'error', text: data.message ?? data.error ?? 'OTP ไม่ถูกต้อง' });
      }
    } catch {
      setOwnershipMsg({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    } finally {
      setVerifying(false);
    }
  }

  async function handleCancelTransfer() {
    await fetch('/api/settings/ownership', { method: 'DELETE' });
    setShowOtpModal(false);
    setOtp('');
    setOwnershipMsg(null);
    loadOwnership();
  }

  const handleIntSave = async (e) => {
    e.preventDefault();
    setIntSaving(true);
    setIntSuccess(false);
    setIntError(null);
    try {
      const res = await fetch('/api/tenant/integrations', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(intForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setIntSuccess(true);
      setTimeout(() => setIntSuccess(false), 3000);
    } catch (err) {
      setIntError(err.message);
    } finally {
      setIntSaving(false);
    }
  };

  const handleWsSave = async (e) => {
    e.preventDefault();
    setWsSaving(true);
    setWsSuccess(false);
    setWsError(null);
    const { ok, error } = await updateConfig(wsForm);
    setWsSaving(false);
    if (ok) {
      setWsSuccess(true);
      setTimeout(() => setWsSuccess(false), 3000);
    } else {
      setWsError(error ?? 'Save failed');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and workspace preferences</p>
      </div>

      <div className="flex gap-6">

        {/* Sidebar nav */}
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-1 sticky top-6">
            {SECTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === key
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${key === 'danger' ? 'text-red-500 hover:bg-red-50 mt-4' : ''}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* GENERAL */}
          {activeSection === 'general' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-gray-800">General</h2>

              {/* TODO: profile photo upload */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-orange-100" />
                <div className="space-y-1.5">
                  <div className="h-8 w-28 bg-gray-100 rounded-lg" />
                  <p className="text-xs text-gray-400">JPG, PNG up to 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['First Name', 'Last Name', 'Email Address', 'Phone Number'].map((f) => (
                  <div key={f}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f}</label>
                    <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>

              {/* TODO: Language & timezone selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Language', 'Timezone'].map((f) => (
                  <div key={f}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f}</label>
                    <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>

              {/* TODO: Change password section */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Change Password</h3>
                {['Current Password', 'New Password', 'Confirm New Password'].map((f) => (
                  <div key={f}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f}</label>
                    <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg" />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <div className="h-9 w-28 bg-orange-500 rounded-lg" />
              </div>
            </div>
          )}

          {/* WORKSPACE */}
          {activeSection === 'workspace' && (
            <form onSubmit={handleWsSave} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">Workspace</h2>
                {tenant && (
                  <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {tenant.slug} · {tenant.plan}
                  </span>
                )}
              </div>

              {/* School name (read-only — contact support to change) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโรงเรียน / Workspace</label>
                <input
                  type="text"
                  readOnly
                  value={tenant?.name ?? '—'}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">ต้องการเปลี่ยนชื่อ? ติดต่อ support</p>
              </div>

              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wsForm.brandColor}
                    onChange={(e) => setWsForm((p) => ({ ...p, brandColor: e.target.value }))}
                    className="h-10 w-14 border border-gray-200 rounded-lg cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={wsForm.brandColor}
                    onChange={(e) => setWsForm((p) => ({ ...p, brandColor: e.target.value }))}
                    placeholder="#6366f1"
                    className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Brand Color Secondary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color (Secondary)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={wsForm.brandColorSecondary}
                    onChange={(e) => setWsForm((p) => ({ ...p, brandColorSecondary: e.target.value }))}
                    className="h-10 w-14 border border-gray-200 rounded-lg cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={wsForm.brandColorSecondary}
                    onChange={(e) => setWsForm((p) => ({ ...p, brandColorSecondary: e.target.value }))}
                    placeholder="#1A1710"
                    className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>

              {/* Brand Font */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Font</label>
                <select
                  value={wsForm.brandFont}
                  onChange={(e) => setWsForm((p) => ({ ...p, brandFont: e.target.value }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="IBM Plex Sans Thai">IBM Plex Sans Thai</option>
                  <option value="Prompt">Prompt</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                </select>
              </div>

              {/* Currency + VAT Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={wsForm.currency}
                    onChange={(e) => setWsForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="THB">THB — บาทไทย</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={wsForm.vatRate}
                    onChange={(e) => setWsForm((p) => ({ ...p, vatRate: parseFloat(e.target.value) }))}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={wsForm.timezone}
                  onChange={(e) => setWsForm((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              {/* Feedback */}
              {wsError   && <p className="text-sm text-red-500">{wsError}</p>}
              {wsSuccess && <p className="text-sm text-green-600">บันทึกสำเร็จ ✓</p>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={wsSaving}
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {wsSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TEAM & ROLES */}
          {activeSection === 'team' && (
            <div className="space-y-5">

              {/* Invite panel */}
              {canInvite && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">เชิญสมาชิก</h2>
                    <button
                      onClick={() => { setShowInviteForm(v => !v); setInviteResult(null); }}
                      className="h-8 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {showInviteForm ? 'ยกเลิก' : '+ เชิญสมาชิก'}
                    </button>
                  </div>

                  {showInviteForm && (
                    <form onSubmit={handleInvite} className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล</label>
                          <input
                            type="email" required
                            value={inviteForm.email}
                            onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="name@example.com"
                            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                          <select
                            value={inviteForm.role}
                            onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                          >
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>

                      {inviteResult?.error && (
                        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{inviteResult.message}</p>
                      )}
                      {inviteResult?.success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-1">
                          <p className="text-sm font-medium text-green-700">ส่งคำเชิญสำเร็จ</p>
                          <p className="text-xs text-green-600 break-all font-mono">{inviteResult.inviteUrl}</p>
                          <p className="text-xs text-gray-400">คัดลอกลิงก์นี้ส่งให้สมาชิก (อีเมลอัตโนมัติจะพร้อมเร็วๆ นี้)</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={inviting}
                          className="h-9 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          {inviting ? 'กำลังส่ง...' : 'ส่งคำเชิญ'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Pending invitations */}
                  {invitesLoaded && pendingInvites.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">คำเชิญที่รอการตอบรับ</p>
                      {pendingInvites.map(inv => (
                        <div key={inv.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                            <p className="text-xs text-gray-400">
                              {inv.role} · หมดอายุ {new Date(inv.expiresAt).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            รอตอบรับ
                          </span>
                          <button
                            onClick={() => handleRevokeInvite(inv.token)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {invitesLoaded && pendingInvites.length === 0 && !showInviteForm && (
                    <p className="text-sm text-gray-400 text-center py-2">ไม่มีคำเชิญที่รอการตอบรับ</p>
                  )}
                </div>
              )}

              {/* Role reference */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Roles & Permissions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100">
                        <th className="pb-2 font-medium w-24">Role</th>
                        {['Dashboard','CRM','Orders','Kitchen','Employees','Accounting','Team'].map(d => (
                          <th key={d} className="pb-2 font-medium text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        { role: 'OWNER',   vals: ['F','F','A','F','F','F','F'] },
                        { role: 'MANAGER', vals: ['F','F','F','F','F','R','A'] },
                        { role: 'SALES',   vals: ['R','F','F','N','N','N','N'] },
                        { role: 'KITCHEN', vals: ['R','N','N','F','N','N','N'] },
                        { role: 'FINANCE', vals: ['R','R','R','N','N','F','N'] },
                        { role: 'STAFF',   vals: ['R','R','R','R','N','N','N'] },
                      ].map(({ role, vals }) => (
                        <tr key={role}>
                          <td className="py-2 font-semibold text-gray-700">{role}</td>
                          {vals.map((v, i) => (
                            <td key={i} className="py-2 text-center">
                              <span className={`inline-block w-5 h-5 rounded text-xs font-bold leading-5 ${
                                v==='F' ? 'bg-green-100 text-green-700' :
                                v==='A' ? 'bg-blue-100 text-blue-700' :
                                v==='R' ? 'bg-gray-100 text-gray-500' :
                                'text-gray-300'
                              }`}>{v}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 mt-2">F = Full · A = Approve · R = Read · N = None</p>
                </div>
              </div>
            </div>
          )}

          {/* OWNERSHIP */}
          {activeSection === 'ownership' && canTransferOwnership && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">โอนสิทธิ์ความเป็นเจ้าของ</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    โอน Ownership ให้ผู้จัดการคนอื่น — ต้องยืนยันด้วย OTP ที่ส่งไปยังอีเมลของคุณ
                  </p>
                </div>

                {ownershipMsg && (
                  <p className={`text-sm px-4 py-2.5 rounded-xl ${
                    ownershipMsg.type === 'success' ? 'bg-green-50 text-green-700' :
                    ownershipMsg.type === 'error'   ? 'bg-red-50 text-red-600' :
                    'bg-blue-50 text-blue-700'
                  }`}>{ownershipMsg.text}</p>
                )}

                {!ownershipLoaded && (
                  <p className="text-sm text-gray-400">กำลังโหลด...</p>
                )}

                {ownershipLoaded && ownership?.pendingRequest && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-800">มีคำขอโอนสิทธิ์ที่รอดำเนินการ</p>
                    <p className="text-xs text-amber-600">
                      หมดอายุ: {new Date(ownership.pendingRequest.expiresAt).toLocaleString('th-TH')}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowOtpModal(true)}
                        className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        ใส่ OTP
                      </button>
                      <button
                        onClick={handleCancelTransfer}
                        className="h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                      >
                        ยกเลิกคำขอ
                      </button>
                    </div>
                  </div>
                )}

                {ownershipLoaded && !ownership?.pendingRequest && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        เลือกผู้รับสิทธิ์ (MANAGER ที่ active)
                      </p>
                      {(!ownership?.eligibleRecipients || ownership.eligibleRecipients.length === 0) ? (
                        <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">
                          ไม่มีผู้จัดการที่มีสิทธิ์รับโอน — เชิญ MANAGER เข้าระบบก่อน
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {ownership.eligibleRecipients.map(emp => (
                            <label
                              key={emp.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                selectedRecipient === emp.id
                                  ? 'border-orange-400 bg-orange-50'
                                  : 'border-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="recipient"
                                value={emp.id}
                                checked={selectedRecipient === emp.id}
                                onChange={() => setSelectedRecipient(emp.id)}
                                className="accent-orange-500"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-gray-400">{emp.email} · {emp.role}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {ownership?.eligibleRecipients?.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={handleInitiateTransfer}
                          disabled={!selectedRecipient || initiating}
                          className="h-9 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          {initiating ? 'กำลังส่ง OTP...' : 'เริ่มโอนสิทธิ์'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* OTP Modal */}
              {showOtpModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                    <h3 className="text-base font-semibold text-gray-800">ยืนยัน OTP</h3>
                    <p className="text-sm text-gray-500">กรอก OTP 6 หลักที่ส่งไปยังอีเมลของคุณ</p>
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full h-12 px-4 text-center text-2xl font-mono tracking-widest bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      {ownershipMsg?.type === 'error' && (
                        <p className="text-sm text-red-500">{ownershipMsg.text}</p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleCancelTransfer}
                          className="flex-1 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          disabled={otp.length < 6 || verifying}
                          className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          {verifying ? 'กำลังยืนยัน...' : 'ยืนยัน'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BILLING */}
          {activeSection === 'billing' && (
            <div className="space-y-5">
              {/* Current plan */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-5 text-white">
                <p className="text-xs font-semibold opacity-80">Current Plan</p>
                <div className="h-7 w-20 bg-white/20 rounded mt-1 animate-pulse" />
                <div className="h-4 w-48 bg-white/20 rounded mt-2" />
                {/* TODO: Upgrade button */}
                <div className="h-9 w-28 bg-white/20 rounded-lg mt-4" />
              </div>

              {/* TODO: Billing history table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Billing History</h2>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-50">
                    <div className="h-8 w-8 bg-gray-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                    <div className="h-6 w-20 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>

              {/* TODO: Payment method management */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Payment Methods</h2>
                <div className="h-14 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-400">
                  + Add payment method
                </div>
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {activeSection === 'integrations' && (
            <form onSubmit={handleIntSave} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Integrations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Token จะถูกเก็บไว้ใน database และใช้ส่งข้อความออก — ไม่แสดงซ้ำเมื่อบันทึกแล้ว</p>
              </div>

              {/* Facebook Messenger */}
              <div className="space-y-3 pb-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">f</div>
                  <p className="text-sm font-semibold text-gray-800">Facebook Messenger</p>
                  {tenant?.hasFbPage && (
                    <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Connected</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Facebook Page ID</label>
                  <input
                    type="text"
                    placeholder="เช่น 123456789012345"
                    value={intForm.fbPageId}
                    onChange={(e) => setIntForm((p) => ({ ...p, fbPageId: e.target.value }))}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Page Access Token</label>
                  <div className="flex gap-2">
                    <input
                      type={showFbToken ? 'text' : 'password'}
                      placeholder={tenant?.hasFbPage ? '••••••••••••••••••••• (set)' : 'EAAxxxxxxxxxxxxxxx'}
                      value={intForm.fbPageToken}
                      onChange={(e) => setIntForm((p) => ({ ...p, fbPageToken: e.target.value }))}
                      className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button type="button" onClick={() => setShowFbToken((v) => !v)}
                      className="h-10 px-3 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                      {showFbToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* LINE Official Account */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">L</div>
                  <p className="text-sm font-semibold text-gray-800">LINE Official Account</p>
                  {tenant?.hasLineOa && (
                    <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Connected</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">LINE OA ID</label>
                  <input
                    type="text"
                    placeholder="เช่น @yourlineid"
                    value={intForm.lineOaId}
                    onChange={(e) => setIntForm((p) => ({ ...p, lineOaId: e.target.value }))}
                    className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Channel Access Token</label>
                  <div className="flex gap-2">
                    <input
                      type={showLineToken ? 'text' : 'password'}
                      placeholder={tenant?.hasLineOa ? '••••••••••••••••••••• (set)' : 'Channel access token จาก LINE Developers'}
                      value={intForm.lineChannelToken}
                      onChange={(e) => setIntForm((p) => ({ ...p, lineChannelToken: e.target.value }))}
                      className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <button type="button" onClick={() => setShowLineToken((v) => !v)}
                      className="h-10 px-3 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                      {showLineToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {intError   && <p className="text-sm text-red-500">{intError}</p>}
              {intSuccess && <p className="text-sm text-green-600">บันทึกสำเร็จ ✓</p>}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={intSaving}
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {intSaving ? 'Saving…' : 'Save Integrations'}
                </button>
              </div>
            </form>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-gray-800">Notification Preferences</h2>
              {/* TODO: Per-channel toggles (Email, SMS, In-app) for each event type */}
              {[
                'New student enrollment',
                'Payment received',
                'Payment overdue',
                'Low stock alert',
                'PO delivery due',
                'New campaign report',
                'Task assigned to me',
                'System alerts',
              ].map((event) => (
                <div key={event} className="flex items-center justify-between py-3 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{event}</span>
                  <div className="flex items-center gap-4">
                    {/* TODO: toggle switches for Email / SMS / In-app */}
                    {['Email', 'SMS', 'In-app'].map((ch) => (
                      <div key={ch} className="flex items-center gap-1.5">
                        <div className="h-4 w-8 bg-orange-200 rounded-full" />
                        <span className="text-xs text-gray-400">{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <div className="h-9 w-28 bg-orange-500 rounded-lg" />
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeSection === 'danger' && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
              <p className="text-sm text-gray-500">
                Actions here are irreversible. Please proceed with caution.
              </p>

              {/* TODO: Export all data */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-800">Export all workspace data</p>
                  <p className="text-xs text-gray-400 mt-0.5">Download a full backup of your school&apos;s data</p>
                </div>
                <div className="h-9 w-24 bg-gray-100 rounded-lg" />
              </div>

              {/* TODO: Delete workspace */}
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-xl bg-red-50">
                <div>
                  <p className="text-sm font-medium text-red-700">Delete workspace</p>
                  <p className="text-xs text-red-400 mt-0.5">
                    Permanently delete this workspace and all data. This cannot be undone.
                  </p>
                  </div>
                  <button className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors">
                    Delete Workspace
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
}