// Created At: 2026-04-10 09:30:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 09:30:00 +07:00 (v1.0.0)

'use client'

import { useState } from 'react'
import { FileQuestion, ChevronDown, ChevronUp } from 'lucide-react'

const FAQS = [
  {
    category: 'บัญชีและการเข้าสู่ระบบ',
    items: [
      {
        q: 'ลืมรหัสผ่าน ทำอย่างไร?',
        a: 'ติดต่อ OWNER หรือ MANAGER ของร้านเพื่อให้รีเซ็ตรหัสผ่านให้ผ่านหน้า Employees → รายชื่อ → กดแก้ไขพนักงาน',
      },
      {
        q: 'เปลี่ยน Role ของพนักงานได้ไหม?',
        a: 'ได้ — OWNER/MANAGER สามารถแก้ไข Role ได้ที่ Employees → รายชื่อ → แก้ไข ทั้งนี้ Role กำหนดสิทธิ์การเข้าถึงโมดูลต่าง ๆ',
      },
      {
        q: 'พนักงานหลายคนสามารถ Login พร้อมกันได้ไหม?',
        a: 'ได้ ไม่มีการจำกัดจำนวน Session พร้อมกัน แต่ละคน Login ด้วย Email และรหัสผ่านของตนเอง',
      },
    ],
  },
  {
    category: 'Inbox และการสนทนา',
    items: [
      {
        q: 'ทำไม Facebook Message ไม่เข้า Inbox?',
        a: 'ตรวจสอบว่า Facebook Page ID และ Page Access Token ถูกกรอกและบันทึกที่ Settings → Integrations แล้ว และ Webhook ของ Facebook Page ชี้มาที่ Zuri ถูกต้อง',
      },
      {
        q: 'LINE Message ไม่ขึ้นใน Inbox ทำอย่างไร?',
        a: 'ตรวจสอบ LINE OA ID, Channel Access Token และ Channel Secret ที่ Settings → Integrations ต้องตรงกับค่าใน LINE Developers Console ทุกตัว',
      },
      {
        q: 'Agent Mode คืออะไร?',
        a: 'Agent Mode = พนักงานรับไม้ตอบเองแทน AI ระบบจะหยุดตอบอัตโนมัติและแสดงว่า "กำลังดูแลโดยทีมงาน" ปิด Agent Mode ได้ที่ปุ่มในหน้าสนทนา',
      },
      {
        q: 'จะมอบหมายสนทนาให้พนักงานคนอื่นได้ไหม?',
        a: 'ได้ ในหน้าสนทนาให้กดที่ชื่อผู้รับผิดชอบ (Assignee) แล้วเลือกพนักงานที่ต้องการ',
      },
    ],
  },
  {
    category: 'CRM และลูกค้า',
    items: [
      {
        q: 'ข้อมูลลูกค้าจาก Facebook และ LINE แยกกันไหม?',
        a: 'ในปัจจุบันระบบเก็บแยกตามช่องทาง แต่ถ้าลูกค้าคนเดียวกันส่งจากทั้งสองช่องทาง จะมี Profile แยก 2 รายการ',
      },
      {
        q: 'Segment คืออะไร?',
        a: 'Segment คือการจัดกลุ่มลูกค้าตามเงื่อนไข เช่น "ลูกค้าที่ซื้อครั้งล่าสุดมากกว่า 30 วัน" สามารถใช้ส่งแคมเปญ Marketing ได้',
      },
    ],
  },
  {
    category: 'POS และการขาย',
    items: [
      {
        q: 'ออกบิลแล้วแก้ไขได้ไหม?',
        a: 'ออเดอร์ที่ COMPLETED แล้วแก้ไขไม่ได้ ต้องติดต่อ MANAGER เพื่อยกเลิกและสร้างออเดอร์ใหม่',
      },
      {
        q: 'POS Mobile ต่างจาก POS ปกติอย่างไร?',
        a: 'POS Mobile ออกแบบสำหรับหน้าจอโทรศัพท์ ใช้สำหรับพนักงานรับออเดอร์ ณ โต๊ะลูกค้า ส่วน POS ปกติเหมาะกับ Tablet/Desktop ที่เคาน์เตอร์',
      },
    ],
  },
  {
    category: 'Marketing และแคมเปญ',
    items: [
      {
        q: 'Daily Brief คืออะไร?',
        a: 'Daily Brief คือรายงานสรุปยอดขายรายวันที่ AI สร้างให้อัตโนมัติทุกเช้า ประกอบด้วยยอดขาย, จำนวนออเดอร์, และข้อสังเกตสำคัญ',
      },
      {
        q: 'แคมเปญส่งผ่านช่องทางอะไรได้บ้าง?',
        a: 'ปัจจุบันรองรับการส่งผ่าน LINE Broadcast และ Facebook (ตามสิทธิ์ที่ได้รับจาก Meta)',
      },
    ],
  },
  {
    category: 'ระบบและข้อมูล',
    items: [
      {
        q: 'Audit Log คืออะไร ใครดูได้บ้าง?',
        a: 'Audit Log บันทึกทุกการกระทำสำคัญในระบบ เช่น Login, สร้างออเดอร์, แก้ไขพนักงาน OWNER และ MANAGER ดูได้ที่ Settings → Audit Log',
      },
      {
        q: 'ข้อมูลของร้านเราปลอดภัยไหม?',
        a: 'ข้อมูลทุกร้านแยกกันสมบูรณ์ (Multi-tenant Isolation) ข้อมูลลูกค้า, ออเดอร์ และสนทนา ของร้านหนึ่งไม่สามารถเข้าถึงได้จากร้านอื่น Token ทุกตัวเข้ารหัส AES-256',
      },
      {
        q: 'Export ข้อมูลได้ไหม?',
        a: 'Audit Log สามารถ Export เป็น CSV หรือ JSON ได้ที่ Audit Log → ปุ่ม Export CSV ส่วนข้อมูลอื่นอยู่ใน Roadmap',
      },
    ],
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between py-3.5 px-1 text-left gap-3 group"
      >
        <span className="text-sm font-medium text-gray-800 group-hover:text-[#E8820C] transition-colors">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="pb-4 px-1 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 py-4 px-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
        <div className="h-11 w-11 rounded-xl bg-[#E8820C] flex items-center justify-center flex-shrink-0 shadow">
          <FileQuestion className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">คำถามที่พบบ่อย (FAQ)</h1>
          <p className="text-xs text-gray-500 mt-0.5">คำตอบสำหรับคำถามที่ทีมงานถามบ่อยที่สุด</p>
        </div>
      </div>

      {/* FAQ Sections */}
      {FAQS.map((section) => (
        <div key={section.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.category}</h2>
          </div>
          <div className="px-5">
            {section.items.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
