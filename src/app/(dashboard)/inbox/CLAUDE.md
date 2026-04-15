# Inbox Module — Agent Context

**Spec:** `docs/product/specs/FEAT04-INBOX.md`
**Roles:** SALES, STAFF (read), MANAGER, OWNER

## Models
- `Conversation` — thread per customer per platform (FB/LINE)
- `Message` — individual message in a conversation
- `Customer` — linked via `customerId`

## Layout (3 Panel — ห้ามเปลี่ยนโครงสร้าง)
```
[ Left Panel ]     [ Center Panel ]   [ Right Panel ]
  Convo List         Chat View          Customer Card
  FB/LINE badge      Send + AI reply    Quick Sale (POS mini)
  Filter/Search      Slip OCR           Billing Tab
```

## Critical Rules
- **NFR1:** Webhook ต้อง respond 200 ภายใน < 200ms — process async เท่านั้น
- **Realtime:** ใช้ Pusher channel `new-message` — ห้าม poll
- **Read UI from DB only** — ห้าม call Meta Graph API / LINE API จาก UI route
- Slip OCR ใช้ Gemini Vision — endpoint `/api/payments/verify-slip`
- AI compose-reply ใช้ Gemini Flash — endpoint `/api/ai/compose-reply`

## Webhook Paths
- `POST /api/webhooks/facebook` — inbound FB Messenger
- `POST /api/webhooks/line` — inbound LINE OA

## Repo Functions (ใช้ผ่าน repository เท่านั้น)
```js
import { conversationRepo } from '@/lib/repositories/conversationRepo'
// conversationRepo.list(tenantId, filters)
// conversationRepo.getById(tenantId, id)
// conversationRepo.markRead(tenantId, id)
```

## Gotchas
- Message ส่งออกผ่าน QStash worker ไม่ใช่ direct API call
- FB Page Token และ LINE Channel Secret เก็บใน `TenantConfig` ต่อ tenant — ห้าม hardcode
- Platform badge: `source: 'FB' | 'LINE'` มาจาก `Conversation.platform`
