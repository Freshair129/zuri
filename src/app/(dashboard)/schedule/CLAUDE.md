# Schedule Module — Agent Context

**Spec:** `docs/product/specs/FEAT07-ENROLLMENT.md` (Schedule section)
**Roles:** STAFF, SALES (view + attendance), MANAGER (full), OWNER (read)

## Models
- `ClassSession` — instance การสอน: courseId, date, sessionType, instructorId, status
- `Attendance` — check-in record ต่อ EnrollmentItem + ClassSession
- `Schedule` — calendar config ต่อ tenant

## Session Types (จาก system_config.yaml)
`MORNING | AFTERNOON | EVENING`

## Session Statuses
`OPEN | FULL | CANCELLED | COMPLETED | POSTPONED`

## Attendance Flow
```
QR Code scan (student) → POST /api/schedules/:id/attendance
→ validate enrollment active → create Attendance record
→ update EnrollmentItem.status = IN_PROGRESS
→ Pusher trigger → calendar refresh
```

## Calendar Views
- Month / Week / Day — ใช้ library ที่มีอยู่ อย่าเขียนเอง
- Drag-and-drop reschedule: MANAGER เท่านั้น + ต้อง confirm modal ก่อน push

## Repo Functions
```js
import { scheduleRepo } from '@/lib/repositories/scheduleRepo'
// scheduleRepo.list(tenantId, { from, to, courseId })
// scheduleRepo.getById(tenantId, sessionId)
// scheduleRepo.updateStatus(tenantId, sessionId, status)
// scheduleRepo.recordAttendance(tenantId, sessionId, enrollmentItemId)
```

## Gotchas
- Auto-absent: ถ้าไม่ check-in ภายใน session window → system mark ABSENT อัตโนมัติผ่าน QStash worker
- QR Code encode: `{tenantId}:{sessionId}:{timestamp}` — validate timestamp ± 15 นาที
- Pusher channel: `schedule-updated` — ห้าม re-fetch ทั้ง calendar เมื่อมี update เล็กน้อย ใช้ optimistic update
