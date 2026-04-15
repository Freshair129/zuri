# โครงสร้าง Obsidian Vault สำหรับ Agent (Knowledge Graph)

> เป้าหมาย: ให้ agent เข้าถึงผ่าน MCP ได้อย่างมีประสิทธิภาพ — โหลดเฉพาะ index ก่อน แล้วค่อย drill-down ตามเส้นความสัมพันธ์ เพื่อลด hallucination และลดการเผา token

---

## 1. หลักการออกแบบ (Design Principles)

1. **Progressive Disclosure** — ข้อมูลจัดเป็นชั้น ๆ: Index → Module → Feature → Component → Detail
2. **Atomic Notes** — 1 note = 1 concept (หนึ่งเรื่อง หนึ่งไฟล์) เพื่อให้ลิงก์แม่นและโหลดเฉพาะส่วนที่ใช้
3. **Structured Frontmatter** — ทุก note มี YAML metadata ให้ agent query ได้โดยไม่ต้องอ่านเนื้อหา
4. **Explicit Links** — ใช้ `[[wikilinks]]` + `dataview` เพื่อสร้าง graph ที่ traverse ได้
5. **Summary-First** — ทุก note มี `summary:` ใน frontmatter (1–2 บรรทัด) ให้ agent ตัดสินใจได้ว่าจะอ่านเต็มหรือไม่
6. **Single Source of Truth** — ไม่ทำซ้ำข้อมูล ถ้าจะอ้างอิงให้ลิงก์

---

## 2. Genesis Knowledge System (GKS) — 6 Types

### 2.1 Type Definitions

| Type | คำถาม | Use When | File Pattern |
|---|---|---|
| **Concept** | WHY — คืออะไร ทำไมมี | นิยาม, principle, architecture decision | `Concept/{Name}.md` |
| **Algo** | HOW — ทำงานยังไง | sequence, data flow, logic steps | `Algo/{Name}.md` |
| **Proto** | PROCESS — ต้องทำตามยังไง | workflow, procedure (knowledge ≠ Skill) | `Proto/{Name}.md` |
| **Param** | WHAT — ค่าตัวแปรอะไร | ยอดขาย, win_rate, จำนวนวันลา | `Param/{Name}.md` |
| **Incident** | AVOID — อะไรพัง | lesson from real failure | `Incident/{Name}.md` |
| **Safety** | GUARD — ป้องกันอะไร | system guardrail, write-gating | `genesis/Safety/{Name}.md` |

### 3.2 Frame vs Concept (ความแตกต่างสำคัญ)

| | Concept | Frame |
|---|---|---|
| คำถาม | "สิ่งนี้คืออะไร" | "มองสิ่งนี้ผ่านอะไร" |
| Function | Define / Explain | Filter / Interpret / Analyze |
| ตัวอย่าง | `Concept::Separation_of_Concerns` = "หลักการแยก responsibility" | `Frame::Separation_of_Concerns` = "เลนส์สำหรับตัดสินว่าโค้ดอยู่ผิดที่ไหม" |
| Activation | ถูก reference | ถูก apply ทุกครั้งที่วิเคราะห์ |

> จาก EVA 4.0: Frame ถูกแยกออกจาก Concept เพราะ mental model ทำงานต่างจาก definition พื้นฐาน

### 3.3 Safety Block (จาก EVA 4.0)

Safety entries **override ทุก type อื่น** — enforce ก่อน logic อื่นทั้งหมด

| Safety Rule | Enforcement |
|---|---|
| Knowledge write ต้อง Boss approve | Agent proposes → Boss reviews → merge |
| Incident ต้องมี episode_id จริง | ห้ามสร้าง Incident จาก thin air |
| Schema change ต้อง coordinate | ห้ามแก้ schema.prisma โดยไม่ check กับ agent อื่น |


---

## 2. โครงสร้างโฟลเดอร์ (Folder Structure)

```
gks/                             # Genesis Knowledge System (Obsidian)
├── 00_index/                    # จุดเข้าหลักของ agent (โหลดก่อนเสมอ)
│   ├── MOC.md                   # Map of Content — ภาพรวมทั้ง vault
│   ├── modules-index.md         # รายชื่อ module ทั้งหมด + summary
│   ├── features-index.md        # รายชื่อ feature ทั้งหมด + summary
│   ├── glossary-index.md        # คำศัพท์สำคัญ
│   └── agent-protocol.md        # กติกาการใช้ vault สำหรับ agent
│
├── 01_modules/                  # ระดับ module (ใหญ่สุด)
│   ├── MOD--login-register.md
│   ├── MOD--tier-subscription.md
│   └── ...
│
├── 02_features/                 # ระดับ feature (ภายใต้ module)
│   ├── FEAT--login-register-oauth.md
│   ├── FEAT--login-register-mfa.md
│   ├── FEAT--tier-subscription-upgrade.md
│   └── ...
│
├── 03_algorithms/               # ระดับ code component / service / class
│   ├── ALGO--jwt-service.md
│   ├── ALGO--session-store.md
│   └── ...
│
├── 04_protocol/                     # 
│   ├── PROTO--auth-login.md
│   ├── PROTO--billing-invoice.md
│   └── ...
│
├── 05_parametrics/                     # 
│   ├── PARAM--win_rate.md
│   ├── PARAM--conversion_rate.md
│   └── ...
│
├── 06_incidents/                    # 
│   ├── INC--oauth-login.md
│   └── ...
|
├── 07_safety/                    # 
│   ├── SAFETY--oauth-login.md
│   └── ...
│
├── 08_apis/                     # API contracts / endpoints
│   ├── POST--auth-login.md
│   ├── GET--billing-invoice.md
│   └── ...
│
├── 09_data/                     # Data models, schemas, migrations
│   ├── entity--user.md
│   ├── entity--subscription.md
│   └── ...
│
├── 10_flows/                    # Sequence / user flows
│   ├── flow--oauth-login.md
│   └── ...
│
├── 11_decisions/                # ADR (Architecture Decision Records)
│   ├── ADR-0001-jwt-vs-session.md
│   └── ...
│
├── 12_glossary/                 # ศัพท์เฉพาะของโปรเจค
│   └── term--tenant.md
│
└── 13_meta/                     # กติกา vault, template, agent rules
    ├── templates/
    └── schema.md
```

**ทำไมตั้งชื่อแบบ `module--feature.md` แทน nested folder?**
เพื่อให้ MCP list ไฟล์ได้ flat, search ด้วย prefix ได้เร็ว และหลีกเลี่ยง path ซ้อนที่ทำให้ agent confuse

---

## 3. Frontmatter Schema (สำคัญที่สุด)

ทุกไฟล์ต้องมี YAML frontmatter ตาม schema นี้ เพื่อให้ agent query ผ่าน dataview/MCP ได้โดยไม่โหลดเนื้อหา

```yaml
---
id: auth--login-oauth           # unique slug
type: feature                   # module | feature | component | api | entity | flow | adr | term
module: auth                    # parent module
status: stable                  # draft | stable | deprecated
version: 1.2.0
owner: "@team-identity"
summary: "Login via Google/Apple OAuth, issues JWT + refresh token"
tags: [auth, oauth, security]
depends_on:                     # edges ออก
  - "[[component--jwt-service]]"
  - "[[entity--user]]"
  - "[[POST--auth-login]]"
used_by:                        # edges เข้า (maintain manually หรือ auto ด้วย dataview)
  - "[[feature--sso]]"
related_adrs:
  - "[[ADR-0001-jwt-vs-session]]"
touch_points:                   # ไฟล์ code จริง (ให้ agent รู้จะไปอ่าน repo ตรงไหน)
  - "src/auth/oauth.ts"
  - "src/auth/jwt.service.ts"
last_reviewed: 2026-04-01
---
```

**กฎเหล็ก:** `summary` ต้องสั้นพอที่ agent โหลด frontmatter ของ 50 ไฟล์แล้วยังไม่กิน token เยอะ (< 200 chars)

---

## 4. Agent Access Protocol (ผ่าน MCP)

### ขั้นตอนการเข้าถึงของ agent

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Bootstrap (โหลดครั้งเดียวต่อ session, ~2-5K tokens) │
│   → อ่าน 00_index/MOC.md                                    │
│   → อ่าน 00_index/modules-index.md                          │
│   → อ่าน 00_index/agent-protocol.md                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Narrow Down (query frontmatter เท่านั้น)            │
│   → MCP: search_by_tag / search_by_frontmatter              │
│   → ได้ list ของ note ที่เกี่ยวข้อง + summary               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Drill Down (อ่านเฉพาะ note ที่เลือก)                │
│   → MCP: read_note(id)                                      │
│   → ถ้าต้อง follow relationship → อ่านเฉพาะ link ที่จำเป็น  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Verify (กันหลอน)                                    │
│   → เทียบกับ touch_points (code จริง)                       │
│   → ถ้าไม่แน่ใจ → ขอให้ user ยืนยัน ห้ามเดา                 │
└─────────────────────────────────────────────────────────────┘
```

### MCP Server ที่แนะนำ

- **`mcp-obsidian`** (community) — อ่าน/ค้น markdown ใน vault
- **`obsidian-local-rest-api`** plugin + MCP wrapper — รองรับ dataview query
- ทางเลือก: เขียน custom MCP server ที่ expose 4 tool เท่านั้น:
  - `list_index()` → คืน MOC
  - `search(query, filters)` → query frontmatter อย่างเดียว
  - `read_note(id)` → อ่านไฟล์เดียว
  - `get_neighbors(id, depth=1)` → คืน node ที่ลิงก์ตรงเท่านั้น

---

## 5. ตัวอย่างไฟล์หลัก

### `00_index/MOC.md`
```markdown
---
type: moc
summary: "Root index of project knowledge base"
---
# Project Knowledge Graph

## Modules
- [[10_modules/auth/_module|Auth]] — Identity & access
- [[10_modules/billing/_module|Billing]] — Subscription & invoicing
- [[10_modules/notification/_module|Notification]] — Email/push/SMS

## Quick Lookups
- [[00_index/features-index]]
- [[00_index/glossary-index]]

## Agent Rules
- [[00_index/agent-protocol]]
```

### `10_modules/auth/_module.md`
```markdown
---
id: module--auth
type: module
summary: "Handles authentication, authorization, and session management"
owns_features:
  - "[[auth--login-oauth]]"
  - "[[auth--mfa]]"
  - "[[auth--password-reset]]"
owns_entities:
  - "[[entity--user]]"
  - "[[entity--session]]"
---
# Auth Module

## Scope
ครอบคลุม: login, logout, MFA, session, RBAC
ไม่ครอบคลุม: user profile (→ [[module--profile]])

## Key Decisions
- [[ADR-0001-jwt-vs-session]]
```

### `00_index/agent-protocol.md`
```markdown
---
type: protocol
summary: "Rules agents must follow when using this vault"
---
# Agent Protocol (READ FIRST)

1. **ห้ามโหลดเอกสารเกิน 3 ไฟล์ต่อ query** เว้นแต่ผู้ใช้ขอ
2. **ต้องอ่าน `_module.md` ก่อนเสมอ** ถ้าจะทำงานกับ module นั้น
3. **ถ้า `status: deprecated`** → เตือน user และหา version ใหม่
4. **ถ้า `summary` ไม่ตรงกับสิ่งที่ user ถาม** → อย่าอ่านเนื้อหาต่อ
5. **ห้ามสร้างข้อมูลที่ไม่มีใน vault** — ถ้าไม่เจอ ให้บอกว่า "ไม่มีใน knowledge base"
6. **ทุกคำตอบต้องอ้าง note id** ที่ใช้ เช่น `(ref: auth--login-oauth)`
```

---

## 6. Convention การตั้งชื่อ (Naming)

| ประเภท     | รูปแบบ                          | ตัวอย่าง                   |
|------------|----------------------------------|----------------------------|
| Module     | `module--{name}`                 | `module--auth`             |
| Feature    | `{module}--{feature}`            | `auth--login-oauth`        |
| Component  | `{module}--{component}`          | `auth--jwt-service`        |
| API        | `{METHOD}--{path-dashed}`        | `POST--auth-login`         |
| Entity     | `entity--{name}`                 | `entity--user`             |
| Flow       | `flow--{name}`                   | `flow--oauth-login`        |
| ADR        | `ADR-{number}-{slug}`            | `ADR-0001-jwt-vs-session`  |
| Term       | `term--{word}`                   | `term--tenant`             |

---

## 7. Dataview Queries ที่ agent ควรรู้

```dataview
// หา feature ทั้งหมดใน module auth
LIST summary FROM "20_features"
WHERE module = "auth" AND status != "deprecated"
```

```dataview
// หา orphan note (ไม่มีใครลิงก์ถึง) — ต้องรีวิว
LIST FROM "20_features" WHERE length(file.inlinks) = 0
```

---

## 8. Workflow การบำรุงรักษา

1. **เมื่อเพิ่ม feature ใหม่** → สร้างไฟล์ใน `20_features/` + อัปเดต `_module.md` ของ module นั้น
2. **เมื่อ deprecate** → เปลี่ยน `status: deprecated` + เพิ่ม `replaced_by:` ใน frontmatter
3. **ทุกสัปดาห์** → run dataview query หา orphan + stale (`last_reviewed` > 90 วัน)
4. **ก่อน release** → agent ต้อง regenerate `features-index.md` อัตโนมัติจาก frontmatter

---

## 9. ประโยชน์ที่ได้ (Why this works)

| ปัญหาเดิม                          | วิธีแก้ใน design นี้                           |
|------------------------------------|------------------------------------------------|
| Agent โหลดเอกสารทั้งโปรเจคเผา token | Index-first + frontmatter-only query           |
| Agent หลอนเพราะไม่รู้ว่าอันไหนจริง  | `touch_points` ชี้ code จริง + `status` เด่นชัด|
| ความสัมพันธ์ซ่อน ไม่เห็น graph     | wikilinks + dataview + Obsidian graph view     |
| ซ้ำซ้อน หลายที่ขัดแย้งกัน          | Atomic note + single source + `replaced_by`    |
| เอกสารเก่า ไม่รู้ว่ายังใช้ได้ไหม   | `last_reviewed` + stale detection              |

---

## 10. Checklist เริ่มต้นใช้งาน

- [ ] สร้างโครงสร้างโฟลเดอร์ตามข้อ 2
- [ ] สร้าง template ใน `90_meta/templates/` ตาม schema ข้อ 3
- [ ] เขียน `00_index/MOC.md` + `agent-protocol.md`
- [ ] ตั้ง MCP server ชี้มาที่ vault (read-only สำหรับ agent)
- [ ] ทำ seed: หยิบ 1 module มาลงก่อน ดูว่า agent ใช้งานลื่นไหม
- [ ] สอน agent ให้ทำตาม `agent-protocol.md` ผ่าน system prompt
