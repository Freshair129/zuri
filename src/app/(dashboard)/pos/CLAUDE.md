# POS Module — Agent Context

**Specs:** `docs/product/specs/FEAT06-POS.md` · `docs/product/specs/FEAT03-BILLING.md`
**Roles:** SALES, MANAGER, OWNER

## Models
- `Order` — header: type, status, tableId, customerId, tenantId
- `OrderItem` — line items ต่อ order
- `Transaction` — การชำระเงิน linked to Order
- `Invoice` — ใบกำกับภาษี/ใบเสร็จ

## Order Types (มาจาก system_config.yaml)
- `DINE_IN` — เลือกโต๊ะจาก floor plan
- `TAKE_AWAY` — ไม่ต้องเลือกโต๊ะ
- `ONLINE` — auto-push เข้า POS queue จาก QR/web

## Payment Methods
`CASH | TRANSFER | CARD | QR_CODE`
- Slip verification: Gemini Vision → `/api/payments/verify-slip`
- Confidence threshold: `0.80` (จาก system_config.yaml)

## VAT Rules
- Rate: `7%` จาก `system_config.yaml → vat.rate`
- Default mode: `included` — ห้าม hardcode ค่า VAT ในโค้ด
- ใบกำกับภาษีต้องมี: เลขผู้เสียภาษี, ที่อยู่กิจการ, running number

## V Points
- คำนวณจาก `loyalty.vp_rate` ใน system_config.yaml
- 300 VP ต่อการใช้จ่าย 150 บาท
- Idempotency: ห้ามให้ point ซ้ำ — check `Transaction.id` ก่อนเสมอ (ADR-059)

## Billing Flow
```
Cart confirmed → Invoice สร้างอัตโนมัติ → ส่งเข้า Chat (Inbox)
→ ลูกค้าชำระ → verify slip → บันทึก Transaction → ล้าง cart
```

## Repo Functions
```js
import { orderRepo } from '@/lib/repositories/orderRepo'
import { transactionRepo } from '@/lib/repositories/transactionRepo'
// orderRepo.create(tenantId, orderData)
// orderRepo.addItem(tenantId, orderId, item)
// orderRepo.close(tenantId, orderId)
// transactionRepo.record(tenantId, txData) // ใช้ $transaction กับ V Points
```

## Gotchas
- Floor plan state เก็บใน DB (ADR-058) — ห้ามเก็บใน localStorage หรือ state เท่านั้น
- Quick Sale ใน Inbox Right Panel ใช้ component เดียวกับ POS — ห้าม duplicate logic
- Order.status transitions: `PENDING → CLOSED | CANCELLED | REFUNDED` (จาก system_config.yaml)
- ใบกำกับภาษีต้องผ่าน `invoiceRepo` — ห้ามสร้าง PDF ตรงจาก component
