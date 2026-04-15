# Employees Module — Agent Context

**Spec:** `system_config.yaml → employee` · `docs/decisions/adrs/ADR-068-persona-based-rbac.md`
**Roles:** MANAGER (full CRUD), OWNER (read)

## Models
- `Employee` — record พนักงาน: tenantId, role, grade, employmentType, deptCode
- `User` — NextAuth user linked to Employee (1:1)

## Employee ID Format (จาก id_standards.yaml)
`EMP-[TYPE]-[DEPT]-[NNN]`
เช่น `EMP-FL-MKT-001` = Freelance, Marketing dept, #001

## Employment Types
`EMP (employee) | FL (freelance) | CT (contract)`

## Department Codes (ไม่ใช่ RBAC roles)
`MKT | MGT | PD | SLS | AM | ADM | GD | CG | MM | MGFX | ED | CC | GEN`

## RBAC Roles (ADR-068 — 6 Persona roles)
`OWNER | MANAGER | SALES | KITCHEN | FINANCE | STAFF`
- เก็บ UPPERCASE ใน DB เสมอ
- assign ผ่าน `/settings/roles` ไม่ใช่ `/employees/:id` โดยตรง

## Performance Grades
`S (≥90) | A (≥75) | B (≥55) | C (≥35) | D (<35)`
— ค่าจาก `system_config.yaml → employee.grades`

## Repo Functions
```js
import { employeeRepo } from '@/lib/repositories/employeeRepo'
// employeeRepo.list(tenantId, { dept, role, status })
// employeeRepo.getById(tenantId, employeeId)
// employeeRepo.create(tenantId, employeeData) // auto-generate EMP ID
// employeeRepo.updateRole(tenantId, employeeId, role) // MANAGER เท่านั้น
// employeeRepo.deactivate(tenantId, employeeId) // log ใน AuditLog
```

## Gotchas
- Role change ต้อง log ใน `AuditLog` ทุกครั้ง (audit.actions: `ROLE_CHANGE`)
- Deactivate employee ต้อง log `EMPLOYEE_DEACTIVATE` ใน AuditLog
- ห้าม delete Employee record — ใช้ `status = INACTIVE` เท่านั้น
- Department code และ RBAC role เป็นคนละ field — อย่าสับสน
