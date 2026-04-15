---
id: "adr-033"
type: "adr"
module: "MOD--crm"
status: "enforced"
owner: "@architect"
summary: "Standardize Phone-First Identity Resolution for multi-platform customer deduplication."
created_at: 2026-04-12
updated_at: 2026-04-14
created_by: "RWANG"
updated_by: "RWANG"
---
# ADR-033: Identity Resolution (Phone-First)

## Context
Customers interact with Zuri via LINE, FB Messenger, and In-person. Without a unified identity strategy, we end up with fragmented data silos and a broken CRM experience.

## Decision
We adopted the **Phone Number (E.164) as the Primary Anchor** for Identity Resolution.

1. **Hierarchy**:
   - **Phone**: Superior anchor.
   - **Platform ID**: Subordinate identifiers (FB ID, LINE ID).
2. **Resolution Logic**:
   - When a platform ID is received, normalize any attached phone number.
   - Query for an existing customer record matching the phone within the tenant.
   - If found, "Bind" the platform ID to the existing record.
   - If not found, create a new record.
3. **Merging**: Manual merge is allowed via `/api/customers/merge` for edge cases where automated resolution fails.

## Consequences
- **Pros**: Unified Customer 360 view, high-precision lead tracking, marketing consistency.
- **Cons**: Requires phone number capture (Lead Magnets) to be effective for cross-platform linking.
