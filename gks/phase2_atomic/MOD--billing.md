---
id: MOD--billing
type: module
module: billing
status: partial
version: 1.0.0
owner: "@accounting"
summary: "ระบบแจ้งหนี้ การรับชำระเงิน และการตรวจสอบสลิปอัตโนมัติ (Invoice & Payment Hub)"
tags: [billing, finance, payment]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Billing (Invoice & Payment)

## 1. Responsibility
ทำหน้าที่เป็นศูนย์กลางการเงินของระบบ (Revenue Hub) โดยรับข้อมูลจาก POS มาสร้างเป็นเอกสารแจ้งหนี้ (Invoice) จัดการการรับชำระผ่าน QR PromptPay และตรวจสอบสลิปด้วย OCR เพื่อบันทึกพรมแดนรายได้เข้าสู่ระบบ

## 2. Boundaries
- **Upstream**: [[module--pos]], [[module--core]] (tenantId)
- **Downstream**: [[module--crm]] (purchase history), Marketing Attribution

## 3. Key Decisions
- [[ADR-030-revenue-channel-split]]
- [[ADR-039-chat-first-attribution]]

## 4. Feature Index
- [[FEAT--billing]] (Invoicing & OCR)
- [[FEAT--accounting-integration]]

## 5. API Contracts
- [[POST--billing-invoice-create]]
- [[POST--payment-verify-slip]]

## 6. Security & Permissions (C | R | U | D)
| Resource/Page | Role | CRUDP | Note |
|---|---|---|---|
| Invoices | SLS/AGT | RU | Issue & confirm |
| Invoices | ACC/ADM | CRUD | Full management & Void |
| Payment Rules | MGR | CU | Config threshold |
