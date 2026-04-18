---
id: "ADR-057"
type: "architecture_decision"
status: "active"
epistemic:
  confidence: 1.0
  source_type: "direct_experience"
context_anchor:
  duration: "universal"
summary: "การออกแบบระบบสั่งอาหารผ่านมือถือ (Mobile Ordering Architecture)"
---
# ADR-057: POS Mobile Ordering Architecture

**Date:** 2026-03-30
**Status:** ACCEPTED
**Deciders:** Boss (Product Owner)
**Related:** FEAT-POS.md

---

## Context

Zuri POS ต้องการ mobile ordering page สำหรับลูกค้าสแกน QR ที่โต๊ะแล้วสั่งอาหารเองผ่านมือถือ มี 3 ทางเลือกหลัก:

**Option A: Next.js (App Router)** — ใช้ codebase เดียวกับ Zuri
**Option B: Static HTML + PHP** — host แยก lightweight
**Option C: LINE LIFF** — เปิดใน LINE browser

---

## Decision

**เลือก Option B: Static HTML + PHP** สำหรับ Phase 1

---

## Rationale

| ปัจจัย | Next.js | Static HTML+PHP | LINE LIFF |
|---|---|---|---|
| Cold start (Vercel serverless) | 800ms–2s | <100ms | <200ms |
| Deploy complexity | สูง (ผูก Vercel) | ต่ำ (shared host) |  กลาง |
| ต้นทุน hosting | Vercel (แพง traffic สูง) | ฿200–500/เดือน | ฟรี (LINE infra) |
| Offline/poor signal | ไม่รองรับ | PWA ได้ | ไม่รองรับ |
| ลูกค้าต้องมี LINE | ไม่ต้อง | ไม่ต้อง | ต้อง |
| Custom domain per tenant | ยาก | ง่าย | ไม่ได้ |

**เหตุผลหลัก:**
1. **Speed** — ลูกค้าสแกน QR ต้องเห็นเมนูภายใน 1 วินาที, Next.js cold start บน Vercel ช้าเกินไป
2. **Cost** — traffic ordering page สูง (ทุก table scan ทุก order), Vercel serverless แพงกว่า shared host มาก
3. **Simplicity** — PHP เหมาะกับ read-heavy menu display + POST order — ไม่ต้องการ React overhead
4. **Independence** — ถ้า Vercel ล่ม POS ordering ยังทำงานได้

**LINE LIFF ไม่เลือกเพราะ:**
- บังลูกค้าต้องมี LINE (barrier to entry)
- ร้านที่ลูกค้าเป็นชาวต่างชาติ/tourists จะมีปัญหา

---

## Architecture

```
mobile-order.{tenant-domain}.com  (หรือ order.zuriapp.com?tenant=xxx)
  ├── index.php          — menu display (fetch from Zuri API)
  ├── cart.php           — cart management (sessionStorage)
  ├── confirm.php        — order confirmation
  └── assets/            — static CSS/JS

Flow:
  PHP → GET https://api.zuriapp.com/api/pos/menu?tenant={id}
     → render HTML (server-side, fast)
  Customer confirms order
     → PHP POST https://api.zuriapp.com/api/pos/orders
     → Zuri API → DB → Pusher → POS Android รับ order ทันที
```

---

## Consequences

**ข้อดี:**
- Load time <500ms แม้ connection ช้า
- ต้นทุนต่ำ
- Deploy อิสระจาก Vercel

**ข้อเสีย:**
- Codebase แยก (PHP + Next.js) — ต้องดูแล 2 ที่
- UI consistency ต้องทำเอง (ไม่ใช้ component library เดิม)
- Authentication/session ต้องออกแบบใหม่

**Mitigation:**
- ใช้ Tailwind CDN ใน PHP page ให้ UI สอดคล้องกัน
- Token-based auth (QR encode tableId + tenantId + timestamp signature)

---

## Review Date

ทบทวนเมื่อ Vercel Edge Functions ดีขึ้น หรือเมื่อมี traffic data จริง
