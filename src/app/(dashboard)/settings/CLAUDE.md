# Settings Module — Agent Context

**Specs:** `docs/product/specs/FEAT01-MULTI-TENANT.md` · `docs/product/specs/FEAT11-AI-ASSISTANT.md` · `docs/product/specs/FEAT17-ACCOUNTING-PLATFORM.md`
**Roles:** MANAGER (general + integrations), FINANCE (accounting), OWNER (all + billing)

## Sub-sections

### /settings — General
- Tenant profile: ชื่อ, โลโก้, สี (TenantContext)
- **Tenant Sovereignty Rule:** ใช้ `TenantContext` สำหรับ branding เสมอ — ห้าม hardcode tenant-specific UI
- Models: `Tenant`, `TenantConfig`

### /settings/integrations
- Facebook Page: `TenantConfig.fbPageId`, `fbPageToken`
- LINE OA: `TenantConfig.lineChannelId`, `lineChannelSecret`
- Meta Ads: `TenantConfig.metaAdsAccountId`, `metaAdsToken`
- Token เก็บ encrypted ใน DB — ห้าม log หรือ expose ใน response

### /settings/accounting *(Add-on: FINANCE, OWNER)*
- FlowAccount: OAuth 2.0 OpenID Connect, multi-tenant, async via QStash
- Express X-Import: Excel export → Supabase Storage → email รายวัน
- ดู FEAT17-ACCOUNTING-PLATFORM.md ก่อน implement

### /settings/ai-assistant *(Add-on: MANAGER, OWNER)*
- FAQ Knowledge Base — ข้อมูลที่ LINE Bot ใช้ตอบลูกค้า
- LINE Bot config: webhook URL, auto-reply toggle, group monitor
- ดู FEAT11-AI-ASSISTANT.md ก่อน implement

### /settings/billing *(OWNER เท่านั้น)*
- Subscription plan, usage metering (M7)
- ยังไม่ implement ใน M1-M2

### /settings/roles
- Role assignment: assign `role` ต่อ Employee
- ใช้ ADR-068 roles: `OWNER | MANAGER | SALES | KITCHEN | FINANCE | STAFF`

## Repo Functions
```js
import { tenantRepo } from '@/lib/repositories/tenantRepo'
// tenantRepo.getConfig(tenantId)
// tenantRepo.updateConfig(tenantId, configData) // encrypt sensitive fields
// tenantRepo.updateBranding(tenantId, { logo, primaryColor })
```

## Gotchas
- V School default tenantId: `10000000-0000-0000-0000-000000000001`
- TenantConfig cache: invalidate Redis key `tenant:${tenantId}:config` ทุกครั้งที่ update
- Add-on sections ต้องเช็ค `tenant.addons` ก่อนแสดง — ถ้าไม่ได้ซื้อ → show upgrade prompt
- `/tenants` (Platform Admin) อยู่แยกต่างหาก ไม่ใช่ sub-route ของ settings
