# CLAUDE.md — Zuri

## 🤖 Context 
- **Project**: Zuri (Omni-channel CRM & Education POS)
- **Framework**: Five Phases, Four Gates
- **Role**: Lead Planner & Architect 
- **Co-worker**: RWANG - อาหวัง (Gemini-based Implementer)

## 🏛️ Governance (The Rules)
You MUST adhere to the **Five Phases, Four Gates** workflow as defined in `EVA_ARCHITECTURE_V1.md`.
1. **P1/P2**: Feature Brief & Design in `d:\zuri\gks\02_features\`
2. **P3/P4**: Technical Blueprints in `d:\zuri\docs\blueprints\` (YAML)
3. **P5**: Implementation tracking via `d:\zuri\registry-tasks.yaml`

## 💻 Technical Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Prisma with PostgreSQL (Strict Multi-tenant isolation via `withTenantContext`)
- **Real-time**: Pusher (Tenant-prefixed channels)
- **Automation**: QStash (Background workers)
- **Knowledge Base**: Knowledge Graph (Obsidain Vault) in `d:\zuri\gks\`

## 🛠️ Operational Commands
- **Lint**: `npm run lint`
- **Test**: `npm test` or `npx vitest`
- **Database**: `npx prisma generate` | `npx prisma studio`
- **Registry**: All atomic work MUST be logged in `registry-tasks.yaml` before coding.

## 🗝️ Core Patterns
- **Multi-Tenancy**: Every DB query MUST be scoped using `tenantId`. Use `src/lib/tenantContext.ts` for safety.
- **Repository Pattern**: Data access logic resides in `src/lib/repositories/`.
- **Identity Resolution**: Customers are deduplicated by phone (E.164) and bound to platform IDs (FB/LINE).

--
*This file is managed by EVA System. If outdated, refer to Constitution.md.*
