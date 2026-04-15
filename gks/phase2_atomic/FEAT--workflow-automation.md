---
id: FEAT--workflow-automation
type: feature
module: crm
status: stable
version: 1.0.0
owner: "@team-crm"
summary: "ระบบทำงานอัตโนมัติตามพฤติกรรมลูกค้า (Trigger-Condition-Action Engine)"
tags: [automation, workflow, follow-up]
depends_on: ["[[FEAT--crm-core]]", "[[FEAT--inbox]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: Workflow Automation

## 1. Overview
Workflow Automation ช่วยให้ทีมขายลดภาระในการติดตามลูกค้าแบบแมนนวล โดยระบบจะคอยตรวจจับเหตุการณ์ (Triggers) และดำเนินการ (Actions) ให้อัตโนมัติตามเงื่อนไขที่กำหนด

## 2. Core Components (T-C-A)
### 2.1 Triggers (เหตุการณ์กระตุ้น)
- **Time-based**: ไม่มีการติดต่อเกิน 3 วัน, ลงทะเบียนแต่ไม่ชำระเงินเกิน 48 ชม.
- **Event-based**: เปลี่ยนสถานะ Lifecycle Stage, มีการติด Tag ใหม่
- **AI-driven**: AI ตรวจพบความสนใจซื้อ (READY_TO_BUY)

### 2.2 Conditions (เงื่อนไข)
- ตรวจสอบสถานะปัจจุบันของลูกค้า (ต้องเป็น Lead ร้อนเท่านั้น)
- ตรวจสอบช่องทางการติดต่อ (มี LINEuserId หรือไม่)

### 2.3 Actions (การดำเนินการ)
- **Notify**: แจ้งเตือนพนักงานที่ดูแล
- **Message**: ส่งข้อความ Template ผ่าน LINE/Facebook อัตโนมัติ
- **Tag**: เพิ่ม Tag "Follow-up" ให้อัตโนมัติ

## 3. Operations & Safety
- **Cooldown**: 1 Workflow จะทำงานต่อลูกค้า 1 คน ไม่เกินหนึ่งครั้งในรอบ 24 ชม.
- **Audit**: ทุกการทำงานของ Automation จะถูกบันทึกลงใน Timeline ของลูกค้า

## 4. Technical Specs
- **Protocol**: [[PROTO--automation-cron]]
- **Blueprint**: [docs/blueprints/FEAT-014_WorkflowAutomation.yaml](file:///d:/zuri/docs/blueprints/FEAT-014_WorkflowAutomation.yaml)
