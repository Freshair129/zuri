# Courses & Enrollment Module — Agent Context

**Spec:** `docs/product/specs/FEAT07-ENROLLMENT.md`
**Roles:** SALES (view + enroll), MANAGER (full CRUD), OWNER (read)

## Models
- `Course` — catalog item: ชื่อ, ราคา, category, duration (hours)
- `Package` — bundle ของหลาย Course
- `Enrollment` — การลงทะเบียนของ Customer ต่อ Course/Package
- `EnrollmentItem` — progress ต่อ class ภายใน enrollment
- `ClassSession` — session ที่จัดขึ้นจริง (linked to Schedule)

## Enrollment Lifecycle
```
PENDING → ACTIVE → COMPLETED | CANCELLED
```
EnrollmentItem: `PENDING → IN_PROGRESS → COMPLETED`

## Integration Requirements (ห้ามข้าม)
1. **POS/Billing ก่อนเสมอ** — ต้องมี `Order` ที่ CLOSED ก่อนสร้าง Enrollment
2. **CRM** — ใช้ `customerId` จาก Customer record
3. **Kitchen** — CourseMenu ผูก Course กับ Recipe list
4. **Pusher** — trigger `schedule-updated` เมื่อ ClassSession เปลี่ยน

## Course Categories (จาก system_config.yaml)
`japanese_culinary | specialty | management | arts | package | full_course | course`

## Certificate Auto-Generation
- ระบบ auto-gen เมื่อชั่วโมงครบ threshold (จาก system_config.yaml)
- BASIC_30H → PRO_111H → MASTER_201H
- Delivery statuses: `PENDING → PRINTING → READY → SHIPPED → DELIVERED`

## Repo Functions
```js
import { enrollmentRepo } from '@/lib/repositories/enrollmentRepo'
import { courseRepo } from '@/lib/repositories/courseRepo'
// courseRepo.list(tenantId, { category, status })
// enrollmentRepo.create(tenantId, { customerId, courseId, orderId })
// enrollmentRepo.updateProgress(tenantId, enrollmentItemId, status)
// enrollmentRepo.checkCertificate(tenantId, enrollmentId) // auto-trigger cert
```

## Gotchas
- Package swap limit: 1 ครั้งต่อ enrollment (จาก system_config.yaml)
- Gift Enrollment ต้องระบุ `giftFromCustomerId` — ไม่ใช่ enrolling customer เอง
- ห้ามย้าย ClassSession โดยไม่ผ่าน MANAGER approve (drag-drop ต้อง confirm)
