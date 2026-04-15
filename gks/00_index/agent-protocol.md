---
id: "agent-protocol"
type: "protocol"
summary: "Rules AI agents must follow when using this Knowledge Graph"
status: "active"
---
# 🤖 Agent Navigation Protocol

> [!IMPORTANT]
> This protocol is mandatory for all EVA-AGT entities. Failure to follow these rules will lead to inconsistencies in the GKS.

## 1. Interaction Rules
1. **Registry First**: Every new task or implementation MUST be registered in `registry.yaml` with a unique `ZRI-IMP-xxxx` code BEFORE any work starts.
2. **Index First**: Always load `00_index/MOC.md` at the start of a session.
3. **Drill Down**: Do not load more than 3 detailed notes per query unless explicitly requested.
3. **Reference ID**: Every response derived from this vault must cite the note ID (e.g., `(ref: MOD--auth)`).
4. **No Hallucination**: If knowledge is missing, state "Knowledge not found in GKS" instead of guessing.

## 2. Writing Rules
1. **Boss Proposes**: Agents can draft changes to the GKS in a separate `proposed/` branch or file.
2. **Gate 2 Approval**: No write operation to the GKS is final without `Boss APPROVED`.
3. **Schema v2**: Every new note MUST use [[13_meta/schema-v2|Schema v2]] with `epistemic`, `context_anchor`, and typed `crosslinks`.
4. **Write Protocol**: Follow [[13_meta/AGENT_WRITE_PROTOCOL|AGENT_WRITE_PROTOCOL]] step-by-step before saving any note.

## 3. Reading Rules (Epistemic-Aware)
1. `confidence ≥ 0.8` + `source_type: direct_experience` → **ASSERT** ได้
2. `confidence 0.6–0.8` + `source_type: inference` → ต้อง **CAVEAT** ก่อน assert
3. `confidence < 0.6` หรือ `source_type: external` → ต้อง **VERIFY** ก่อน ห้าม assert
4. `context_anchor.duration: temporary` + `valid_until` ผ่านแล้ว → treat as **deprecated**

## 4. Maintenance
1. **Status Check**: If a note is `status: draft` or `status: stub`, treat it as unstable.
2. **Stale Detection**: If `updated_at` > 90 days and `granularity ≠ universal`, notify user.
3. **Contradiction Check**: ถ้าพบ `contradicts` ที่ไม่ได้ update ทั้งสองฝั่ง → แจ้ง Boss ทันที
