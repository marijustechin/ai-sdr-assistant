# Task and Execution Model

> **Canonical source:** the runtime model and module boundaries live at the
> repository root in [`docs/system/architecture.md`](../../docs/system/architecture.md)
> §7 and [`docs/system/module-map.md`](../../docs/system/module-map.md). This
> file is the implementation-local view; the root canonical documents win on
> conflict.

**Status:** Implementation view. No code written.
**Companion:** `architecture.md`, `module-boundaries.md`, `data-ownership.md`.

This document defines how work is requested, routed, executed, tracked, retried and audited — and how human approval gates sit on top of it.

---

## 1. Core Concepts

| Concept | Table | Owner | Meaning |
|---|---|---|---|
| **Task** | `tasks` | `control-plane` | A requested unit of business work (e.g. "research market for target-market X"). Long-lived intent. |
| **Execution** | `executions` | `control-plane` | One technical run of a task. Holds provider calls, metrics, errors, status. |
| **Activity** | `activities` | `control-plane` | User-visible business audit events. |
| **Job** | BullMQ + `job_logs` | `jobs` | The asynchronous transport that actually performs a task. |
| **Approval Request** | `approval_requests` | `approvals` | A human decision gate attached to a mutation. |

Separation: a `Task` is *what* was asked; an `Execution` is *how the system ran it*; an `Activity` is *what happened for the user*; an `ApprovalRequest` is *what a human must decide*.

---

## 2. Task Lifecycle

```text
                    ┌──────────────┐
   Request ────────▶│  CREATED     │
                    └──────┬───────┘
                           │ route (control-plane → jobs)
                    ┌──────▼───────┐
                    │  QUEUED      │
                    └──────┬───────┘
                           │ worker picks up
                    ┌──────▼───────┐
                    │  RUNNING     │
                    └──────┬───────┘
              ┌────────────┼──────────────┐
              │            │              │
        ┌─────▼─────┐ ┌────▼─────┐ ┌──────▼──────┐
        │ SUCCEEDED │ │ PARTIAL  │ │   FAILED    │──retryable──▶ QUEUED
        └───────────┘ └──────────┘ └─────────────┘
        ┌──────────┐
        │ CANCELLED│ (human or system)
        └──────────┘
```

Statuses:

```text
CREATED → QUEUED → RUNNING → SUCCEEDED
                           → PARTIALLY_SUCCEEDED
                           → FAILED   (retryable | terminal)
                           → CANCELLED
```

`PARTIALLY_SUCCEEDED` is a **first-class** outcome: some items stored, some failed. It is not a failure.

---

## 3. Execution Record Shape

```text
Execution {
  id, taskId, opportunityId?,
  operation: string,          // e.g. "market-research", "company-discovery"
  status: TaskStatus,
  providerCalls: ProviderCall[],   // provider, model, tokens, cost, duration, status
  metrics: { sourceCount, pageFetchCount, pageFetchFailures, totalDurationMs },
  errors: ExecutionError[],        // code, message, provider, itemId, retryable
  startedAt, completedAt,
}
```

Rules:

- The `Execution` is written by `control-plane`, but populated from data reported by the worker's module service. The module reports; `control-plane` persists. (Alternatively, the module writes via `control-plane.recordExecution(...)`; the write-owner remains `control-plane`.)
- No chain-of-thought or model reasoning is stored. Store evidence, decisions, inputs, outputs, and limitations.

---

## 4. Error Codes and Retry Policy

| Condition | Retryable? | Behaviour |
|---|---|---|
| HTTP 429 / rate limit | Yes | Retry with backoff (bounded attempts) |
| Temporary 5xx | Yes | Retry with backoff |
| LLM timeout | Yes | Retry (bounded) |
| LLM invalid structured output | Yes | Re-run schema-validated generation (bounded) |
| Permanent 404 / link rot | No | Record as `LINK_ROT`, continue |
| Scraping blocked (403/bot) | No | Record as `BLOCKED`, do not hammer |
| Search quota exhausted | No | `SEARCH_QUOTA_EXHAUSTED`, partial result |
| Validation failure (domain) | No | Reject, surface to user |

- Retries are **selective**, never blanket.
- Already-stored successful items are **never discarded** on a later failure.
- Idempotency: re-running a task updates/append instead of duplicating; unique constraints (`company.domain`, `opportunity_offers.opportunity_id`, `opportunity_companies(opportunity_id, company_id)`, etc.) are the safety net.

---

## 5. Jobs (BullMQ) and the Worker

- **Queues** (proposed): `research`, `company-discovery`, `qualification`, `contact-discovery`, `outreach`, `inbox` (future).
- **Job data** carries a stable `jobKey` for idempotency, `taskId`, `opportunityId`, and a typed payload matching the module's input contract. For research modules, the payload is **only** `taskId` + `opportunityId`; scope is resolved from the `Task`, never passed in the job payload.
- The **worker process** is a separate process (`apps/worker`) that imports the **same** module application services and `packages/database`. It never speaks HTTP to `apps/api`.
- The worker reports progress/status back to `control-plane` by persisting to `executions`/`tasks` (via the shared Prisma package) and emitting events.
- **Dead-letter queue** captures poison messages after retries are exhausted; humans can inspect and re-drive.

For the **first slice**, jobs may be executed **synchronously in-process** (the module service called directly); the BullMQ worker is introduced when a genuinely long-running operation justifies it. The module service boundary must not change when the worker is added.

---

## 6. Events (in-process bus → optional external bus later)

Event vocabulary (producers defined in `module-boundaries.md`):

```text
task.created, task.routed
execution.started, execution.succeeded, execution.partially_succeeded,
execution.failed, execution.cancelled
activity.recorded
opportunity.created, opportunity.updated, opportunity.status_changed
target_market.created, target_market.updated, target_market_suggestion.applied
product.created, product.updated, product.archived
offer.created, offer.updated
fact.entered, fact.ingested, fact.confirmed, fact.restricted, fact.superseded
knowledge.*.versioned, knowledge.*.archived
evidence.source_registered, evidence.claim_persisted, evidence.claim_rejected
research_record.created, research_record.updated
market_research.completed, target_market_suggestion.created, clarification_request.created
company.discovered, company_discovery.completed
company.qualified, company.qualification_inconclusive
company.researched
contact.found
message.received, reply.analyzed            (future)
outreach.draft_created, outreach.draft_ready_for_review
approval.requested, approval.approved, approval.rejected, decision.recorded
job.enqueued, job.started, job.completed, job.failed, job.retried
```

- Events are **typed** (defined in `packages/contracts`).
- The bus starts as an in-process pub/sub; a durable transport can be introduced later without changing module contracts.
- Events are the only mechanism by which a module reacts to another module's outcome asynchronously.

---

## 7. Human Approval Gates

Approval is a **product feature**, not a temporary limitation. The `approvals` module owns the mechanism; `control-plane` routes requests; the human decides.

```text
module produces a gated mutation
        ↓
approvals.createRequest(subject, proposedMutation, sourceIds, reason)
        ↓
approval_request: PENDING
        ↓
human approve / reject  (via REST or CLI)
        ↓
approve → approvals invokes owning module's apply() → mutation applied
       → control-plane records activity
reject → recorded with reason; no mutation
```

Mandatory gates (from the architecture principles):

1. target-market changes (accept a suggestion);
2. company / contact acceptance where configured;
3. outreach sending;
4. any commercial commitment.

Rules:

- A suggestion, draft, or commercial change **never** auto-applies on creation.
- Accept/reject is **idempotent** (double-accept is a no-op).
- Every decision is a **decision record** (decision text, source ids, reason, reviewer, timestamp) — no chain-of-thought, but full provenance.

---

## 8. End-to-End Example: Market Research

```text
1. Human: "research market for opportunity O, target markets [tm_1]"
        (REST: POST /opportunities/O/research-runs  { taskId, budgets? })
2. control-plane: creates Task{operation: market-research, scope:{targetMarketIds:["tm_1"]}}
3. control-plane: freezes ResearchContext (research_contexts version N, schemaVersion research_context_v1)
4. jobs: enqueue { jobKey, taskId, opportunityId }     # NOTHING else — no product data, no scope payload
5. worker: market-researcher.run(taskId, opportunityId)
     - scope = task.scope                              # resolved from Task, not a prompt
     - ctx = researchContextService.getContext(opportunityId, N)   # DI in-process, or REST as worker
     - asserts CONFIRMED facts only; PENDING/RESTRICTED → unknowns; SUPERSEDED absent
     - evidence.registerSource(...) per retrieved source
     - evidence.persistClaim(...) per claim (FACT/INFERENCE/UNKNOWN validated)
     - research-records.createRecord({type: MARKET, ...}) + addFinding(...)
     - opportunities.createSuggestion(...) → PENDING suggestions
     - market-researcher.createClarificationRequest(...) for product-data gaps  # never proposes facts
     - reports progress to control-plane
6. worker returns MarketResearchOutput
7. control-plane: execution.status = SUCCEEDED | PARTIALLY_SUCCEEDED; records activities
8. control-plane: approvals.createRequest(...) for PENDING suggestions
9. human approves/rejects suggestions
10. approvals.apply → opportunities.applySuggestion(...)
11. clarification requests are surfaced to a human, who enters/confirms product facts
    (human → products-and-offers.enterFact → approvals → confirmFact)          # researcher never in this path
12. control-plane records activities + decision records
```

---

## 9. Observability and Cost Control

- Per-execution metrics (provider calls, tokens, cost, fetches, duration) are persisted by `control-plane`.
- Budgets are defined in each run manifest (see the market-research harness in `../legacy/docs/market-research-harness.md`, historical input) and enforced by the module.
- Limits: companies per run, pages per company, LLM requests per operation, max tokens, retry count, daily search quota.
- Admin/audit visibility is via `executions` and `job_logs`; the user timeline shows `activities` only.
