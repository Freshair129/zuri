# Marketing & Ads Analytics Module — Agent Context

**Specs:** `docs/product/specs/FEAT09-MARKETING.md` · `docs/product/specs/FEAT10-DSB.md`
**Roles:** SALES (ads + campaigns), MANAGER (full), OWNER (read)

## Models
- `AdAccount` — Meta Ads account ต่อ tenant
- `Campaign` / `AdSet` / `Ad` — hierarchy ของ Meta Ads
- `AdDailyMetric` — spend, impressions, clicks, revenue ต่อวัน
- `AdHourlyMetric` — granular สำหรับ time-series chart
- `AdDailyDemographic` / `AdDailyPlacement` — breakdown
- `DailyBrief` — AI-generated summary รายวัน

## Data Flow (CRITICAL — อ่านก่อน code)
```
Meta Ads Manager
  ↓ QStash sync ทุก 1 ชม. (/api/workers/sync-hourly)
Zuri DB (Campaign/AdSet/Ad/Metrics)
  ↓ Redis cache 5 นาที
Marketing Dashboard (UI อ่านจาก DB เท่านั้น)
```
**ห้าม** call Meta Graph API จาก UI หรือ API route โดยตรง

## Revenue Attribution
- First-touch: Chat → Order → Ad (ผ่าน `Customer.adsId`)
- `adsId` มาจาก Meta Ad ID ที่ลูกค้า click ก่อน inbound message

## Cache Pattern (NFR2: < 500ms)
```js
import { getOrSet } from '@/lib/redis'
const data = await getOrSet(`marketing:${tenantId}:dashboard`, fetchFn, 300)
```

## Daily Brief (DSB) Flow
```
00:00 ICT — cutoff
00:05 — QStash trigger worker
00:05–07:55 — AI process (Gemini Flash)
08:00 — LINE push ถึง MANAGER/OWNER
```

## Repo Functions
```js
import { marketingRepo } from '@/lib/repositories/marketingRepo'
// marketingRepo.getDashboardSummary(tenantId, { from, to })
// marketingRepo.getCampaignList(tenantId, filters)
// marketingRepo.getAdDetail(tenantId, adId)
// marketingRepo.upsertMetrics(tenantId, metrics[]) // ใช้ใน worker เท่านั้น
```

## Gotchas
- Rate limit Meta API: error codes `[4, 17, 32, 613]` → backoff `[60, 120, 240, 480]` วินาที
- Worker ต้อง `throw error` เพื่อให้ QStash retry ≥ 5 ครั้ง (NFR3)
- DSB v1 logic ผิด — ใช้ PDAD tags เป็น input ใน v2 (M3) ดู ROADMAP
- SALES เห็น marketing data ทั้งหมด (ตาม ADR-068 trade-off)
