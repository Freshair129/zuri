---
id: FEAT--inbox
type: feature
module: inbox
status: stable
version: 1.1.0
owner: "@customer-success"
summary: "ระบบกล่องข้อความรวมศูนย์ (Omni-Channel Unified Inbox)"
tags: [messaging, inbox, facebook, line]
depends_on: ["[[FEAT--multi-tenant]]", "[[FEAT--customer-profile]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: Unified Inbox

## 1. Overview
Unified Inbox ทำหน้าที่รวบรวมข้อความจาก Facebook Messenger และ LINE OA มาแสดงผลในหน้าจอเดียวเพื่อให้ทีมงานสามารถตอบกลับและจัดการลูกค้าได้โดยไม่ต้องสลับแอปพลิเคชัน

## 2. Panels Structure
- **Left Panel (Conversation List)**: แสดงรายชื่อลูกค้า กรองตามสถานะ และแสดง Badge สัญลักษณ์ช่องทาง
- **Center Panel (Chat View)**: แสดงรายละเอียดแชท รับ-ส่ง ข้อความ รูปภาพ และไฟล์แนบ
- **Right Panel (Quick Sale & CRM Core)**: แสดงข้อมูลลูกค้าเบื้องต้น และปุ่มเปิด ChatPOS สำหรับออกบิลทันที

## 3. Real-time Capabilities
- ใช้ระบบ **Pusher** สำหรับการอัปเดตข้อความใหม่ในหน้าจอทันทีโดยไม่ต้อง Refresh
- รองรับระบบ **Queue Processing (QStash)** เพื่อประกันว่าไม่มีข้อความตกหล่น (Message Durability)

## 4. Technical Integration
- **Algorithm**: [[ALGO--webhook-signature]], [[ALGO--identity-resolution]]
- **Protocol**: [[PROTO--message-routing]], [[PROTO--inbox-realtime]]
- **Data Entity**: [[entity--conversation]], [[entity--message]]
- **Blueprint**: [docs/blueprints/FEAT-004_Inbox.yaml](file:///d:/zuri/docs/blueprints/FEAT-004_Inbox.yaml)
