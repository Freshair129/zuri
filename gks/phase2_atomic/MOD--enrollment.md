---
id: module--enrollment
type: module
module: enrollment
status: active
version: 1.1.0
owner: "@training-ops"
summary: "ระบบบริหารจัดการการเรียน เช็คชื่อเข้าเรียน และการออกใบประกาศนียบัตร (Learning & Certification Hub)"
tags: [enrollment, attendance, certificate, training]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Enrollment (Learning & Certification)

## 1. Responsibility
ทำหน้าที่ดูแลวงจรชีวิตการเรียน (Lifecycle of Learning) ของลูกค้า ตั้งแต่การจองคอร์ส, การเช็คอินเข้าชั้นเรียน (Attendance) ไปจนถึงการคำนวณชั่วโมงเรียนสะสมเพื่อออกใบประกาศนียบัตร (Automated Certification)

## 2. Boundaries
- **Upstream**: [[module--crm]] (Customer Identity), [[module--pos]] (Sale of Courses)
- **Downstream**: [[module--kitchen]] (Ingredient Demand forecasting)

## 3. Key Decisions
- [[ADR-041-certificate-id-standards]]

## 4. Feature Index
- [[FEAT--certification-logic]] (Hours-based Tiers)
- [[PROTO--attendance-checkin]] (QR Standard)

## 5. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Enrollments | SLS/AGT | RU | ดูประวัติการเรียนของลูกค้า |
| Attendance | STF/ADM | CU | เช็คชื่อเข้าเรียน |
| Certificates | ADM | RU | ตรวจสอบและดาวน์โหลดใบประกาศ |
