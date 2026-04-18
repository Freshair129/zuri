---
id: "ADR-070"
type: "architecture_decision"
status: "active"
version: "1.0.0"
summary: "Transition to a Master-Detail Navigation Shell using the Topbar for module switching and the Sidebar for contextual sub-features to reduce cognitive load and improve scalability."
tags: [navigation, architecture, layout, scalability, ui-ux]
created_at: "2026-04-18"
created_by: "@gemini-draft"
epistemic:
  confidence: 1.0
  source_type: "documented_source"
context_anchor:
  duration: "universal"
---

# ADR-070: Master-Detail Navigation Shell

## Status
PROPOSED

## Context
The Zuri Platform's navigation was previously centered around a global Sidebar that housed every module and its respective sub-features. As the number of modules grew (Inbox, CRM, POS, Kitchen, etc.), the Sidebar became cluttered, leading to high cognitive load and "information overflow" for the user. Additionally, the Topbar was underutilized, mostly displaying a search bar and simple profile actions.

## Decision
We will transition to a **Master-Detail Navigation Shell** architecture:

1.  **Primary Navigation (Master) → Topbar**:
    *   **Branding:** Logo and Business Name move to the top-left for persistent identity.
    *   **Module Switcher:** A horizontal "Module Line" allows users to switch between high-level domains (e.g., POS to Kitchen).
    *   **Global Controls:** Search, Theme Toggle, Language Switcher (TH/EN), and Notifications reside here.
2.  **Secondary Navigation (Detail) → Sidebar**:
    *   **Contextual Focus:** The Sidebar now only displays sub-features belonging to the *currently active module*.
    *   **Local Actions:** Module-specific settings or quick-links are placed in the Sidebar footer.
    *   **Collapsible State:** Retains the glassmorphism aesthetic with hover-to-expand behavior for space efficiency.

## Rationale
-   **Reduced Cognitive Load:** Users only see navigation options relevant to their current task (e.g., when in POS, they aren't distracted by Kitchen Stock links).
-   **Scalability:** Adding new modules no longer risks overflowing the vertical Sidebar; the Topbar can handle more items via horizontal scrolling/overflow menus.
-   **Standardization:** Aligns with modern enterprise SaaS patterns (e.g., Salesforce, Jira) where global context stays at the top.

## Impact
-   **Components:** Logic in `Topbar.jsx` and `Sidebar.jsx` becomes tightly coupled to the routing/active-module state.
-   **UX:** One extra click might be needed if a user frequently jumps between distant sub-features of different modules, but navigation "deep dives" within a module become faster.
-   **Layout:** Frees up Sidebar real estate for module-specific sub-navigation labels, improving readability.

## Alternatives Considered
-   **Nested Sidebar Folders:** Keeping all modules in the sidebar but grouping them in folders. Rejected because it doesn't solve the vertical space limitation and keeps the UI dense.
-   **Tabbed Interface:** Using browser tabs for modules. Rejected due to state management complexity in a single-page application (Next.js).
