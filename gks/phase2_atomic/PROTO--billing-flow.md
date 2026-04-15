---
id: PROTO--billing-flow
type: protocol
module: billing
status: active
summary: "ขั้นตอนการทำงานจากตะกร้าสินค้าไปจนถึงการได้รับเงิน (POS to PAID)"
tags: [workflow, process, billing]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Billing & Payment Flow

## 1. Flow Sequence (P-A-Y)
1. **Invoice Generation**: เมื่อ POS กดยืนยันออเดอร์ -> ระบบสร้าง `Invoice` อัตโนมัติ
2. **Chat Delivery**: พนักงานกดส่ง Invoice เข้า FB/LINE
3. **Payment Step**:
    - ลูกค้าโอนเงิน + ส่งสลิป -> เข้าสู่ [[ALGO--slip-ocr]]
    - หรือ ลูกค้าจ่ายหน้าเคาน์เตอร์ (Cash/EDC) -> พนักงานกด "ยืนยันชำระ"
4. **Completion**: ระบบสร้าง `Transaction` -> Clear Cart -> บันทึกประวัติเข้า [[entity--customer]]

## 2. Exceptions (Rollback)
- หามีการ Void บิล -> ระบบต้องคืนสต็อก (Restock) และยกเลิก Transaction ที่เกี่ยวข้อง
- หาก OCR ผิดพลาด -> พนักงานต้องกด Override ด้วยสิทธิ์ MGR ขึ้นไป
