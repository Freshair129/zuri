// Created At: 2026-04-10 06:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 06:00:00 +07:00 (v1.0.0)

'use client'

/**
 * Help Center — Zuri Platform Guide
 * M7 Task G2 / ZDEV-TSK-20260410-029
 *
 * Covers: Getting Started · Inbox · CRM · POS · Marketing · Kitchen · Settings
 */

import { useState } from 'react'
import {
  HelpCircle, MessageSquare, Users, ShoppingCart, Megaphone,
  ChefHat, Settings, ChevronDown, ChevronRight, Search,
  CheckCircle2, AlertCircle, Info, Zap, BookOpen,
} from 'lucide-react'

// ─── Content ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'getting-started',
    icon: Zap,
    color: 'text-orange-600 bg-orange-50',
    title: 'เริ่มต้นใช้งาน Zuri',
    articles: [
      {
        title: 'Zuri คืออะไร?',
        body: `Zuri คือ AI Business Platform สำหรับธุรกิจบริการไทย ออกแบบมาเพื่อ
โรงเรียนสอนทำอาหาร, ร้านอาหาร, และธุรกิจ Service SME — รวม Inbox, CRM, POS,
Marketing Analytics, Kitchen Ops และ AI Assistant ไว้ในที่เดียว

สิ่งที่ Zuri ช่วยคุณ:
• รับข้อความจาก Facebook Messenger และ LINE OA ในที่เดียว
• จัดการข้อมูลลูกค้า (CRM) พร้อม purchase intent scoring
• เปิดบิล/ใบเสร็จผ่าน POS
• ดู Ad Performance จาก Meta Ads
• วางแผนการผลิตในครัว`,
      },
      {
        title: 'การเข้าสู่ระบบครั้งแรก',
        body: `1. เปิด browser แล้วไปที่ URL ของ Tenant คุณ (เช่น vschool.zuri.app)
2. กรอก Email และ Password ที่ได้รับจาก Admin
3. หลัง Login สำเร็จ ระบบจะพาไปที่หน้า Overview โดยอัตโนมัติ

หากลืม Password ติดต่อ Admin หรือใช้ฟีเจอร์ Reset Password
(Admin: Settings → Team & Roles → Reset Password)`,
      },
      {
        title: 'สิทธิ์ผู้ใช้ (Roles)',
        body: `Zuri มี 6 บทบาท:

• OWNER — เข้าถึงทุก module + Billing + Admin settings
• MANAGER — Full access ทุก module ยกเว้น Billing
• SALES — Inbox, CRM, Marketing, POS
• KITCHEN — Kitchen Ops, Stock, Procurement
• FINANCE — Dashboard, Orders, Accounting
• STAFF — อ่านข้อมูลได้ ไม่สามารถแก้ไข

Admin กำหนด Role ได้ที่ Settings → Team & Roles`,
      },
    ],
  },
  {
    id: 'inbox',
    icon: MessageSquare,
    color: 'text-blue-600 bg-blue-50',
    title: 'Inbox — รับข้อความ',
    articles: [
      {
        title: 'เชื่อมต่อ Facebook Page',
        body: `1. ไปที่ Settings → Integrations
2. กรอก Facebook Page ID (ดูได้จาก facebook.com/[PageName]/about)
3. กรอก Page Access Token (ดูได้จาก Meta for Developers → Access Tokens)
4. กด Save — ระบบจะ encrypt token ก่อนเก็บใน Database
5. ตรวจสอบว่า Webhook URL (/api/webhooks/facebook) ถูก set ใน Meta App

เมื่อเชื่อมต่อสำเร็จ จะเห็น ✅ Connected ที่ Facebook Messenger section`,
      },
      {
        title: 'เชื่อมต่อ LINE Official Account',
        body: `1. ไปที่ Settings → Integrations
2. กรอก LINE Bot User ID (ดูได้จาก LINE Developers → Basic Settings → Your user ID)
3. กรอก Channel Secret (LINE Developers → Messaging API → Channel secret)
4. กรอก Channel Access Token (LINE Developers → Messaging API → Channel access token)
5. ตั้ง Webhook URL เป็น https://[slug].zuri.app/api/webhooks/line

หมายเหตุ: LINE Bot User ID ขึ้นต้นด้วย "U" (เช่น Uxxxxxxxxxxxxxxxxx)`,
      },
      {
        title: 'การตอบข้อความ',
        body: `• คลิกที่ conversation เพื่อเปิด chat panel
• พิมพ์ข้อความในช่อง input ด้านล่าง แล้วกด Enter หรือปุ่ม Send
• กด "AI Suggest" เพื่อให้ Zuri AI ร่างข้อความตอบให้
• กด "Agent Mode" เพื่อให้ AI ตอบอัตโนมัติ (MANAGER ขึ้นไปเท่านั้น)

สีสถานะ:
🟢 Open — มีข้อความใหม่รอตอบ
🟡 Pending — รอข้อมูลเพิ่มเติมจากลูกค้า
⚫ Closed — จบการสนทนา`,
      },
    ],
  },
  {
    id: 'crm',
    icon: Users,
    color: 'text-purple-600 bg-purple-50',
    title: 'CRM — จัดการลูกค้า',
    articles: [
      {
        title: 'ข้อมูลลูกค้า',
        body: `ข้อมูลลูกค้าแต่ละรายประกอบด้วย:
• ชื่อ, เบอร์โทร, อีเมล, LINE ID, Facebook
• Lifecycle Stage: NEW → PROSPECT → ACTIVE → VIP → CHURNED
• Purchase Intent Score (0-100) — AI คำนวณจากประวัติสนทนา
• Tag สำหรับจัดกลุ่ม
• ประวัติ Order และ Enrollment ทั้งหมด

ระบบจะ merge ลูกค้าอัตโนมัติเมื่อพบว่าเป็นคนเดียวกัน (เบอร์หรืออีเมลซ้ำ)`,
      },
      {
        title: 'Lifecycle Stage',
        body: `Stage กำหนดได้เองหรือให้ AI อัปเดตอัตโนมัติ:

NEW — ลูกค้าใหม่ เพิ่งเริ่มติดต่อ
PROSPECT — แสดงความสนใจ ยังไม่ซื้อ
ACTIVE — เคยซื้อแล้ว ยังใช้งานอยู่
VIP — ลูกค้าประจำ มูลค่าสูง
AT_RISK — ไม่มีกิจกรรมนาน → ควรติดต่อ
CHURNED — หยุดใช้งาน

เปลี่ยน Stage: เปิด Customer Profile → คลิกที่ Stage badge → เลือก Stage ใหม่`,
      },
      {
        title: 'CTA Assignment',
        body: `ระบบจะแนะนำ Call-to-Action ให้ Staff โดยอัตโนมัติตาม Purchase Intent:

Intent 80-100: "ปิดการขาย — เสนอโปรโมชัน"
Intent 50-79:  "ส่ง Course Catalog"
Intent 20-49:  "ส่ง Free Trial Invitation"
Intent 0-19:   "Nurture — ส่ง Content"

CTA จะปรากฏใน Inbox panel ด้านขวาของ conversation`,
      },
    ],
  },
  {
    id: 'pos',
    icon: ShoppingCart,
    color: 'text-emerald-600 bg-emerald-50',
    title: 'POS — ขายหน้าร้าน',
    articles: [
      {
        title: 'สร้าง Order',
        body: `1. ไปที่ POS → Cart
2. เลือกสินค้า/คอร์สจาก catalog หรือค้นหาด้วยชื่อ
3. กำหนดจำนวน
4. เลือกลูกค้า (ถ้ามี) หรือ Walk-in
5. กด Checkout → เลือกวิธีชำระเงิน (Cash, Transfer, Card)
6. กด Confirm → ระบบออกใบเสร็จอัตโนมัติ

Order จะบันทึกใน CRM ของลูกค้าโดยอัตโนมัติ`,
      },
      {
        title: 'จัดการ Order',
        body: `• ดู Order ทั้งหมดที่ POS → Orders
• สถานะ: PENDING → CONFIRMED → COMPLETED → CANCELLED
• Cancel Order: MANAGER ขึ้นไปเท่านั้น
• Export: กด Export → CSV หรือ PDF
• Refund: ยังไม่รองรับในเวอร์ชันนี้ ให้สร้าง Credit Note ด้วยตนเอง`,
      },
    ],
  },
  {
    id: 'marketing',
    icon: Megaphone,
    color: 'text-rose-600 bg-rose-50',
    title: 'Marketing — โฆษณา',
    articles: [
      {
        title: 'Meta Ads Analytics',
        body: `Zuri ดึงข้อมูล Campaign, AdSet, Ad และ Daily Metrics จาก Meta Ads
โดยอัตโนมัติทุก 1 ชั่วโมง (ผ่าน QStash cron worker)

ข้อมูลที่แสดง:
• Spend, Impressions, Clicks, Leads, Purchases
• ROAS, CPM, CPC, Cost per Lead
• Status: ACTIVE / PAUSED / ARCHIVED

Setup: Admin Panel → Ad Accounts → เพิ่ม Meta Ads Account ID`,
      },
      {
        title: 'Daily Sales Brief (AI)',
        body: `AI สรุปยอดขายรายวันส่งให้ทุกเช้า 07:00 น. (ผ่าน LINE Notify หรือ Email)

รายงานประกอบด้วย:
• ยอดขายวาน vs วันก่อนหน้า
• Conversion rate จาก Inbox
• Top 3 สินค้าขายดี
• Pending chats ที่ยังไม่ได้ตอบ
• คำแนะนำจาก AI (โอกาส, ความเสี่ยง)`,
      },
    ],
  },
  {
    id: 'kitchen',
    icon: ChefHat,
    color: 'text-amber-600 bg-amber-50',
    title: 'Kitchen Ops — ครัว',
    articles: [
      {
        title: 'Stock Management',
        body: `• ดู Stock ปัจจุบันที่ Kitchen → Stock
• เพิ่ม/ลด Stock ด้วย Stock Movement
• ระบบใช้ FEFO (First Expired, First Out) โดยอัตโนมัติ
• Alert เมื่อ Stock ต่ำกว่า Minimum Level
• ดู Stock Valuation ได้จาก Stock Summary`,
      },
      {
        title: 'Procurement',
        body: `1. Kitchen → Procurement → สร้าง Purchase Request
2. MANAGER/OWNER Approve PR → กลายเป็น Purchase Order
3. เมื่อสินค้ามาถึง กด Receive → Stock อัปเดตอัตโนมัติ
4. ดูประวัติการสั่งซื้อจาก Supplier ได้ที่ Procurement → History`,
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    color: 'text-gray-600 bg-gray-100',
    title: 'Settings — การตั้งค่า',
    articles: [
      {
        title: 'เพิ่มสมาชิกทีม',
        body: `Settings → Team & Roles → เพิ่มพนักงาน
กรอก: ชื่อ, อีเมล, เบอร์โทร, แผนก, บทบาท (Role)
ระบบจะส่ง Email แจ้ง Password เริ่มต้น (รูปแบบ: email_changeme)
พนักงานควรเปลี่ยน Password ทันทีหลัง Login ครั้งแรก`,
      },
      {
        title: 'Branding & ตั้งค่า Workspace',
        body: `Settings → Workspace:
• อัปโหลดโลโก้
• กำหนดสี Brand หลัก/รอง
• ตั้งค่า Timezone (Asia/Bangkok)
• ตั้งค่า Currency (THB)
• ตั้งค่า VAT Rate (ค่าเริ่มต้น 7%)`,
      },
    ],
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function ArticleCard({ article }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{article.title}</span>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
            {article.body}
          </pre>
        </div>
      )}
    </div>
  )
}

function SectionCard({ section }) {
  const [collapsed, setCollapsed] = useState(false)
  const Icon = section.icon
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${section.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-base font-bold text-gray-900 flex-1">{section.title}</span>
        <span className="text-xs text-gray-400 mr-2">{section.articles.length} บทความ</span>
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-gray-400" />
          : <ChevronDown className="h-4 w-4 text-gray-400" />
        }
      </button>
      {!collapsed && (
        <div className="px-6 pb-6 space-y-2.5 border-t border-gray-100 pt-4">
          {section.articles.map((a) => <ArticleCard key={a.title} article={a} />)}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? SECTIONS.map((s) => ({
        ...s,
        articles: s.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.body.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter((s) => s.articles.length > 0)
    : SECTIONS

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-[#E8820C] flex items-center justify-center shadow-lg">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Zuri Help Center</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">คู่มือการใช้งาน Platform สำหรับทีม V School</p>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาบทความ…"
            className="w-full h-11 pl-10 pr-4 bg-white border border-orange-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
          />
        </div>
      </div>

      {/* Quick tips */}
      {!query && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', text: 'เชื่อมต่อ Facebook + LINE ที่ Settings → Integrations ก่อนใช้งาน Inbox' },
            { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', text: 'AI Agent Mode ต้องเปิดด้วยตนเองต่อ Conversation — ไม่เปิดอัตโนมัติ' },
            { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', text: 'Audit Log บันทึกทุก action ที่ sensitive เช่น เปลี่ยน Role, Export ข้อมูล' },
          ].map((tip, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${tip.bg} border border-current/10`}>
              <tip.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${tip.color}`} />
              <p className="text-xs text-gray-700 leading-relaxed">{tip.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {filtered.length > 0
        ? filtered.map((s) => <SectionCard key={s.id} section={s} />)
        : (
          <div className="text-center py-12 text-gray-400">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">ไม่พบบทความสำหรับ "{query}"</p>
          </div>
        )
      }

      {/* Contact footer */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center space-y-1">
        <p className="text-sm font-semibold text-gray-700">ไม่พบคำตอบที่ต้องการ?</p>
        <p className="text-xs text-gray-500">ติดต่อทีม Zuri Support ได้ที่ <span className="text-[#E8820C] font-medium">support@zuri.app</span> หรือ LINE: @zuri.support</p>
      </div>
    </div>
  )
}
