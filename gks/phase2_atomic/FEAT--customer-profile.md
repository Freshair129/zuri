---
id: FEAT--customer-profile
type: feature
module: crm
status: stable
version: 2.0.0
owner: "@team-crm"
summary: "Single Customer View (Customer 360) เชื่อมข้อมูลจากทุกช่องทางเข้าด้วยกัน"
tags: [crm, profile, 360-view]
created_at: 2026-04-13
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
depends_on: ["[[FEAT--multi-tenant]]"]
touch_points: ["src/app/crm/[id]/page.tsx", "src/repositories/customer.repo.ts"]
---
# Feature: Customer 360 & Profile

## 1. Overview
Customer Profile คือศูนย์กลางข้อมูลของลูกค้า (Single Customer View) ที่เชื่อมต่อข้อมูลจากทุก Touchpoint (Inbox, POS, Enrollment) เพื่อให้ทีมงานสามารถเห็นภาพรวมของลูกค้าได้ในหน้าเดียว

## 2. User Interfaces
1. **Mini-Profile (Inbox Panel)**: แสดงข้อมูลเบื้องต้น (Ads, Lifecycle, CTAs) ในหน้า `/inbox`
2. **Full Profile Dashboard (CRM Page)**: ข้อมูล 360 องศาเชิงลึก (Timeline, Orders, AI Analysis) ในหน้า `/crm/[id]`

## 3. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Own Customer | SLS/AGT | RU | ข้อมูลลูกค้าที่ดูแล |
| All Customers | MGR/ADM | CRUD | จัดการได้ทุกคน |
| Customer Export| MGR/ADM | R | จำกัดสิทธิ์การส่งออก |

## 4. Technical Specs
- **Blueprint**: [docs/blueprints/FEAT-002_CustomerProfile.yaml](file:///d:/zuri/docs/blueprints/FEAT-002_CustomerProfile.yaml)
- **Model**: [[entity--customer]]
- **Algorithm**: [[ALGO--identity-resolution]]
- **Workflow**: [[PROTO--lifecycle-management]]
- **Data Flow**: [[flow--customer-data-fetch]]

