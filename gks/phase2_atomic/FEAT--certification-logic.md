---
id: FEAT--certification-logic
type: feature
module: enrollment
status: stable
version: 1.1.0
owner: "@training-ops"
summary: "ระบบการคำนวณชั่วโมงเรียนและออกใบประกาศนียบัตรอัตโนมัติ (Tiered Certification Logic)"
tags: [certificate, education, logic]
depends_on: ["[[FEAT--enrollment-lifecycle]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: Automated Certification Logic

## 1. Overview
ระบบจะทำการติดตามชั่วโมงเรียนสะสมของนักเรียนรายบุคคล และทำการออกใบประกาศนียบัตร (Certification) ให้โดยอัตโมมัติเมื่อสะสมชั่วโมงถึงเกณฑ์ที่ทาง Zuri กำหนด

## 2. Certification Tiers
ใบประกาศถูกแบ่งออกเป็น 3 ระดับหลัก:
- **Standard Tier (30H)**: เมื่อเรียนครบ 30 ชั่วโมง (Basic Course Completion)
- **Professional Tier (111H)**: เมื่อเรียนครบ 111 ชั่วโมง (Advanced Skills Training)
- **Master Tier (201H)**: เมื่อเรียนครบ 201 ชั่วโมง (Mastery Level)

## 3. Automation Flow
1. **Attendance Hit**: เมื่อมีการเช็คอิน [[PROTO--attendance-checkin]] ชั่วโมงเรียนจะถูกบวกเข้ากับ `Enrollment.hoursCompleted`
2. **Scheduled Check**: ระบบ QStash จะรันทุกคืนเวลา 23:00 เพื่อ Scan หา Enrollment ที่ถึงเกณฑ์
3. **PDF Generation**: หากถึงเกณฑ์ ระบบจะสร้าง [[entity--certificate]] และสร้างไฟล์ PDF ทันที
4. **Notification**: แจ้งเตือนลูกค้าผ่าน LINE OA พร้อมปุ่มดาวน์โหลดไฟล์

## 4. Technical Specs
- **Blueprint**: [docs/blueprints/FEAT-007_Enrollment.yaml](file:///d:/zuri/docs/blueprints/FEAT-007_Enrollment.yaml)
- **Logic**: [[LOGIC--enrollment-verify]]
- **ID Standard**: 
  - **Format**: `CERT-[YYYYMMDD]-[SERIAL]`
  - **Uniqueness**: Serial 3 หลักรันใหม่ทุกวันภายใต้ `tenant_id`
