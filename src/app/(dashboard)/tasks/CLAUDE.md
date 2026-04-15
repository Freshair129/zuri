# Tasks Module — Agent Context

**Spec:** `system_config.yaml → tasks`
**Roles:** ทุก role (STAFF, SALES, KITCHEN, FINANCE, MANAGER, OWNER)

## Models
- `Task` — งาน: title, type, priority, status, assigneeId, dueDate, tenantId

## Task Types (จาก system_config.yaml)
`SINGLE | RANGE | PROJECT`

## Priority Levels
`L0 Critical → L1 High → L2 Important → L3 Routine → L4 Low → L5 Optional`

## Statuses
`PENDING → IN_PROGRESS → DONE | CANCELLED`

## Action Types
`FOLLOW_UP | MEETING | CALL | EMAIL | PURCHASE | REVIEW | OTHER`

## Permission Rules
- ทุก role เห็น task ที่ `assigneeId` ตรงกับตัวเอง
- MANAGER เห็น task ทั้งหมดในองค์กร
- Auto-created tasks จาก AI (M3: B3 Follow-up CTA) ต้องมี `source: 'AI'` flag

## Repo Functions
```js
import { taskRepo } from '@/lib/repositories/taskRepo'
// taskRepo.list(tenantId, { assigneeId, status, priority })
// taskRepo.create(tenantId, taskData)
// taskRepo.updateStatus(tenantId, taskId, status)
```

## Gotchas
- Task ที่ AI สร้างให้ set `status = PENDING` เสมอ — ห้าม auto-start
- Milestone type: `brief | review | meeting | submit | other` ใช้กับ PROJECT type
- Due date notification ผ่าน LINE Push (in-app + LINE) — ใช้ QStash cron
