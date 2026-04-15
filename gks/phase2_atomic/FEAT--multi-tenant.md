---
id: FEAT--multi-tenant
type: feature
module: core
status: stable
version: 1.0.1
owner: "@architect"
summary: "การแยกข้อมูลลูกค้าด้วย Shared DB + Row-Level isolation (tenantId)"
tags: [core, multi-tenant, architecture]
created_at: 2026-04-13
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
depends_on: []
touch_points: ["prisma/schema.prisma", "src/middleware.ts"]
---
# Feature: Multi-Tenant Foundation

## 1. Overview
การแปลงระบบ Zuri จาก Single-tenant สู่ Multi-tenant SaaS โดยใช้สถาปัตยกรรม Shared DB + Row-Level isolation (`tenantId`) เพื่อรองรับธุรกิจหลายรายบนระบบเดียวกัน ข้อมูลแยกกันแต่ใช้โครงสร้างเดียวกัน

## 2. Methodology
- **Shared DB + Row-Level tenantId**: ใช้ [[ADR-056]]
- **Isolated Tables**: ทุกตารางที่มีข้อมูลลูกค้า (CRM, Sales, POS) ต้องมี `tenant_id`
- **Subdomain Routing**: `{slug}.zuri.app` เพื่อระบุตัวตนของ Tenant

## 3. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Tenant Record | OWNER | CRUD | จัดการข้อมูลบริษัทตัวเอง |
| Tenant Settings | ADM | RU | แก้ไขคอนฟิกบริษัท |

## 4. Technical Specs
- **Blueprint**: [docs/blueprints/FEAT-001_MultiTenant.yaml](file:///d:/zuri/docs/blueprints/FEAT-001_MultiTenant.yaml)
- **Guardrail**: [[SAFETY--tenant-isolation]]
- **Entities**: [[entity--tenant]]

