---
id: PROTO--attendance-checkin
type: protocol
module: enrollment
status: active
summary: "มาตรฐานการเช็คชื่อเข้าชั้นเรียนผ่านระบบ QR Code (Attendance Check-in Standard)"
tags: [attendance, checkin, qr, security]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Attendance QR Check-in

## 1. Goal
เพื่อให้การบันทึกการเข้าเรียนมีความรวดเร็วและป้องกันการเช็คชื่อแทนกัน (Anti-fraud) โดยใช้ Dynamic QR Code

## 2. Process Flow
1. **QR Generation**: ระบบสร้าง Dynamic QR Code ล่วงหน้า 15 นาทีก่อนเริ่ม Session (มี TTL สั้น)
2. **Scanning**: นักเรียนสแกน QR ผ่านโทรศัพท์มือถือที่ Login เข้าระบบ Zuri ไว้แล้ว
3. **Verification**: 
    - ตรวจสอบ `tenant_id`
    - ตรวจสอบว่า `customer_id` นี้ได้ลงทะเบียนในคอร์สจริงหรือไม่
    - ตรวจสอบพิกัด (Optional - Geo-fencing)
4. **Hit Confirmation**: ระบบส่งสัญญาณ Pusher ไปยังหน้าจอ Dashboard ของพนักงานเพื่อแสดงผลทันที ("เช็คชื่อสำเร็จ!")

## 3. Data Structure
```json
{
  "enrollment_id": "uuid",
  "session_id": "uuid",
  "checkin_time": "timestamp",
  "status": "PRESENT"
}
```
