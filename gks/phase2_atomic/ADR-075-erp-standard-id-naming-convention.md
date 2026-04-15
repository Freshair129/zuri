# Created At: 2026-04-12 19:00:00 +07:00 (v1.0.0)
# Previous version: N/A
# Last Updated: 2026-04-12 19:00:00 +07:00 (v1.0.0)

# ADR-075: ERP-Standard ID Naming Convention

## Status
APPROVED

## Context

Zuri's `Product` model currently has two fields with confusing naming:

| Field | Prisma | DB Column | Actual Purpose |
|-------|--------|-----------|---------------|
| `productId` | `String @unique` | `product_id` | Business key — course/product code (e.g. `TVS-JP-1FC-HC-20`) |
| `sku` | `String?` | `sku` | Barcode / scannable code for POS |

This naming violates **ERP universal standards** (SAP, Odoo, ERPNext) where:
- **SKU** = the human-readable business key (Stock Keeping Unit)
- **Barcode** = the scannable external code (EAN-13, UPC, etc.)

Additionally, FK fields in other models (e.g. `Enrollment.productId`, `CourseSchedule.productId`) reference `Product.id` (UUID), **not** `Product.productId` — so those are unaffected by this rename.

### Impact Assessment
- **Prisma schema**: `productId` appears 23 times — 1 as Product's business key, rest as FK to `Product.id` (UUID). Only 1 rename needed in Product model. The `sku` field also needs renaming.
- **Source code**: ~147 occurrences of `productId` across 28 files in `src/`. Most are FK references to `Product.id` and remain unchanged. Only references to the **business key** field need updating.
- **idGenerator.js**: `generateProductId()` → `generateSku()` rename.
- **Documentation**: `id_standards.yaml`, `full-schema.md`, FEAT specs already partially updated in previous doc audit.

## Decision

Align field naming with ERP universal 3-layer ID pattern:

| Layer | Purpose | Field Name | Example |
|-------|---------|-----------|---------|
| System PK | Internal, FK joins | `id` (UUID) | `clx9...` |
| Business Key | Human-readable, unique, on documents | `sku` | `TVS-JP-1FC-HC-20` |
| External Code | Scannable / third-party | `barcode` | `8859...` (EAN-13) |

### Changes Required

#### 1. Prisma Schema (`prisma/schema.prisma`)
```prisma
model Product {
  // BEFORE:
  productId  String   @unique @map("product_id")
  sku        String?

  // AFTER:
  sku        String   @unique @map("product_id")  // business key (was productId) — DB column unchanged
  barcode    String?  @map("sku")                  // scannable code (was sku) — DB column unchanged
}
```

> **Note:** `@map()` preserves existing DB column names → **zero-downtime migration**, no data loss.

#### 2. idGenerator.js
- `generateProductId(data)` → `generateSku(data)` (function rename, logic unchanged)

#### 3. Source Code (src/)
- Only files referencing `product.productId` (the business key) need updating to `product.sku`
- FK fields like `enrollment.productId` → **NO CHANGE** (these reference `Product.id` UUID via `@relation`)

#### 4. Documentation
- `id_standards.yaml`: Already renamed "Product" → "SKU" section in previous audit
- `full-schema.md`: Already updated `productId` → `sku` in ERD
- FEAT specs: Update any remaining `productId` references to `sku`

## ERP Standard Reference

| ERP System | Business Key | Barcode/External |
|-----------|-------------|-----------------|
| SAP | `MATNR` (Material Number) | `EAN11` |
| Odoo | `default_code` (Internal Reference) | `barcode` |
| ERPNext | `item_code` | `barcodes` (child table) |
| **Zuri (new)** | `sku` | `barcode` |

## Consequences

### Positive
- Aligns with universal ERP naming — any developer with ERP experience will understand immediately
- Eliminates confusion between "product ID" (sounds like PK) and actual PK (`id`)
- `@map()` strategy = zero DB migration, zero downtime
- Future-proof for multi-tenant SKU patterns per ADR-074

### Negative
- One-time code refactor across ~28 files
- Team must learn: `sku` = business key, not barcode

### Risks
- **Mitigated**: FK fields (`Enrollment.productId` etc.) reference `Product.id` (UUID), not the business key — confirmed no cascade impact
- **Mitigated**: `@map("product_id")` keeps DB column name → existing data untouched

## Related
- ADR-074: Tenant Codename & ID Namespacing
- FEAT05-CRM: Customer ID compact format
- FEAT06-POS: Product/SKU display in POS
