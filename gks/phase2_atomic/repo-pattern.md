# Architectural Law: Repository Pattern

- **SSOT**: ALL database operations must go through `src/lib/repositories/`.
- **Restrictions**: No direct `getPrisma()` or `db` calls from API routes or UI components.
- **Tenant Scope**: Every repository function must receive `tenantId` as the first parameter (to ensure multi-tenant isolation).
- **Atomic Operations**: Use `prisma.$transaction` for identity operations or complex multi-table writes.
