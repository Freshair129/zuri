---
id: FEAT--crm-core
type: feature
module: crm
status: stable
version: 1.0.0
owner: "@team-crm"
summary: "ระบบบริหารจัดการชื่อลูกค้า ขั้นตอนการขาย (Lifecycle Funnel) และการคัดกรองอัจฉริยะ"
tags: [crm, funnel, lifecycle, segmentation]
depends_on: ["[[FEAT--multi-tenant]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: CRM Core & Lead Funnel

## 1. Overview
CRM Core เป็นระบบจัดการฐานข้อมูลลูกค้า (Customer) ที่รวมศูนย์มาจากทุกช่องทาง โดยเน้นการจัดการ "สถานะอายุลูกค้า" (Lifecycle Stage) เพื่อให้ทีมขายสามารถติดตาม Lead ได้อย่างเป็นขั้นตอน

## 2. Capability Breakdown
### 2.1 Unified Customer List
- ระบบแสดงรายชื่อลูกค้าพร้อมตัวกรอง (Search & Filter) ตามชื่อ, เบอร์โทร, Platform (FB/LINE)
- รองรับการทำ **Smart Segmentation** (เช่น "ลูกค้า VIP ที่ไม่ได้ทักมา 7 วัน")

### 2.2 Lifecycle Funnel (The Stages)
สถานะของลูกค้าในระบบ Zuri จะถูกแบ่งเป็น 5 ระดับมาตรฐาน:
- **NEW**: ทักมาครั้งแรก / นำเข้าข้อมูล
- **CONTACTED**: ได้พูดคุยเบื้องต้นแล้ว
- **INTERESTED**: แสดงความสนใจสินค้า/บริการ
- **ENROLLED**: ลงทะเบียน (จอง) รอชำระเงิน
- **PAID**: ลูกค้าที่ชำระเงินเสร็จสิ้น (กลายเป็น Student/Buyer)

### 2.3 Import / Export
- รองรับการนำเข้าข้อมูลจาก CSV (Bulk Import) พร้อมระบบตรวจสอบเบอร์โทรซ้ำ (Duplicate Detection)

## 3. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Customer List | SLS/AGT | RU | ดูและแก้ไขลูกค้าที่ตัวเองดูแล |
| Customer List | MGR/ADM | CRUD | จัดการลูกค้าทั้งหมดและ Export ข้อมูล |

## 4. Technical Specs
- **Model**: [[entity--customer]], [[entity--customer-activity]]
- **Algorithm**: [[ALGO--identity-resolution]]
- **Blueprint**: [docs/blueprints/FEAT-005_CRM.yaml](file:///d:/zuri/docs/blueprints/FEAT-005_CRM.yaml)
