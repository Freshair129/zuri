---
id: MOD--analytics
type: module
module: analytics
status: stable
version: 1.0.0
owner: "@executive-team"
summary: "ระบบวิเคราะห์ข้อมูลธุรกิจและการรายงานผลอัจฉริยะ (Business Intelligence & Executive Reporting)"
tags: [analytics, reporting, dashboard, daily-brief]
created_at: 2026-04-14
updated_at: 2026-04-14
previous_update: null
created_by: "@architect"
updated_by: "@architect"
---
# Module: Analytics (BI & Reporting)

## 1. Responsibility
รวบรวมข้อมูลจากทุกโมดูล (Sales, CRM, POS, Inbox) เพื่อนำมาสรุปผลเป็นรายงานภาพรวมธุรกิจ (Dashboard) และรายงานสรุปรายวันผ่านช่องทาง LINE (Daily Sales Brief)

## 2. Boundaries
- **Upstream**: [[module--pos]], [[module--crm]], [[module--inbox]]
- **Downstream**: Executive Decision Making, Marketing Strategy

## 3. Key Decisions
- [[ADR-039-revenue-channel-split]]

## 4. Feature Index
- [[FEAT--daily-brief]] (Executive LINE Alert)

## 5. Security & Permissions (C | R | U | D)
| Resource | Role | CRUDP | Note |
|---|---|---|---|
| Daily Briefs | OWNER/MGR | R | อ่านรายงานสรุปธุรกิจ |
| Dashboard | OWNER/MGR/MKT | R | ดูข้อมูลสถิติแยกตามสิทธิ์ |
| Export Data | ADM/OWNER | R | ส่งออกข้อมูลดิบเพื่อวิเคราะห์ |
