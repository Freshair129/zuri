---
id: module--pos
type: module
module: pos
status: partial
version: 1.0.0
owner: "@ops-lead"
summary: "ระบบขายหน้าร้านและการจัดการผังที่นั่ง (Point of Sale, Table & Seating Management)"
tags: [pos, floorplan, seating, restaurant]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: POS (Point of Sale)

## 1. Responsibility
ดูแลการรับออเดอร์หน้าร้าน (Onsite), ออนไลน์ (QR) และเดลิเวอรี (Delivery) โดยรวมศูนย์การจัดการพื้นที่ (Floor Plan) และสถานะโต๊ะแบบ Real-time เข้าไว้ด้วยกัน

## 2. Boundaries
- **Upstream**: [[module--crm]] (Member & Loyalty), [[module--billing]] (Payments & Hardware)
- **Downstream**: [[module--kitchen]] (Food Demand), Accounting Intelligence

## 3. Key Decisions
- [[ADR-057-mobile-pos-strategy]]
- [[ADR-039-revenue-channel-split]]

## 4. Feature Index
- [[FEAT--pos-onsite]] (Floor Plan & Table Monitoring)
- [[FEAT--pos-delivery]] (Multi-type shipping)
- [[FEAT--pos-mobile]] (Viewport optimized UI)

## 5. API Contracts
- [[GET--pos-tables-monitoring]]
- [[POST--pos-order-create]]
- [[POST--pos-table-merge]]

## 6. Security & Permissions (C | R | U | D)
| Resource/Page | Role | CRUDP | Note |
|---|---|---|---|
| POS Tables | SLS/AGT | RU | รับออเดอร์และดูสถานะ |
| POS Tables | MGR/ADM | CRUD | ตั้งค่าผังร้านและแก้ไขความจุโต๊ะ |
| Order Void | MGR | D | สิทธิ์ยกเลิกออเดอร์ที่พิมพ์เข้าครัวแล้ว |
