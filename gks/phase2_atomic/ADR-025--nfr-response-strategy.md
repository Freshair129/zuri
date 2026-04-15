---
id: "adr-025"
type: "adr"
module: "MOD--core"
status: "enforced"
owner: "@architect"
summary: "Standardize NFR1 strategy: Respond immediately with 200 OK and process logic asynchronously."
created_at: 2026-04-12
updated_at: 2026-04-14
created_by: "RWANG"
updated_by: "RWANG"
---
# ADR-025: NFR-1 Response Strategy

## Context
External messaging webhooks (FB, LINE) require a response within < 5s. Complex business logic (AI processing, DB persistence, outbound replies) often exceeds this time, leading to timeouts and duplicate deliveries.

## Decision
We adopted the **Asynchronous Worker Strategy (NFR1)**.

1. **Gate 1 (API Entry)**: Validate the incoming webhook signature and payload minimal structure.
2. **Gate 2 (Immediate Ack)**: Return `HTTP 200 OK` to the provider immediately.
3. **Queueing**: Dispatch the actual processing logic to **Upstash QStash** (Background Worker) with a `tenantId` header.
4. **Processing**: The worker executes the repository logic, triggers AI, and performs side effects.

## Consequences
- **Pros**: Zero-timeout reliability, resilience to traffic spikes, platform-mandated compliance.
- **Cons**: Distributed system complexity, tracking job status requires additional effort.
