---
id: "adr-056"
type: "adr"
module: "MOD--core"
status: "enforced"
owner: "@architect"
summary: "Standardize Row-Level Multi-tenant Isolation using Shared Database architecture."
created_at: 2026-04-12
updated_at: 2026-04-14
created_by: "RWANG"
updated_by: "RWANG"
---
# ADR-056: Shared DB Multi-Tenancy

## Context
Project Zuri is a multi-tenant platform serving multiple independent education and F&B businesses. We need a cost-effective yet highly secure data isolation strategy.

## Decision
We adopted the **Shared Database with Row-level Isolation** pattern.

1. **Mandatory Tenant ID**: Every table in the database must include a `tenantId` (UUID) column.
2. **Context Propagation**: The `tenantId` is resolved at the API Middleware level from the user session.
3. **Execution Safety**: 
   - Use `withTenantContext` (implemented via `AsyncLocalStorage`) to wrap all repository calls.
   - All DB queries MUST include `{ tenantId }` in the filter.
4. **Middlewares**: Prisma middlewares are used to double-check that `tenantId` is present in writes.

## Consequences
- **Pros**: Low infrastructure cost, easy schema migrations across all tenants.
- **Cons**: Application code must strictly enforce filters. A bug in the query logic could leak data. 
- **Mitigation**: Automated tests must verify that `tenantId` is always injected.
