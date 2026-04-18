---
id: MOD--kitchen
type: module
module: kitchen
status: partial
version: 1.1.0
owner: "@kitchen-ops"
summary: "ระบบจัดการสูตรอาหาร วัตถุดิบ และคลังสินค้าหมุนเวียน (Inventory & Recipe Management)"
tags: [kitchen, inventory, recipe, fefo, stock]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Kitchen (Inventory Operations)

## 1. Responsibility
ดูแลจัดการสูตรอาหาร (Recipes) ที่เชื่อมกับสินค้า และบริหารจัดการคลังวัตถุดิบ (Ingredients) โดยใช้ระบบตัดสต็อกตามวันหมดอายุ (FEFO Logic) เพื่อลดของเสีย (Wastage)

## 2. Boundaries
- **Upstream**: [[module--enrollment]] (Demand from classes), [[module--pos]] (Demand from orders)
- **Downstream**: Procurement & Logistics

## 3. Key Decisions
- [[ADR-062-fefo-stock-strategy]]

## 4. Feature Index
- [[ALGO--fefo-stock-deduction]] (Core Logic)

## 5. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Ingredients | ADM/STF | CRUD | จัดการรายการและจำนวนสต็อก |
| Lots/Expiry | STF | RU | ตรวจสอบวันหมดอายุและรับเข้าล็อตใหม่ |
| Recipes | PD/ADM | CRUD | จัดการสัดส่วนวัตถุดิบต่อเมนู |
