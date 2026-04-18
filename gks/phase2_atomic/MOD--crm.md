---
id: MOD--crm
type: module
module: crm
status: stable
version: 2.0.0
owner: "@team-crm"
summary: "ระบบจัดการข้อมูลลูกค้า (Single Customer View, Identity Resolution, CRM Intelligence)"
tags: [crm, customer, profile]
created_at: 2026-04-13
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: CRM (Customer Relationship Management)

## 1. Responsibility
ดูแลข้อมูลลูกค้าทั้งหมด (Primary Domain) ตั้งแต่การระบุตัวตน (Identity Resolution) ไปจนถึงการวิเคราะห์พฤติกรรม เพื่อให้ทุกช่องทาง (POS, Inbox, Enrollment) มองเห็นลูกค้าเป็นคนเดียวกัน

## 2. Boundaries
- **Upstream**: [[module--core]], Messaging Platforms (FB, LINE), Webhooks
- **Downstream**: [[module--pos]], [[module--billing]], [[module--marketing]], Marketing Intelligence

## 3. Key Decisions
- [[ADR-025-identity-resolution]]
- [[ADR-039-revenue-channel-split]]

## 4. Feature Index
- [[FEAT--customer-profile]] (360 View)
- [[FEAT--crm-core]] (List, Stages, Funnel)
- [[FEAT--workflow-automation]] (Trigger-Condition-Action)
- [[FEAT--crm-ai]] (referencing legacy FEAT14)

## 5. API Contracts
- [[GET--crm-customer-detail]]
- [[PATCH--crm-customer-update]]
- [[POST--crm-import-csv]]

## 6. Security & Permissions (C | R | U | D)
| Resource/Page | Role | CRUDP | Note |
|---|---|---|---|
| Customer Data | SLS/AGT | RU | Ownership based |
| Customer Data | MGR/ADM | CRUD | Full Access |
| PDPA Opt-out | Customer | U | Self-service |

