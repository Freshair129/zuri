// Created At: 2026-04-10 09:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 09:30:00 +07:00 (v1.0.0)

'use client'

import { Phone, Mail, MessageCircle, Clock, AlertCircle, Info } from 'lucide-react'

const CHANNELS = [
  {
    icon: Mail,
    label: 'Email Support',
    value: 'support@zuri.app',
    desc: 'สำหรับปัญหาทั่วไป ข้อเสนอแนะ และ Feature Request',
    response: 'ตอบภายใน 1 วันทำการ',
    href: 'mailto:support@zuri.app',
    color: 'text-blue-600 bg-blue-50 border-blue-100',
  },
  {
    icon: MessageCircle,
    label: 'LINE Official Account',
    value: '@zuri.support',
    desc: 'สำหรับปัญหาเร่งด่วนหรือต้องการ Screen Share',
    response: 'ตอบภายใน 4 ชั่วโมง (เวลาทำการ)',
    href: 'https://line.me/ti/p/@zuri.support',
    color: 'text-green-600 bg-green-50 border-green-100',
  },
]

const HOURS = [
  { day: 'จันทร์ – ศุกร์', time: '09:00 – 18:00 น.' },
  { day: 'เสาร์', time: '09:00 – 13:00 น.' },
  { day: 'อาทิตย์ & วันหยุดนักขัตฤกษ์', time: 'ปิดทำการ' },
]

const SEVERITY_GUIDE = [
  { label: 'Critical', color: 'text-red-600 bg-red-50', desc: 'ระบบใช้งานไม่ได้ / ข้อมูลหาย — แจ้งทาง LINE ทันที' },
  { label: 'Major', color: 'text-orange-600 bg-orange-50', desc: 'กระทบการทำงานมาก — แจ้งทาง LINE หรือ Email' },
  { label: 'Minor / Trivial', color: 'text-gray-600 bg-gray-50', desc: 'กระทบเล็กน้อย — ส่งผ่านแบบฟอร์ม UAT Feedback' },
]

export default function ContactPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 py-4 px-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
        <div className="h-11 w-11 rounded-xl bg-[#E8820C] flex items-center justify-center flex-shrink-0 shadow">
          <Phone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">ติดต่อ Support</h1>
          <p className="text-xs text-gray-500 mt-0.5">ทีม Zuri พร้อมช่วยเหลือคุณในเวลาทำการ</p>
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        {CHANNELS.map((ch) => (
          <a
            key={ch.label}
            href={ch.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-4 p-4 rounded-2xl border ${ch.color} hover:shadow-sm transition-shadow`}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-current/20">
              <ch.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{ch.label}</p>
              <p className="text-base font-bold mt-0.5">{ch.value}</p>
              <p className="text-xs opacity-75 mt-1">{ch.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                <Clock className="h-3 w-3" />
                {ch.response}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">เวลาทำการ</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {HOURS.map((h) => (
            <div key={h.day} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{h.day}</span>
              <span className={`font-medium ${h.time === 'ปิดทำการ' ? 'text-gray-400' : 'text-gray-900'}`}>{h.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Severity Guide */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">แจ้งปัญหาช่องทางไหน?</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {SEVERITY_GUIDE.map((s) => (
            <div key={s.label} className={`flex items-start gap-3 p-3 rounded-xl ${s.color}`}>
              <span className="text-xs font-bold flex-shrink-0 mt-0.5">{s.label}</span>
              <span className="text-xs">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* UAT note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          ระหว่างช่วง UAT — กรุณาใช้แบบฟอร์ม{' '}
          <a href="/uat" className="font-semibold underline">UAT Feedback</a>
          {' '}เพื่อรายงานปัญหา ทีม Zuri จะรีวิวทุก Feedback ภายใน 24 ชั่วโมง
        </p>
      </div>
    </div>
  )
}
