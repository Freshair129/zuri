# Repositories Layer — Agent Context

**ADR:** `docs/decisions/adrs/ADR-045` (superseded) · repository pattern mandatory for all DB ops
**Rule:** ALL DB operations ต้องผ่าน layer นี้ — ห้าม `getPrisma()` ตรงจาก API route หรือ component

## Pattern บังคับ

```js
// ✅ ถูก — ผ่าน repo
import { customerRepo } from '@/lib/repositories/customerRepo'
const customer = await customerRepo.getById(tenantId, id)

// ❌ ผิด — ตรงจาก API route
import { getPrisma } from '@/lib/db'
const prisma = getPrisma()
const customer = await prisma.customer.findFirst({ where: { id } })
```

## Mandatory: tenantId เป็น param แรกเสมอ
```js
// ทุก repo function signature ต้องเป็น:
async function getById(tenantId, id, ...rest) { ... }
async function list(tenantId, filters) { ... }
async function create(tenantId, data) { ... }
```

## Multi-tenant Isolation (ADR-056)
- ทุก query ต้องมี `where: { tenantId }` เสมอ
- ใช้ Prisma middleware ใน `src/lib/db.ts` เป็น safety net แต่ยัง explicit ใน repo ด้วย

## Transaction Pattern (NFR5)
- Identity upsert, merge customer, V Points + Transaction: ใช้ `prisma.$transaction`
```js
const prisma = getPrisma()
await prisma.$transaction(async (tx) => {
  await tx.customer.update(...)
  await tx.loyaltyPoint.create(...)
})
```

## Error Handling
```js
// ✅ ถูก
try {
  return await prisma.customer.findFirst(...)
} catch (error) {
  console.error('[CustomerRepo]', error)
  throw error
}

// ❌ ผิด — catch silently
try { ... } catch (e) { return null }
```

## Repository Files
```
src/lib/repositories/
├── customerRepo.js       — Customer, CustomerIdentity, CustomerProfile
├── conversationRepo.js   — Conversation, Message
├── orderRepo.js          — Order, OrderItem
├── transactionRepo.js    — Transaction, Invoice
├── enrollmentRepo.js     — Enrollment, EnrollmentItem
├── courseRepo.js         — Course, Package, ClassSession
├── scheduleRepo.js       — ClassSession, Attendance
├── inventoryRepo.js      — Ingredient, IngredientLot, StockMovement (FEFO)
├── procurementRepo.js    — PurchaseRequest, PurchaseOrder, Supplier
├── marketingRepo.js      — Campaign, AdSet, Ad, AdDailyMetric
├── taskRepo.js           — Task
├── employeeRepo.js       — Employee, User
└── tenantRepo.js         — Tenant, TenantConfig
```

## Gotchas
- ห้ามเขียน raw SQL ยกเว้นมี ADR approve แล้ว
- `getPrisma()` return singleton — ห้าม instantiate Prisma เอง
- Soft delete เท่านั้น: ใช้ `status = INACTIVE | CANCELLED` ไม่ใช่ `delete()`
- Cache invalidation: หลัง write ให้ invalidate Redis key ที่ relate ด้วยเสมอ
