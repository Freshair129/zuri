---
id: FEAT--pos-onsite
type: feature
module: pos
status: stable
version: 1.2.0
owner: "@ops-lead"
summary: "ระบบจัดการผังโต๊ะ การคุมสถานะที่นั่ง และการสั่งอาหารหน้าร้าน (Floor Plan & Table Management)"
tags: [pos, seated, floorplan, onsite]
depends_on: ["[[FEAT--multi-tenant]]", "[[FEAT--billing]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: POS Floor Plan & Onsite Ordering

## 1. Overview
Onsite POS ทำหน้าที่จัดการกระบวนการขายภายในหน้าร้าน โดยเน้นความง่ายในการจัดการพื้นที่ (Table/Zone Management) และการติดตามสถานะโต๊ะแบบ Real-time เพื่อเพิ่มประสิทธิภาพในการรับลูกค้า (Guest Monitoring)

## 2. Capabilities
### 2.1 Interactive Floor Plan
- การแสดงผลผังโต๊ะตามพิกัด X, Y และรองรับรูปทรงที่หลากหลาย (Rectangle, Circle)
- **Monitoring Mode**: แสดง Badge จำนวนลูกค้า (Guest Count) และสถานะโต๊ะสีสันชัดเจน

### 2.2 Table Statuses
1. **AVAILABLE**: โต๊ะว่าง
2. **OCCUPIED**: มีลูกค้าและมีออเดอร์ค้าง
3. **BILL_REQUESTED**: แจ้งเรียกเก็บเงิน (Invoice ออกแล้ว)
4. **CLEANING**: กำลังทำความสะอาด

### 2.3 Operations
- **Table Merge**: การรวมโต๊ะเข้าด้วยกันเพื่อรองรับกลุ่มใหญ่
- **Extra Seats**: ระบบการเพิ่มเก้าอี้เสริม (Plastic Seats) โดยไม่กระทบจำนวนความจุมาตรฐาน

## 3. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Tables | SLS/AGT | RU | เปลี่ยนสถานะและรับออเดอร์ |
| Floor Plan | MGR/ADM | CRUD | แก้ไขพิกัดและสร้าง Zone ใหม่ |

## 4. Technical Specs
- **Algorithm**: [[ALGO--table-merge]]
- **Data Entity**: [[entity--pos-table]], [[entity--order]]
- **Protocol**: [[PROTO--inbox-realtime]] (via Pusher for status sync)
- **Blueprint**: [docs/blueprints/FEAT-006_POS.yaml](file:///d:/zuri/docs/blueprints/FEAT-006_POS.yaml)
