'use client';

// Created At: 2026-04-10 03:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 03:30:00 +07:00 (v1.0.0)

// Integrations — Per-tenant channel & platform configuration
// Channels: Facebook Messenger, LINE Official Account
// Platforms: Meta Ads (Ad Account)

import { useState } from 'react';
import { useTenant } from '@/context/TenantContext';

const EMPTY_FORM = {
  fbPageId:          '',
  fbPageToken:       '',
  lineOaId:          '',
  lineChannelToken:  '',
  lineChannelSecret: '',
};

export default function IntegrationsPage() {
  const { tenant } = useTenant();

  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState(null);

  const [showFbToken,          setShowFbToken]          = useState(false);
  const [showLineToken,        setShowLineToken]         = useState(false);
  const [showLineSecret,       setShowLineSecret]        = useState(false);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      // Only send fields that have been filled in
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v.trim() !== '')
      );
      const res = await fetch('/api/tenant/integrations', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          เชื่อมต่อช่องทางและ Platform ภายนอก — token ถูก encrypt ก่อนเก็บใน DB
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* ── Facebook Messenger ───────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">f</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Facebook Messenger</h2>
              <p className="text-xs text-gray-400">รับข้อความจาก Facebook Page ของคุณ</p>
            </div>
            {tenant?.hasFbPage && (
              <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                Connected
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Facebook Page ID <span className="text-gray-400 font-normal">(เช่น 123456789012345)</span>
            </label>
            <input
              type="text"
              placeholder="ใส่ Page ID ของคุณ"
              value={form.fbPageId}
              onChange={set('fbPageId')}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Page Access Token{' '}
              {tenant?.hasFbPage && <span className="text-green-600 font-normal">(set — ใส่ใหม่เพื่อเปลี่ยน)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showFbToken ? 'text' : 'password'}
                placeholder={tenant?.hasFbPage ? '••••••••• (set)' : 'EAAxxxxxxxxxxxxxxx'}
                value={form.fbPageToken}
                onChange={set('fbPageToken')}
                className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={() => setShowFbToken((v) => !v)}
                className="h-10 px-3 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showFbToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Webhook URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">/api/webhooks/facebook</code>
          </p>
        </section>

        {/* ── LINE Official Account ────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center text-sm font-bold text-green-600">L</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">LINE Official Account</h2>
              <p className="text-xs text-gray-400">รับข้อความจาก LINE OA ของคุณ</p>
            </div>
            {tenant?.hasLineOa && (
              <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                Connected
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              LINE Bot User ID (destination){' '}
              <span className="text-gray-400 font-normal">— ดูได้ใน LINE Developers &gt; Channel &gt; Basic Settings</span>
            </label>
            <input
              type="text"
              placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.lineOaId}
              onChange={set('lineOaId')}
              className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Channel Secret{' '}
              {tenant?.hasLineChannelSecret && <span className="text-green-600 font-normal">(set — ใส่ใหม่เพื่อเปลี่ยน)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showLineSecret ? 'text' : 'password'}
                placeholder={tenant?.hasLineChannelSecret ? '••••••••• (set)' : 'Channel Secret จาก LINE Developers'}
                value={form.lineChannelSecret}
                onChange={set('lineChannelSecret')}
                className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                type="button"
                onClick={() => setShowLineSecret((v) => !v)}
                className="h-10 px-3 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showLineSecret ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Channel Access Token{' '}
              {tenant?.hasLineOa && <span className="text-green-600 font-normal">(set — ใส่ใหม่เพื่อเปลี่ยน)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type={showLineToken ? 'text' : 'password'}
                placeholder={tenant?.hasLineOa ? '••••••••• (set)' : 'Channel Access Token จาก LINE Developers'}
                value={form.lineChannelToken}
                onChange={set('lineChannelToken')}
                className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                type="button"
                onClick={() => setShowLineToken((v) => !v)}
                className="h-10 px-3 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showLineToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Webhook URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">/api/webhooks/line</code>
          </p>
        </section>

        {/* ── Meta Ads ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-700">M</div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Meta Ads</h2>
              <p className="text-xs text-gray-400">ดู Campaign / AdSet / Ad metrics ใน Marketing Analytics</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Ad Accounts จัดการผ่านหน้า <strong>Marketing &gt; Ad Accounts</strong> — ใช้ System User Token จาก Meta Business Manager.
          </p>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Sync ทุก 1 ชั่วโมงโดย <code className="font-mono">sync-hourly</code> worker (QStash cron)
          </p>
        </section>

        {/* Feedback */}
        {error   && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">บันทึกสำเร็จ — tokens ถูก encrypt แล้ว</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 bg-[#E8820C] hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save Integrations'}
          </button>
        </div>
      </form>
    </div>
  );
}
