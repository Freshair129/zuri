---
id: PROTO--hardware-connection
type: protocol
module: billing
status: active
summary: "มาตรฐานการเชื่อมต่ออุปกรณ์ฮาร์ดแวร์ (ESC/POS, Thermal Printer, EDC)"
tags: [hardware, printing, pos]
created_at: 2026-04-14
updated_at: 2026-04-14
---
# Protocol: Hardware & Device Connection

## 1. Supported Standards
- **Thermal Printer**: เชื่อมต่อผ่าน ESC/POS commands (USB/Bluetooth/Network)
- **Web Interface**: ใช้ WebUSB API หรือ Node.js Bridge สำหรับการส่งคำสั่งล้างเครื่องพิมพ์
- **EDC Terminal**: รองรับมาตรฐาน Ingenico/Verifone ผ่าน USB/Serial

## 2. Printer Templates (P-R-I-N-T)
- **58mm**: เน้นข้อมูลย่อ (Compact Layout)
- **80mm**: ข้อมูลครบถ้วน (Standard Layout)
- **A4**: ใบกำกับภาษีเต็มรูปแบบ (Tax Invoice)

## 3. Print Command Workflow
1. **Render**: สกัดข้อมูลจาก Transaction/Invoice
2. **Transform**: แปลงข้อมูลเป็น Bitmask/Text สำหรับ Thermal Printer หรือ PDF สำหรับ A4
3. **Dispatch**: ส่งผ่าน Driver/Socket ไปยังเครื่องพิมพ์ตาม IP หรือ Port ที่ตั้งไว้
4. **Verification**: ตรวจสอบสถานะการพิมพ์ (ถ้าอุปกรณ์รองรับ)
