---
id: FEAT--billing
type: feature
module: billing
status: stable
version: 1.0.0
owner: "@accounting"
summary: "ระบบออกใบแจ้งหนี้ ตรวจสอบสลิปอัตโนมัติ และการเชื่อมต่อเครื่องพิมพ์ใบเสร็จ"
tags: [billing, ocr, invoice, printer]
depends_on: ["[[FEAT--multi-tenant]]", "[[FEAT--pos]]"]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Feature: Billing & Payment

## 1. Overview
Billing เป็นระบบที่รับช่วงต่อจาก POS เพื่อแปลงรายการในตะกร้าสินค้าให้เป็นใบแจ้งหนี้ (Invoice) ที่สามารถส่งเข้าแชท (FB/LINE) ให้ลูกค้าได้ทันที และรองรับการยืนยันยอดเงินอัตโนมัติผ่านการสแกนสลิป (OCR)

## 2. User Interfaces
1. **Billing Panel (Inbox Right Tab)**: แสดง Invoice, ปุ่มส่งแชท, และสถานะการรับเงิน
2. **Bill Designer**: หน้าจอตั้งค่าหัวบิลและเลือก Layout (A4, 80mm, 58mm)
3. **Hardware Settings**: หน้าจัดการการเชื่อมต่อเครื่องพิมพ์ Thermal และ EDC

## 3. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Invoices | SLS/AGT | RU | ออกบิลและยืนยันการรับเงิน |
| Invoices | MGR/ACC | CRUD | ดูประวัติทั้งหมดและ Void บิล |
| Slips (OCR) | System | R | ระบบอ่านและ Validate อัตโนมัติ |

## 4. Technical Specs
- **Model**: [[entity--invoice]], [[entity--transaction]]
- **Algorithm**: [[ALGO--slip-ocr]], [[ALGO--qr-generation]]
- **Workflow**: [[PROTO--billing-flow]], [[PROTO--hardware-connection]]
- **Blueprint**: [docs/blueprints/FEAT-003_Billing.yaml](file:///d:/zuri/docs/blueprints/FEAT-003_Billing.yaml)
