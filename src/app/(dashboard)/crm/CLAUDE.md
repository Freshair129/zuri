# CRM Module — Agent Context

**Specs:** `docs/product/specs/FEAT05-CRM.md` · `docs/product/specs/FEAT02-PROFILE.md`
**Roles:** SALES (own customers), MANAGER (all), OWNER (read)

## Models
- `Customer` — record หลัก มี `tenantId`, `lifecycleStage`, `assigneeId`
- `CustomerProfile` — ข้อมูล 360: ประวัติซื้อ, V Points, AI insight
- `CustomerIdentity` — FB PSID / LINE UID ต่อ customer (many-to-one)

## Lifecycle Stages
```
NEW → CONTACTED → INTERESTED → ENROLLED → PAID → CHURNED
```

## Customer 360 Page (`/crm/:id`)
ประกอบด้วย:
1. Mini Header — ชื่อ, สถานะ, platform badges
2. Activity Timeline — Inbox + POS + Enrollment events
3. Enrollment History + V Points balance
4. AI Insight — churn risk, purchase pattern (Gemini)
5. Quick Actions — ส่งข้อความ, สร้าง Invoice

## Identity Resolution (CRITICAL)
- ลูกค้า 1 คนอาจมีหลาย platform identity (FB + LINE)
- Merge ผ่าน `prisma.$transaction` เท่านั้น (NFR5)
- ห้าม merge โดยไม่มี MANAGER approve

## Permission Rules (ADR-068)
- SALES: CRUD เฉพาะ customer ที่ `assigneeId` ตรงกับ userId ของตัวเอง
- MANAGER: CRUD ทุก customer, merge, bulk ops, export ทั้งหมด
- Export phone/email: SALES และ MANAGER เท่านั้น

## Repo Functions
```js
import { customerRepo } from '@/lib/repositories/customerRepo'
// customerRepo.list(tenantId, { stage, assigneeId, search })
// customerRepo.getById(tenantId, customerId)
// customerRepo.updateStage(tenantId, customerId, stage)
// customerRepo.merge(tenantId, primaryId, secondaryId) // ใช้ $transaction
```

## Gotchas
- Tag ลบได้เฉพาะ MANAGER — cascade กระทบ customer อื่น
- `lifecycleStage` ต้องมาจาก `system_config.yaml → customer.lifecycle_stages`
- AI Insight call ผ่าน `/api/ai/ask` พร้อม `customerId` scope — ห้าม expose ข้อมูล tenant อื่น
