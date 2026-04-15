---
id: PROTO--inbox-realtime
type: protocol
module: inbox
status: active
summary: "มาตรฐานการส่งข้อมูลแบบ Real-time (Pusher Events) สำหรับกล่องข้อความ"
tags: [realtime, pusher, events]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Inbox Real-time Sync

## 1. Gateway
- **Service**: Pusher Channels
- **Security**: Private Channels (ต้องผ่าน Auth per tenantId)

## 2. Event Payload Standards
### `new-message`
ส่งเมื่อมีข้อความใหม่ (ขาเข้า/ขาออก)
```json
{
  "convo_id": "uuid",
  "message": { "id": "uuid", "text": "...", "sender": "STAFF|CLIENT" }
}
```

### `stage-changed`
ส่งเมื่อมีการย้าย Pipeline Stage
```json
{
  "convo_id": "uuid",
  "new_stage_id": "uuid"
}
```

## 3. Redis Caching
- ใช้ Redis เก็บ `_inflight` messages เพื่อป้องกันการประมวลผลซ้ำในช่วงเวลาสั้นๆ (Race Condition)
- Cache รายชื่อบทสนทนา 50 ชุดแรกใน Redis ตลอดเวลาเพื่อลดการโหลด Database (NFR2)
