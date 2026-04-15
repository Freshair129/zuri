---
id: PROTO--automation-cron
type: protocol
module: crm
status: active
summary: "มาตรฐานการทำงานของระบบประมวลผลอัตโนมัติ (Automation Engine Execution)"
tags: [automation, cron, worker, background-job]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Automation Engine Execution Flow

## 1. Schedule & Frequency
- **Check Interval**: ทุก 1 ชั่วโมง (ผ่าน QStash Cron)
- **Real-time Trigger**: ทำงานทันทีเมื่อมี Webhook Message หรือ State Change ขาเข้า

## 2. Execution Pipeline (E-C-E)
1. **Evaluate**: ระบบทำการ Scan ลูกค้าทั้งหมดที่เข้าเกณฑ์ของ Active Workflows ในแต่ละ Tenant
2. **Check Constraints**:
    - ตรวจสอบ Cooldown (ห้ามทำงานซ้ำภายใน 24 ชม. สำหรับ Workflow ประเภทเดิม)
    - ตรวจสอบความถูกต้องของสิทธิ์ (เช่น LINE Messaging API Token)
3. **Execute**: ทำการส่ง Action ไปยัง Worker โดยผ่านระบบ Queue (Fire and Forget)

## 3. Error Handling
- หากส่งสารไม่สำเร็จ (เช่น Token หมดอายุ) -> บันทึกลง `automation_logs` และแจ้งเตือน Admin
- ใช้ระบบ **Retry Strategy** (Backoff exponential) สูงสุด 5 ครั้ง
