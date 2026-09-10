# Module Map and Boundaries (Canonical)

**Status:** Canonical, live. Reconciled with implemented reality through T-004.
**Supersedes:** `docs/redesign/module-boundaries.md`.
**Companion:** `architecture.md`, `data-governance.md`, `research-context-contract.md`.

Feature modules live in `soft/apps/api/src/modules/<module>/`. Each module is
defined by responsibility, inputs, outputs, tables read, tables written, emitted
events, approval requirements, and failure behaviour. Table owners are defined
in `data-governance.md`.

> **Status note:** no business module is implemented yet. The table below marks
> the intended module set; only the host + data foundation exist today
> (`project-state.md`).

---

## 1. `control-plane` — Assistant Manager

- **Responsibility:** Task routing/orchestration (including task **scope**),
  execution tracking, activity (audit) log, initiating approval requests, and
  assembling the versioned **Research Context** (`ResearchContextService`). It
  is *thin*: it does not implement domain logic and does not own business tables.
- **Inputs:** `TaskRequest` (verb + subject ids + `scope` + payload ref); domain
  events; retry/cancel commands; `getResearchContext(opportunityId, version?)`
  and `startResearchRun(opportunityId, taskId)`.
- **Outputs:** `Task` (with `scope.targetMarketIds`, optional `country`/
  `industry`), `Execution`, `Activity`; routed job; approval-request reference;
  `ResearchContext` DTO; `research_contexts` snapshot.
- **Tables read:** all (read-only, via owning services or read models).
- **Tables written:** `tasks`, `executions`, `activities`, `research_contexts`
  (**owner**).
- **Emitted events:** `task.created`, `task.routed`, `execution.started`,
  `execution.succeeded`, `execution.partially_succeeded`, `execution.failed`,
  `execution.cancelled`, `activity.recorded`, `approval.requested`.
- **Approval:** requests approvals (delegating to `approvals`); never approves.
- **Failure:** routing failures produce a `FAILED` execution with a typed code;
  retryable routing errors are re-enqueued; the Task record is never lost.

---

## 2. `opportunities`

- **Responsibility:** Opportunity and TargetMarket lifecycle (create, update,
  status, archive); the opportunity workspace read model.
- **Inputs:** `CreateOpportunityInput`, `UpdateOpportunityInput`,
  `CreateTargetMarketInput`, `ApplyTargetMarketSuggestionInput`.
- **Outputs:** `Opportunity`, `TargetMarket`, `OpportunityWorkspace`.
- **Tables read:** `opportunities`, `target_markets`,
  `opportunity_target_markets`, `target_market_suggestions` (planned),
  `products`, `offers`.
- **Tables written:** `opportunities`, `target_markets`,
  `opportunity_target_markets` (**owner**); `target_market_suggestions`
  (planned, owner).
- **Emitted events:** `opportunity.created`, `opportunity.updated`,
  `opportunity.status_changed`, `target_market.created`, `target_market.updated`,
  `target_market_suggestion.applied`.
- **Approval:** suggestions are applied only through an accepted approval;
  direct target-market mutation is human-initiated and logged.
- **Failure:** validation errors reject the command; applying a suggestion is
  idempotent.

---

## 3. `products-and-offers`

- **Responsibility:** Product catalog, sellable **Offers**, and typed product
  facts. Product facts are authored by humans or trusted internal product-data
  sources only — **never by research modules**.
- **Implemented model (T-004):** `Product` ◀ `Offer` (concrete sellable form /
  variant) ◀ `Opportunity`; `ProductFact` belongs to exactly one Product or
  Offer. `status` ∈ `PENDING | CONFIRMED | SUPERSEDED`; `visibility` ∈
  `OPERATIONAL | RESTRICTED`.
- **Inputs:** product/offer CRUD; `EnterFactInput` (human), `IngestFactInput`
  (trusted source), `ConfirmFactInput`, `RestrictFactInput`.
- **Outputs:** `Product`, `Offer`, `ProductFact` (redacted per status/visibility).
- **Tables read/written:** `products`, `offers`, `product_facts` (**owner**);
  `fact_sources` (planned, evidence-owned).
- **Emitted events:** `product.created`, `product.updated`, `product.archived`,
  `offer.created`, `offer.updated`, `fact.entered`, `fact.ingested`,
  `fact.confirmed`, `fact.restricted`, `fact.superseded`.
- **Approval:** a fact moves `PENDING → CONFIRMED` only via an approved
  `approvals` request.
- **Failure:** uniqueness violations reject with a typed error; fact updates are
  append-only (planned versioning).
- **Deferred:** per-opportunity commercial terms (`opportunity_offers`) and
  append-only fact versioning.

---

## 4. `knowledge`

- **Responsibility:** Versioned sales knowledge: `CustomerProfile`,
  `BuyerPersona`, `ValueProposition`.
- **Inputs/outputs:** CRUD inputs; versioned entities with archive/restore.
- **Tables read/written (owner):** `customer_profiles`, `buyer_personas`,
  `value_propositions` (+ associations).
- **Events:** `knowledge.*.versioned`, `knowledge.*.archived`.
- **Approval:** none for CRUD; `ValueProposition` approved/forbidden claims are
  human-curated.
- **Failure:** concurrent updates raise a version conflict; no hard delete.

---

## 5. `evidence`

- **Responsibility:** Single owner of source references and claims. Validates
  claim types (FACT / INFERENCE / UNKNOWN), enforces citation/confidence rules,
  deduplicates sources by URL, exports the source register (CSV).
- **Inputs/outputs:** `RegisterSourceInput`, `PersistClaimInput`; entities +
  validation results + CSV register.
- **Tables read/written (owner):** `source_references`, `claims`, `claim_sources`,
  and all source-join tables.
- **Events:** `evidence.source_registered`, `evidence.claim_persisted`,
  `evidence.claim_rejected`.
- **Approval:** none (mechanical validation).
- **Failure:** a FACT claim without a source is rejected; an UNKNOWN claim
  carrying a price is rejected; partial source failures are recorded without
  losing valid claims.

---

## 6. `research-records`

- **Responsibility:** The **single write-owner** of `research_records` and
  `research_findings`. Research modules call this service with a `type`
  discriminator (MARKET / COMPANY / CONTACT / COMPETITOR / IMPORT_EXPORT).
- **Inputs/outputs:** `CreateResearchRecordInput`, `UpdateResearchRecordInput`,
  `GetResearchRecordsInput`; `ResearchRecord`, `ResearchFinding`, query service.
- **Tables read/written (owner):** `research_records`, `research_findings`;
  `research_record_sources` via `evidence`.
- **Events:** `research_record.created`, `research_record.updated`.
- **Approval:** none — records are evidence, not business-state mutations.
- **Failure:** invalid `type` / missing scope rejected; findings validated for
  `evidenceStatus`.

---

## 7. `market-researcher`

- **Responsibility:** Market research per target market → sourced findings +
  target-market suggestions + clarification requests. Never mutates business
  data; never authors product facts. A **context consumer**: sees only `taskId`
  + `opportunityId` and reads the frozen `ResearchContext`.
- **Inputs:** `taskId`, `opportunityId` (nothing else). Scope resolved from the
  `Task`; manifest/budgets from the `research_runs` record.
- **Outputs:** `MarketResearchOutput` (observations, suggestions, competitors,
  import/export findings, risks, sources, unknowns, limitations).
- **Tables read/written:** reads context/tasks/markets/facts/knowledge via
  owning services; writes `research_runs` (**owner**) and
  `research_run_target_markets` (**owner**), suggestions via `opportunities`,
  records/findings via `research-records`, claims/sources via `evidence`.
- **Events:** `market_research.completed`, `target_market_suggestion.created`,
  `clarification_request.created`.
- **Approval:** suggestions stay `PENDING` until a human accepts/rejects.
- **Failure:** partial results (`PARTIALLY_SUCCEEDED`); budgets/stop conditions
  enforced; retry only temporary fetch failures.
- **Fact rule:** only CONFIRMED facts asserted; PENDING/RESTRICTED surfaced as
  unknowns; SUPERSEDED absent.

---

## 8–11. Discovery and intelligence

- **`lead-discoverer`** — company discovery + dedup. Writes `companies`,
  `opportunity_companies` (owner); sources/claims via `evidence`. Approval:
  company acceptance human-gated where configured.
- **`lead-evaluator`** — qualification/scoring → versioned
  `qualification_records` (owner); updates `opportunity_companies` status.
  Produces a human-reviewable verdict, not a commitment.
- **`company-intelligence`** — deep company research → sourced profile; writes
  claims/sources via `evidence` and records via `research-records`.
- **`contact-discovery`** — contact discovery + email-pattern inference; writes
  `contacts` (owner) + sources/claims via `evidence`; never fabricates email.

## 12. `inbox-intelligence`

Reserved, post-MVP; inert in MVP. Future owner of `inbox_items`.

## 13. `outreach-drafter`

Evidence-based drafts with full traceability. Writes `outreach_drafts` (**owner**)
and join tables. **Never sends**: a draft cannot be sent without human approval.

## 14. `approvals`

The approval workflow engine: create requests, capture accept/reject, apply
accepted mutations by invoking the owning module's service. Writes
`approval_requests`, `decision_records` (**owner**). Accept/reject is idempotent;
every decision is a decision record (no chain-of-thought).

## 15. `jobs`

BullMQ queue/worker wiring, job lifecycle, retries, idempotency, progress,
DLQ. Reads `tasks`/`executions`; writes job-status fields (coordinated with
control-plane) and `job_logs`. The future worker is `soft/apps/worker`.

---

## 16. Interaction Matrix (who calls whom, in-process)

| Caller ↓ / Callee → | control-plane | opportunities | products-and-offers | knowledge | evidence | research-records | market-researcher | lead-discoverer | lead-evaluator | company-intelligence | contact-discovery | inbox-intelligence | outreach-drafter | approvals | jobs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| control-plane | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| market-researcher | events | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — |
| lead-discoverer | events | ✓ | — | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| lead-evaluator | events | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — |
| company-intelligence | events | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — | — |
| contact-discovery | events | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | ✓ | — |
| outreach-drafter | events | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — |
| approvals | events | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |

Legend: `✓` = calls the owning module's application service; `events` = emits an
event the module may subscribe to; `—` = no direct dependency.

**Key rule:** any cross-module arrow goes through a **service**, never a shared
table write. Table writes remain single-owner (`data-governance.md`).
`research_records`/`research_findings` have exactly one write-owner
(`research-records`).
