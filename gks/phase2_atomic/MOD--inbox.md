---
id: module--inbox
type: module
module: inbox
status: partial
version: 1.0.0
owner: "@customer-success"
summary: "ศูนย์รวมการติดต่อสื่อสารแบบ Omni-Channel (Unified Inbox & Pipeline)"
tags: [inbox, omichannel, messaging, facebook, line]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Inbox (Omni-Channel Messaging)

## 1. Responsibility
ทำหน้าที่เป็นศูนย์กลางการรับ-ส่งข้อความจากหลากหลายแพลตฟอร์ม (Facebook Messenger, LINE OA) โดยรวมศูนย์บทสนทนาไว้ในที่เดียว และจัดการสถานะของลูกค้าผ่านระบบ Pipeline ตลอดอายุการขาย

## 2. Boundaries
- **Upstream**: [[module--core]] (Channel config), Messaging Platform Webhooks (FB/LINE)
- **Downstream**: [[module--crm]] (Customer identity), [[module--billing]] (Quick Sale / ChatPOS)

## 3. Key Decisions
- [[ADR-028-facebook-integration]]
- [[ADR-033-unified-inbox-architecture]]
- [[ADR-044-webpush-realtime]]

## 4. Feature Index
- [[FEAT--inbox]] (Unified View)
- [[FEAT--inbox-pipeline]] (Custom Stages)

## 5. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Conversations | SLS/AGT | RU | อ่านและตอบลูกค้าในความรับผิดชอบ |
| Pipelines | MGR/ADM | CRUD | ตั้งค่า Pipeline Stages ของร้าน |
| Webhooks | System | CR | ระบบจัดการข้อความขาเข้า |
