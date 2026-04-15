---
id: PROTO--message-routing
type: protocol
module: inbox
status: active
summary: "ขั้นตอนการรับประมวลผลข้อความ Webhook ไปจนถึงการจัดเก็บในฐานข้อมูล"
tags: [webhook, flow, messaging]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Webhook Message Routing

## 1. Sequence (R-V-I-U)
1. **Receive**: รับคำขอจาก `/api/webhooks/[platform]` (ต้องตอบ 200 OK ทันทีภายใน 200ms)
2. **Verify**: ตรวจสอบ Signature ผ่าน [[ALGO--webhook-signature]]
3. **Identify**: ค้นหาลูกค้าผ่าน [[ALGO--identity-resolution]] (ใช้ Platform ID)
4. **Upsert**:
    - ค้นหา `Conversation` หากไม่มีให้สร้างใหม่
    - บันทึก `Message` ลงในฐานข้อมูล
5. **Broadcast**: ส่ง Pusher Event เพื่อให้หน้าจอ Inbox อัปเดตแบบ Real-time

## 2. Queueing (Async)
เนื่องจาก NFR กำหนดให้ตอบ Facebook ภายใน 200ms ระบบต้องใช้ **QStash** หรือ **BullMQ** เพื่อทำการประมวลผลข้อความแบบ Asynchronous เสมอ (Fire and Forget)
