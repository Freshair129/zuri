---
id: FEAT--inbox-pipeline
type: feature
module: inbox
status: stable
version: 1.0.0
owner: "@customer-success"
summary: "ระบบสถานะการขายที่ปรับแต่งได้ (Custom Conversation Pipeline)"
tags: [inbox, pipeline, crm]
depends_on: ["[[FEAT--inbox]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Feature: Conversation Pipeline

## 1. Overview
ระบบ Pipeline ช่วยให้ทีมขายสามารถจัดการ "สถานะ" ของการพูดคุยกับลูกค้าได้ตามกระบวนการทำงานของแต่ละธุรกิจ (เช่น สอบถาม -> ส่งโบรชัวร์ -> ปิดการขาย)

## 2. Capabilities
- **Custom Stages**: แต่ละ Tenant สามารถกำหนดชื่อ สี และลำดับของ Stage ได้เอง
- **Filter Bar**: แสดง Pipeline เป็น Tabs แถบด้านบนของ Inbox เพื่อการกรองที่รวดเร็ว
- **Auto-Sync**: เมื่อเปลี่ยน Stage ของ Conversation ระบบสามารถตั้งค่าให้ Auto-update [[entity--customer]] Lifecycle ได้ (เช่น Stage 'ลงทะเบียน' -> Customer Status = `ENROLLED`)

## 3. Data Model
- ข้อมูลถูกเก็บในตาราง [[entity--pipeline-stage]]
- ข้อมูลถูกเชื่อมโยงกับ [[entity--conversation]] ผ่านฟิลด์ `pipeline_stage_id`
