---
id: module--core
type: module
module: core
status: stable
version: 1.1.0
owner: "@architect"
summary: "ระบบรากฐาน (Shared DB, Multi-Tenant Isolation, Global Config)"
tags: [infrastructure, core]
created_at: 2026-04-13
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Core (Foundation)

## 1. Responsibility
ทำหน้าที่เป็นระบบโครงสร้างหลัก (Infrastructure) ของ Zuri ทั้งหมด โดยเน้นที่การแยกข้อมูลลูกค้าออกจากกัน (Multi-Tenant Isolation) และการจัดการระบบสากลที่ทุกโมดูลต้องใช้ร่วมกัน

## 2. Boundaries
- **Upstream**: Cloud Environment, System Config
- **Downstream**: All Feature Modules (CRM, POS, Billing, etc.)

## 3. Key Decisions
- [[ADR-056-shared-db-multi-tenant]]

## 4. Feature Index
- [[FEAT--multi-tenant]]

## 5. API Contracts
- [[GET--core-system-status]]

## 6. Security & Permissions (C | R | U | D)
| Resource/Page | Role | CRUDP | Note |
|---|---|---|---|
| Tenants | Owner/Admin | CRUD | Full management |
| Global Config | Admin | CRUD | System-wide |

