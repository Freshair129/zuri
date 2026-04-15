# MSP — Memory & Soul Passport Architecture

**Version:** 2.0 (Path-Encoded Multi-Agent Architecture)
**Status:** ACTIVE

This document outlines the architecture of the centralized "Brain" system that powers the multi-agent ecosystem (EVA, Claude, Gemini).

---

## 🏛️ 1. The Three Pillars of the Ecosystem

The system completely separates **Worker (Agent)**, **Manager (MSP)**, and **Storage (GKS)** to ensure data security and multi-project scalability.

### 🤖 1.1 The Agent Layer (.eva, .claude, .gemini)
Agents are independent workers with their own identities, skills, and short-term operational memories.
- **Independence:** Each agent lives in its own root directory in the user's home folder.
- **Skills System:** Agents use `.agent/skills/` (Hooks and Commands) to give them procedural capabilities.
- **Private Memory:** Contains agent-specific identities (`CoreMemory`) that never mix with project logic.

### 🛡️ 1.2 The Manager: Memory & Soul Passport (`.brain/msp/`)
MSP is the strict Gatekeeper. An agent **cannot** directly write to the Knowledge Graph.
- **Registries (`agents-registry.yaml`, `vaults-registry.yaml`):** The absolute Source of Truth for system identities and folder routing.
- **Inbound Queues:** A buffering system where agents drop their raw memory drafts. MSP picks them up, validates them, and writes them to the Vaults.

### 📚 1.3 The Storage: Global Knowledge Storage (`.brain/gks/`)
GKS is the hardened, long-term memory vault. It is heavily protected by MSP ACLs.
- **Global Vault:** Universal knowledge (Architecture rules, OS setups, universal patterns).
- **Project Vaults:** Specific to project codebases.

### 👁️ 1.4 The Viewer: Obsidian (`.obsidian/`)
Obsidian serves as the **read-only GUI interface** for GKS. Every Vault that Obsidian opens is a GKS folder — allowing Agents and the User to visually browse, search, and link knowledge without writing directly.

| Obsidian Vault | GKS Path | Scope |
|---|---|---|
| EVA Vault | `OneDrive/.../EVA/` | Global (EVA Identity) |
| Zuri Vault | `D:\zuri\gks\` | Project-specific |

> **Important:** Obsidian does NOT replace MSP. The User reads via Obsidian; Agents write via MSP inbound queues only.

#### 🔌 Active Plugins (Zuri Vault)

**1. `obsidian-local-rest-api`**
Exposes a local HTTP endpoint (e.g. `http://localhost:27123`) so that Agents can programmatically **read** any note in the GKS without opening Obsidian manually.

Benefits:
- Agents can **search**, **retrieve**, and **read** knowledge notes at task time.
- No need to parse raw `.md` files — the API returns clean structured content.
- Enables "Pull from GKS before doing work" patterns (e.g. load ADRs before writing code).

**2. `mcp-tools`**
Integrates Obsidian with the **Model Context Protocol (MCP)**, which allows AI agents (including Claude and Gemini) to directly call Obsidian as a "Tool" in their context window.

Benefits:
- Agent can call `obsidian.search("FEFO algorithm")` in-context and get results instantly.
- Reduces hallucination by grounding responses in actual GKS knowledge.
- Bi-directional: Agent can **read** note details via MCP, and **submit to MSP inbound** to grow the knowledge base.

#### Combined Access Pattern

```
Agent needs context
  → Calls Obsidian MCP Tool or REST API  → Reads from GKS (safe, no write)
  → Does work
  → Learns something new
  → Calls /submit-memory skill            → Drops to MSP inbound (gated write)
  → MSP processes and saves to GKS
```

---

## 🔗 2. Project Path Encoding Architecture

To allow multiple projects to exist without overlapping, we use a **Path Encoding Paradigm** (inspired by Claude Code). 

### 2.1 Project-Level Workspace (`.agents/`)
Each project repository contains a `.agents/` directory (automatically handled by Antigravity IDE) to manage workspace-specific behavior.

- **`{project}/.agents/workflows/`**: Automated Procedures (Hooks).
- **`{project}/.agents/skills/`**: Project-Specific Capabilities.
- **`{project}/gks/`**: Local knowledge (Specs, ADRs, Devlogs).

### 2.2 How it Works (Encoding)
When an agent starts work in `D:\zuri`, the path is encoded into a system-safe ID: `D--zuri`.

### 2.3 Directory Routing
Data is dynamically routed between the global system and the project workspace:
1. **Agent Short-term Memory:** `C:\Users\freshair\.eva\projects\D--zuri\memory\`
2. **MSP Inbound Queue:** `C:\Users\freshair\.brain\msp\projects\D--zuri\inbound\`
3. **Project GKS:** `D:\zuri\gks\` (Shared Knowledge Graph).

---

## 📥 3. Standard Memory Flow Protocol

When an Agent learns something new and needs to remember it long-term:

1. **Trigger:** Agent uses the `/submit-memory` skill.
2. **Resolve:** Agent runs `resolve-project.ps1` to get context (e.g., `D--zuri`).
3. **Draft:** Agent creates an atomic `.md` file with strict frontmatter (date, type, submitted-by).
4. **Submit:** Agent writes the file to `.brain/msp/projects/D--zuri/inbound\`.
5. **Wait:** Agent drops the file and moves on.
6. **Process:** (Background/MSP) MSP reads the inbound queue, validates the file against `vaults-registry.yaml`, and hard-prints it into the correct GKS vault.

---

## 💡 Summary of System Hierarchy

```text
[GLOBAL — User Home: C:\USERS\FRESHAIR\]
│
├── .eva\                        # EVA Agent Workspace
│   ├── Constitution.md          # Immutable identity rules
│   ├── CoreMemory\              # "Who am I?" (global, cross-project)
│   ├── skills\                  # "What can I do?" (session-start, /submit-memory)
│   └── projects\
│       └── D--zuri\             # EVA's scratchpad for Zuri project
│           └── memory\
│
├── .claude\                     # Claude's equivalent space
│   └── projects\D--zuri\memory\ # Claude's project scratchpad
│
├── .gemini\                     # Gemini's equivalent space
│
└── .brain\                      # MSP System Core
    ├── gks\global\              # Universal Truths (cross-project knowledge)
    └── msp\                     # The Gatekeeper
        ├── agents-registry.yaml # "Who exists?"
        ├── vaults-registry.yaml # "Who has access to what?"
        ├── utils\resolve-project.ps1  # Helper: path → encoded ID
        └── projects\
            └── D--zuri\
                └── inbound\     # DROP ZONE for Zuri memories

[PROJECT — D:\ZURI\]
│
├── GEMINI.md                    # Gemini project instructions
├── CLAUDE.md                    # Claude project instructions
├── registry.yaml                # Project task & ID registry
│
├── .agents\                     # Workspace Skills (Antigravity IDE)
│   ├── workflows\               # Auto-triggered Hooks
│   └── skills\                  # Project-specific /commands
│
└── gks\                         # Shared Project Knowledge Graph
    ├── .obsidian\               # Obsidian GUI config (REST API + MCP plugins)
    ├── 00_index\MOC.md          # Entry point (required)
    ├── features\                # Feature specs (FEAT-NN.md)
    ├── adr\                     # Architecture decisions
    └── 14_devlog\               # Work logs & walkthroughs
        ├── task\                # Active & completed task logs
        │   ├── MSP-TSK-*.md     # Individual task records
        │   └── done\            # ✅ ARCHIVE: Completed tasks
        │       ├── INDEX.md     # Archive index & guidelines
        │       └── MSP-TSK-*.md # Historical task records (permanent)
        ├── implement\           # Implementation plans
        │   └── MSP-IMP-*.md     # Technical blueprints
        ├── walkthrough\         # Phase walkthroughs
        ├── incidents\           # Post-mortem incident reports
        ├── reviews\             # Quality review records
        └── feedbacks\           # Feedback from reviews
```

> **Read path:** User or Agent → Obsidian REST API / MCP → GKS
> **Write path:** Agent → `/submit-memory` → MSP Inbound → MSP validates → GKS
