// Created At: 2026-04-10 06:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 06:00:00 +07:00 (v1.0.0)

'use client'

/**
 * UAT Feedback Form — M7 Task G2 (ZDEV-TSK-20260410-029)
 * Collect feedback from the V School team during UAT sessions.
 * Feedback stored in Redis (uat:feedback list), viewable by DEV role only.
 */

import { useState } from 'react'
import {
  FlaskConical, CheckCircle2, AlertTriangle, AlertCircle,
  Info, Send, RotateCcw,
} from 'lucide-react'

const MODULES = [
  'Overview', 'Inbox — Facebook', 'Inbox — LINE', 'CRM', 'POS',
  'Marketing', 'Kitchen', 'Courses', 'Employees', 'Settings', 'Audit Log', 'อื่น ๆ',
]

const ROLES = ['OWNER', 'MANAGER', 'SALES', 'KITCHEN', 'FINANCE', 'STAFF']

const ISSUE_TYPES = [
  { value: 'BUG',            label: '🐛 Bug — ระบบทำงานผิดพลาด' },
  { value: 'CONFUSION',      label: '😕 Confusion — ใช้งานสับสน/ไม่เข้าใจ' },
  { value: 'FEATURE_REQUEST',label: '✨ Feature Request — อยากได้ฟีเจอร์เพิ่ม' },
  { value: 'PRAISE',         label: '👍 Praise — ชมเชย' },
]

const SEVERITIES = [
  { value: 'CRITICAL', label: 'Critical', desc: 'ใช้งานไม่ได้เลย / Data หาย',  color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'MAJOR',    label: 'Major',    desc: 'กระทบการทำงานมาก มี workaround', color: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'MINOR',    label: 'Minor',    desc: 'กระทบเล็กน้อย ยังใช้ได้',       color: 'border-yellow-400 bg-yellow-50 text-yellow-700' },
  { value: 'TRIVIAL',  label: 'Trivial',  desc: 'UI, ตัวสะกด, ความสวยงาม',       color: 'border-gray-300 bg-gray-50 text-gray-600' },
]

const EMPTY = {
  role: '', module: '', issueType: 'BUG', severity: 'MINOR',
  description: '', steps: '', expected: '', actual: '',
}

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export default function UATPage() {
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(null)
  const [error,   setError]   = useState(null)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('กรุณากรอกรายละเอียด'); return }

    setSaving(true); setError(null); setSuccess(null)
    try {
      const res  = await fetch('/api/uat/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submit failed')
      setSuccess(json.id)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-colors'
  const textareaCls = `${inputCls} resize-none`

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 py-4 px-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
        <div className="h-11 w-11 rounded-xl bg-[#E8820C] flex items-center justify-center flex-shrink-0 shadow">
          <FlaskConical className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">UAT Feedback</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            รายงานปัญหา ข้อสงสัย หรือ Feature Request ที่พบระหว่างทดสอบ
          </p>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">ส่ง Feedback สำเร็จ</p>
            <p className="text-xs text-green-600 mt-0.5">ID: {success} — ทีม Zuri จะรีวิวและแก้ไขในรอบถัดไป</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Role + Module */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role ที่กำลังทดสอบ">
            <select value={form.role} onChange={set('role')} className={inputCls}>
              <option value="">— เลือก Role —</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Module / หน้าที่พบปัญหา">
            <select value={form.module} onChange={set('module')} className={inputCls}>
              <option value="">— เลือก Module —</option>
              {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        {/* Issue Type */}
        <Field label="ประเภทของ Feedback" required>
          <div className="grid grid-cols-2 gap-2">
            {ISSUE_TYPES.map((it) => (
              <label key={it.value}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
                  form.issueType === it.value
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input type="radio" name="issueType" value={it.value} checked={form.issueType === it.value}
                  onChange={set('issueType')} className="sr-only" />
                <span className={form.issueType === it.value ? 'font-semibold text-gray-800' : 'text-gray-600'}>
                  {it.label}
                </span>
              </label>
            ))}
          </div>
        </Field>

        {/* Severity — hide for Praise */}
        {form.issueType !== 'PRAISE' && (
          <Field label="ระดับความรุนแรง (Severity)" required>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITIES.map((s) => (
                <label key={s.value}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.severity === s.value ? s.color + ' border-current' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input type="radio" name="severity" value={s.value} checked={form.severity === s.value}
                    onChange={set('severity')} className="sr-only" />
                  <p className="text-sm font-bold">{s.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">{s.desc}</p>
                </label>
              ))}
            </div>
          </Field>
        )}

        {/* Description */}
        <Field label="รายละเอียด" required hint="อธิบายสิ่งที่เกิดขึ้นหรือสิ่งที่ต้องการ">
          <textarea
            rows={4}
            value={form.description}
            onChange={set('description')}
            placeholder="เช่น: กดปุ่ม Save ใน Settings → Integrations แล้วหน้าจอค้าง ไม่มีข้อความแจ้งเตือน"
            className={textareaCls}
          />
        </Field>

        {/* Steps / Expected / Actual — only for Bug */}
        {form.issueType === 'BUG' && (
          <>
            <Field label="ขั้นตอนที่ทำ (Steps to reproduce)" hint="ทีละขั้น">
              <textarea rows={3} value={form.steps} onChange={set('steps')}
                placeholder="1. ไปที่ Settings → Integrations&#10;2. กรอก Facebook Page ID&#10;3. กด Save"
                className={textareaCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ผลที่คาดหวัง (Expected)">
                <textarea rows={2} value={form.expected} onChange={set('expected')}
                  placeholder="บันทึกสำเร็จ ขึ้นข้อความ 'Saved'"
                  className={textareaCls}
                />
              </Field>
              <Field label="ผลที่เกิดขึ้นจริง (Actual)">
                <textarea rows={2} value={form.actual} onChange={set('actual')}
                  placeholder="หน้าค้าง loading นาน 10 วินาที"
                  className={textareaCls}
                />
              </Field>
            </div>
          </>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Feedback จะถูกบันทึกพร้อม Email และ Role ของคุณ
            เพื่อให้ทีม Zuri ติดตามได้ — ไม่มีข้อมูลส่วนตัวอื่นถูกบันทึก
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={() => { setForm(EMPTY); setSuccess(null); setError(null) }}
            className="flex items-center gap-1.5 h-10 px-4 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            ล้างฟอร์ม
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 h-10 px-6 bg-[#E8820C] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            {saving ? 'กำลังส่ง…' : <><Send className="h-4 w-4" />ส่ง Feedback</>}
          </button>
        </div>
      </form>
    </div>
  )
}
