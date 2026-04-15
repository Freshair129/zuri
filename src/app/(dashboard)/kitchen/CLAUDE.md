# Kitchen Operations Module — Agent Context

**Spec:** `docs/product/specs/FEAT08-KITCHEN.md`
**Roles:** KITCHEN (full), MANAGER (full), OWNER (read), STAFF (read)

## Models
- `Ingredient` — วัตถุดิบ catalog: unit, category, allergens, yieldPercent
- `IngredientLot` — lot ที่รับเข้า: expiryDate, supplier, remainingQty, status
- `Recipe` — สูตร linked to Course: ingredients[], steps[], equipments[]
- `StockMovement` — บันทึกการเคลื่อนไหวสต๊อก
- `PurchaseRequest` — auto-generated เมื่อสต๊อกต่ำกว่า threshold
- `PurchaseOrder` — PO ที่ KITCHEN/MANAGER approve แล้ว
- `Supplier` — directory ของ supplier

## FEFO Rule (First Expired First Out — CRITICAL)
- ทุกการตัดสต๊อกต้องใช้ lot ที่ `expiryDate` เก่าที่สุดก่อน
- ห้าม issue จาก lot ที่ `status = EXPIRED | RECALLED`
- Logic นี้อยู่ใน `inventoryRepo.issueStock()` — ห้าม implement เอง

## Stock Movement Types (จาก system_config.yaml)
`RECEIVE | ISSUE | TRANSFER | ADJUSTMENT | RETURN`

## PO Lifecycle
```
DRAFT → REQUEST_REVIEW → APPROVED | REJECTED
→ ORDERING → ORDERED → RECEIVING → RECEIVED | PARTIAL
→ CLOSED | ISSUE
```

## Auto Purchase Request Flow
```
ClassSession เริ่ม → deduct stock ตาม Recipe
→ remainingQty < threshold → auto PurchaseRequest
→ notify KITCHEN role → KITCHEN/MANAGER สร้าง PO
```

## ABC Analysis Thresholds (จาก system_config.yaml)
- Grade A: top 80% of value
- Grade B: next 15%
- Grade C: remaining

## Repo Functions
```js
import { inventoryRepo } from '@/lib/repositories/inventoryRepo'
import { procurementRepo } from '@/lib/repositories/procurementRepo'
// inventoryRepo.issueStock(tenantId, ingredientId, qty, reason) // FEFO auto-select lot
// inventoryRepo.receiveStock(tenantId, lotData)
// inventoryRepo.getStockLevel(tenantId, ingredientId)
// procurementRepo.createPR(tenantId, items[]) // auto from system
// procurementRepo.approvePO(tenantId, poId, approverId)
// procurementRepo.recordGRN(tenantId, poId, receivedItems[])
```

## Gotchas
- `defaultYieldPercent = 100` — ต้องระบุ yield จริงเมื่อรับของ (ผักหั่นแล้วเหลือ 80%)
- Prep Sheet generate ล่วงหน้า 1 วัน ผ่าน QStash cron 18:00 ICT
- Allergen list ต้องแสดงใน Recipe detail เสมอ — legal requirement
- Lot status `RECALLED` ต้อง notify ทุก role ที่ใช้ lot นั้น ผ่าน in-app notification
