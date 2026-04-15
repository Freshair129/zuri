---
id: "PROTO--repo-pattern"
type: "protocol"
status: "active"
epistemic:
  confidence: 1.0
  source_type: "direct_experience"
context_anchor:
  duration: "universal"
summary: "รูปแบบการเข้าถึงฐานข้อมูลผ่าน Repository (SSOT)"
---
# Architectural Law: Repository Pattern

- **SSOT**: ALL database operations must go through `src/lib/repositories/`.
- **Restrictions**: No direct `getPrisma()` or `db` calls from API routes or UI components.
- **Tenant Scope**: Every repository function must receive `tenantId` as the first parameter (to ensure multi-tenant isolation).
- **Atomic Operations**: Use `prisma.$transaction` for identity operations or complex multi-table writes.
