// Created At: 2026-04-12 00:00:00 +07:00 (v1.0.0)
// FEAT21: Public join page via invitation token — ADR-077 / ZUR-20
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, KeyRound } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('validating') // validating | valid | invalid | submitting | success | error
  const [invitation, setInvitation] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    fetch(`/api/team/invite/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) { setInvitation(data); setStatus('valid') }
        else setStatus('invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (form.password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setStatus('submitting')
    const res = await fetch('/api/team/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName: form.firstName, lastName: form.lastName, password: form.password }),
    })
    const data = await res.json()

    if (res.ok) {
      setStatus('success')
      setTimeout(() => router.push('/login'), 2000)
    } else {
      setError(data.message ?? data.error ?? 'เกิดข้อผิดพลาด')
      setStatus('valid')
    }
  }

  // ── Validating ──────────────────────────────────────────────
  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1710]">
        <div className="text-center text-white/60">
          <Loader2 className="mx-auto mb-3 animate-spin" size={32} />
          <p>กำลังตรวจสอบคำเชิญ...</p>
        </div>
      </div>
    )
  }

  // ── Invalid token ────────────────────────────────────────────
  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1710]">
        <div className="text-center text-white">
          <XCircle className="mx-auto mb-3 text-red-400" size={48} />
          <h1 className="text-xl font-semibold mb-2">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
          <p className="text-white/50 text-sm">กรุณาขอลิงก์เชิญใหม่จากผู้ดูแลระบบ</p>
        </div>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1710]">
        <div className="text-center text-white">
          <CheckCircle className="mx-auto mb-3 text-green-400" size={48} />
          <h1 className="text-xl font-semibold mb-2">เข้าร่วมสำเร็จ!</h1>
          <p className="text-white/50 text-sm">กำลังพาไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    )
  }

  // ── Join form ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1710] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8820C]/20 mb-4">
            <KeyRound className="text-[#E8820C]" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">คุณได้รับคำเชิญ</h1>
          <p className="text-white/50 text-sm">
            เข้าร่วมในฐานะ <span className="text-[#E8820C] font-medium">{invitation?.role}</span>
            {invitation?.email && <> · {invitation.email}</>}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 text-xs mb-1.5">ชื่อ</label>
              <input
                type="text" required
                value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8820C]/50"
                placeholder="สมชาย"
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1.5">นามสกุล</label>
              <input
                type="text" required
                value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8820C]/50"
                placeholder="ดีใจ"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1.5">รหัสผ่าน</label>
            <input
              type="password" required minLength={8}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8820C]/50"
              placeholder="อย่างน้อย 8 ตัวอักษร"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1.5">ยืนยันรหัสผ่าน</label>
            <input
              type="password" required
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#E8820C]/50"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full bg-[#E8820C] hover:bg-[#E8820C]/90 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {status === 'submitting' ? (
              <><Loader2 size={16} className="animate-spin" /> กำลังสร้างบัญชี...</>
            ) : 'เข้าร่วมทีม'}
          </button>
        </form>
      </div>
    </div>
  )
}
