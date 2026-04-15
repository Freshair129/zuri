# GEMINI.md — Zuri Project Adapter
> **Status:** ACTIVE
> **Project:** Zuri Platform

## 📜 Project-Specific Rules

- **Zuri Project Rules:** `d:\zuri\docs\CRITICAL_FACTS.md`

## 🚀 Doc-To-Code Workflow (Mandatory)

I operate strictly within the **Five Phases, Four Gates** framework:

| Phase | Output | Format | Language | Task |
|---|---|---|---|---|
| **P1: Discover** | Feature Brief | MD | Mix | Capture requirement |
| **P2: Design** | `FEAT-{NN}.md` | MD | **Thai (Draft)** | UI/UX, User Journey, Rules |
| **P2 Gate 2** | **Approval** | - | **Translate to EN** | Boss approves → Translate to EN |
| **P3: Architect** | `FEAT-{NN}.yaml` | YAML | **English (EN)** | Technical Blueprint (Hooks, Logic) |
| **P4: Blueprint** | `MOD-*.yaml` | YAML | **English (EN)** | Module Mechanics & IMP Plans |
| **P5: Verify** | Walkthrough | MD | English | Validate Spec ↔ Code |

## 🏗️ Technical Standards

- **Domain First**: Define/Update `module-manifest.yaml` (Geography) and `module-blueprint.yaml` before adding features.
- **Shared Vault**: Project knowledge at `D:/zuri/gks/`
- **Traceability**: Every commit MUST relate to a **ZRI-IMP-xxxx** or **ZRI-TSK-xxxx** code. All work MUST be registered in `d:\zuri\registry.yaml`.
- **Three Pillars**:
    - **GITHUB**: Source of Code (PRs, Branches).
    - **LINEAR**: Source of Tasks (Status, Assignments).
    - **GKS + MSP**: Source of Knowledge (Specs, ADRs, Devlogs). Always reference note IDs (e.g., `(ref: MOD--auth)`).
