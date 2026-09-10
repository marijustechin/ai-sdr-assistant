# Module Boundaries

> **Canonical source:** the module map and boundaries live at the repository root
> in [`docs/system/module-map.md`](../../docs/system/module-map.md). This file is
> the implementation-local view; the root canonical document wins on conflict.

**Status:** Implementation view. No business module code written.
**Companion:** `data-ownership.md` (tables), `task-execution.md` (runtime), `architecture.md` (overview).

Each module is defined by: **responsibility, inputs, outputs, tables read, tables written, emitted events, approval requirements, failure behaviour.** Table names use the canonical list defined in `data-ownership.md`.

---

## 1. `control-plane` — Assistant Manager

- **Responsibility:** Task routing and orchestration (including task **scope**), execution tracking, activity (audit) log, initiating approval requests, and assembling the versioned **Research Context** (`ResearchContextService`). It is a *thin* coordinator — it does not implement domain logic and does not own business tables.
- **Inputs:** a `TaskRequest` (verb + subject ids + `scope` + payload ref); domain events from other modules; retry/cancel commands; `getResearchContext(opportunityId, version?)` / `startResearchRun(opportunityId, taskId)` calls.
- **Outputs:** `Task` (with `scope.targetMarketIds`, optional `country`/`industry`), `Execution`, `Activity` records; routed job; approval-request reference; `ResearchContext` DTO; `research_contexts` snapshot.
- **Tables read:** all (read-only, via owning services or read models).
- **Tables written:** `tasks`, `executions`, `activities` (owner), `research_contexts` (owner).
- **Emitted events:** `task.created`, `task.routed`, `execution.started`, `execution.succeeded`, `execution.partially_succeeded`, `execution.failed`, `execution.cancelled`, `activity.recorded`, `approval.requested`.
- **Approval requirements:** none for routing; it *requests* approvals (delegating to `approvals`), it does not approve.
- **Failure behaviour:** routing failures produce a `FAILED` execution with a typed error code; retryable routing errors are re-enqueued; it never loses the Task record.

---

## 2. `opportunities`

- **Responsibility:** Opportunity and TargetMarket lifecycle (create, update, status, archive); the opportunity workspace read model.
- **Inputs:** `CreateOpportunityInput`, `UpdateOpportunityInput`, `CreateTargetMarketInput`, `ApplyTargetMarketSuggestionInput`.
- **Outputs:** `Opportunity`, `TargetMarket`, `OpportunityWorkspace` (opportunity + offer + product + target markets).
- **Tables read:** `opportunities`, `target_markets`, `target_market_suggestions`, `products`, `opportunity_offers`, knowledge-association tables.
- **Tables written:** `opportunities`, `target_markets`, `target_market_suggestions` (create + resolve status), opportunity↔knowledge association tables.
- **Emitted events:** `opportunity.created`, `opportunity.updated`, `opportunity.status_changed`, `target_market.created`, `target_market.updated`, `target_market_suggestion.applied`.
- **Approval requirements:** suggestions are applied only through an accepted approval (see `approvals`); direct mutation of a target market is human-initiated and logged.
- **Failure behaviour:** validation errors reject the command; applying a suggestion is idempotent (re-applying an accepted suggestion is a no-op).

---

## 3. `products-and-offers`

- **Responsibility:** Product catalog, per-opportunity commercial terms (`OpportunityOffer`), and the **versioned, typed product facts** (`CONFIRMED` / `PENDING` / `RESTRICTED` / `SUPERSEDED`). Product facts are authored by humans or trusted internal product-data sources only — **never by research modules**.
- **Inputs:** `CreateProductInput`, `UpdateProductInput`, `CreateOpportunityOfferInput`, `UpdateOpportunityOfferInput`, `EnterFactInput` (human), `IngestFactInput` (trusted source), `ConfirmFactInput`, `RestrictFactInput`.
- **Outputs:** `Product`, `OpportunityOffer`, `Fact` (typed/versioned, redacted per status).
- **Tables read:** `products`, `opportunity_offers`, `product_facts`, `fact_sources`.
- **Tables written:** `products`, `opportunity_offers`, `product_facts`, `fact_sources`.
- **Emitted events:** `product.created`, `product.updated`, `product.archived`, `offer.created`, `offer.updated`, `fact.entered`, `fact.ingested`, `fact.confirmed`, `fact.restricted`, `fact.superseded`.
- **Approval requirements:** a fact moves from PENDING → CONFIRMED only via an approved `approvals` request (see `contracts/research-context.v1.md` §10).
- **Failure behaviour:** uniqueness violations (one offer per opportunity) reject with a typed error; fact updates are append-only (new version supersedes the old).

---

## 4. `knowledge`

- **Responsibility:** Versioned sales knowledge: `CustomerProfile`, `BuyerPersona`, `ValueProposition`.
- **Inputs:** CRUD inputs for each entity; version-on-update semantics.
- **Outputs:** the entities with version numbers; archive/restore states.
- **Tables read:** `customer_profiles`, `buyer_personas`, `value_propositions` (+ associations).
- **Tables written:** `customer_profiles`, `buyer_personas`, `value_propositions` (+ associations).
- **Emitted events:** `knowledge.customer_profile.versioned`, `knowledge.buyer_persona.versioned`, `knowledge.value_proposition.versioned`, `knowledge.*.archived`.
- **Approval requirements:** none for CRUD; `ValueProposition.approvedClaims`/`forbiddenClaims` are human-curated.
- **Failure behaviour:** concurrent updates raise a version conflict; hard delete is not exposed (archive/restore only).

---

## 5. `evidence`

- **Responsibility:** Single owner of source references and claims. Validates claim types (FACT / INFERENCE / UNKNOWN), enforces citation and confidence rules, deduplicates sources by URL, and exports the source register (CSV).
- **Inputs:** `RegisterSourceInput`, `PersistClaimInput`, `ClaimValidationInput`.
- **Outputs:** `SourceReference`, `Claim`, validation results, CSV register.
- **Tables read:** `source_references`, `claims`, source-join tables.
- **Tables written:** `source_references`, `claims`, `claim_sources`, and all source-join tables (`company_sources`, `contact_sources`, `research_record_sources`, `outreach_draft_sources`).
- **Emitted events:** `evidence.source_registered`, `evidence.claim_persisted`, `evidence.claim_rejected`.
- **Approval requirements:** none (mechanical validation only).
- **Failure behaviour:** a FACT claim without a source is rejected; an UNKNOWN claim carrying a price is rejected; partial source failures are recorded without losing valid claims.

> The operating rules (source policy, claim schema, price normalisation, non-comparable treatment, fixtures) are defined in `../legacy/docs/market-research-harness.md` (historical input) and remain the contract for this module until re-promoted into `soft/docs/`.

---

## 6. `research-records`

- **Responsibility:** The **single write-owner** of `research_records` and `research_findings`. Research modules (market-researcher, company-intelligence, contact-discovery) do not write these tables directly — they call this module's service with a `type` discriminator.
- **Inputs:** `CreateResearchRecordInput` (opportunityId, companyId?, contactId?, type, summary, findings), `UpdateResearchRecordInput`, `GetResearchRecordsInput` (filters: opportunityId, companyId, contactId, type).
- **Outputs:** `ResearchRecord`, `ResearchFinding`; query/read model for research records (used by the Research Context assembler and outreach-drafter).
- **Tables read:** `research_records`, `research_findings`, `research_record_sources`.
- **Tables written:** `research_records`, `research_findings` (owner); `research_record_sources` via `evidence`.
- **Emitted events:** `research_record.created`, `research_record.updated`.
- **Approval requirements:** none — records are evidence, not mutations of business state.
- **Failure behaviour:** invalid `type` is rejected; a record without required scope fields is rejected; findings are validated for `evidenceStatus` (VERIFIED / USER_PROVIDED / INFERRED / UNVERIFIED).

---

## 7. `market-researcher`

- **Responsibility:** Market research per target market → sourced findings + target-market suggestions + clarification requests. Produces suggestions; never mutates data; never authors product facts. It is a **context consumer**: it receives only `taskId` + `opportunityId` and reads the frozen `ResearchContext` (see `contracts/research-context.v1.md`).
- **Inputs:** `taskId`, `opportunityId` (nothing else — no product descriptions or files). It resolves its **scope** (`targetMarketIds`, optional `country`/`industry`) from the `Task`, and the run manifest/budgets from the `research_runs` record.
- **Outputs:** `MarketResearchOutput` (observations, suggestions, competitors, import/export findings, risks, sources, unknowns, limitations).
- **Tables read:** `research_contexts` (via `control-plane`), `tasks` (scope), `opportunities`, `target_markets`, `product_facts` (via `products-and-offers`), `knowledge.*` (via `knowledge`), `research_runs` (own).
- **Tables written:** `research_runs` (owner), `target_market_suggestions` (PENDING, via `opportunities`), `clarification_requests` (owner); `research_records`/`research_findings` (via `research-records`), `claims` + `source_references` (via `evidence`).
- **Emitted events:** `market_research.completed`, `target_market_suggestion.created`, `clarification_request.created`.
- **Approval requirements:** suggestions are `PENDING` until a human accepts/rejects via `approvals`; nothing auto-applies.
- **Failure behaviour:** partial results (`PARTIALLY_SUCCEEDED`) when some sources fail; stop conditions and budgets enforced from the run manifest; retry temporary fetch failures only.
- **Fact usage rule:** only CONFIRMED facts may be asserted; PENDING and RESTRICTED facts are surfaced as unknowns; SUPERSEDED facts never appear in the context. Product facts are never proposed by this module — it files clarification requests instead.

---

## 8. `lead-discoverer`

- **Responsibility:** Company discovery and deduplication (domain normalisation + unique constraints).
- **Inputs:** `CompanyDiscoveryInput` (opportunityId, targetMarketId, limit, search queries).
- **Outputs:** `CompanyDiscoveryOutput` (discovered companies, queries, sources).
- **Tables read:** `opportunities`, `target_markets`, `customer_profiles` (for fit pre-filter), `companies` (dedup).
- **Tables written:** `companies`, `opportunity_companies` (status=PENDING/DISCOVERED), `company_sources` (via `evidence`), `claims` (via `evidence`).
- **Emitted events:** `company.discovered`, `company_discovery.completed`.
- **Approval requirements:** company acceptance/rejection is human-gated where configured (via `approvals`); discovery itself is not.
- **Failure behaviour:** partial discovery stores valid companies and marks failed pages/engines; dedup prevents duplicates; idempotent re-runs use the unique constraint.

---

## 9. `lead-evaluator`

- **Responsibility:** Qualification/scoring → versioned `QualificationRecord`, referencing the customer-profile version used.
- **Inputs:** `CompanyQualificationInput` (opportunityId, companyId, customerProfileId/version).
- **Outputs:** `QualificationRecord` (fit score, verdict HIGH/MEDIUM/LOW/INCONCLUSIVE, matched criteria, missing info, concerns, sources).
- **Tables read:** `opportunity_companies`, `companies`, `customer_profiles` (versioned), `claims`/`source_references` (via `evidence`).
- **Tables written:** `qualification_records`; updates `opportunity_companies.latest_qualification_id` and status.
- **Emitted events:** `company.qualified`, `company.qualification_inconclusive`.
- **Approval requirements:** none — produces a human-reviewable verdict; the score is not a commercial commitment.
- **Failure behaviour:** low-information companies yield `INCONCLUSIVE` (not a fake precise score); timeouts are marked incomplete and retryable.

---

## 10. `company-intelligence`

- **Responsibility:** Deep company research → reusable sourced company profile.
- **Inputs:** `CompanyResearchInput` (opportunityId, companyId).
- **Outputs:** `CompanyResearchOutput` (summary, activities, fit, possible needs, objections, conversation starters, unknowns, sources).
- **Tables read:** `companies`, `opportunity_companies`, `qualification_records`, `research_records` (via `research-records`), `evidence`.
- **Tables written:** `claims` + `source_references` (via `evidence`); `research_records`/`research_findings` (type=COMPANY, via `research-records`).
- **Emitted events:** `company.researched`.
- **Approval requirements:** none; needs/objections are hypotheses (INFERENCE), not facts.
- **Failure behaviour:** a failed news/section fetch marks that section unavailable but stores the rest of the profile.

---

## 11. `contact-discovery`

- **Responsibility:** Contact discovery and email-pattern inference.
- **Inputs:** `ContactDiscoveryInput` (opportunityId, companyId, buyerPersonaIds).
- **Outputs:** `ContactDiscoveryOutput` (candidates, email patterns, unresolved roles, sources).
- **Tables read:** `companies`, `buyer_personas`, `research_records` (via `research-records`), `evidence`.
- **Tables written:** `contacts`, `contact_sources` (via `evidence`), `claims` (via `evidence`); `research_records`/`research_findings` (type=CONTACT, via `research-records`).
- **Emitted events:** `contact.found`.
- **Approval requirements:** contact acceptance is human-gated where configured (via `approvals`).
- **Failure behaviour:** unverifiable email is stored as `UNKNOWN`/`GUESSED`; never fabricate an email.

---

## 12. `inbox-intelligence`

- **Responsibility:** Inbox ingestion and reply analysis (reserved; post-MVP). In MVP it is inert.
- **Inputs:** `IngestMessageInput`, `AnalyzeReplyInput` (future).
- **Outputs:** `InboxItem`, reply summary (future).
- **Tables read:** `contacts`, `companies`, `opportunities` (future).
- **Tables written:** `inbox_items` (future), linkage to `contacts`/`opportunities` (future).
- **Emitted events:** `message.received`, `reply.analyzed` (future).
- **Approval requirements:** none (read-only analysis); any suggested follow-up is human-gated.
- **Failure behaviour:** parse failures are quarantined, not dropped.

---

## 13. `outreach-drafter`

- **Responsibility:** Evidence-based outreach drafts with full traceability to research, sources, and knowledge versions.
- **Inputs:** `CreateOutreachDraftInput` (opportunityId, companyId, contactId, channel).
- **Outputs:** `OutreachDraftOutput` (subject, body, CTA, personalization facts, supporting sources, warnings).
- **Tables read:** opportunity workspace, `companies`, `contacts`, `qualification_records`, `research_records` (via `research-records`), `knowledge.*`, `evidence`.
- **Tables written:** `outreach_drafts`, `outreach_draft_sources` + `outreach_draft_research` (join tables), via `evidence` for sources.
- **Emitted events:** `outreach.draft_created`, `outreach.draft_ready_for_review`.
- **Approval requirements:** a draft **cannot be sent** without human approval (via `approvals`); personalization must cite real sources.
- **Failure behaviour:** regeneration is idempotent; never invent personalization; record which knowledge versions were used.

---

## 14. `approvals`

- **Responsibility:** The approval workflow engine: create requests, capture accept/reject, and apply accepted mutations by invoking the owning module's service.
- **Inputs:** `CreateApprovalRequestInput`, `ApproveInput`, `RejectInput`.
- **Outputs:** `ApprovalRequest` state; applied mutation result; decision record.
- **Tables read:** `approval_requests`, `decision_records`; target objects (via owning services).
- **Tables written:** `approval_requests`, `decision_records` (owner); triggers writes in other tables only via owning modules' services.
- **Emitted events:** `approval.requested`, `approval.approved`, `approval.rejected`, `decision.recorded`.
- **Approval requirements:** this module *is* the approval mechanism; it enforces the human gate.
- **Failure behaviour:** accept/reject is idempotent (double-accept is a no-op); every decision is logged with reasoning, source ids, reviewer and timestamp.

---

## 15. `jobs`

- **Responsibility:** BullMQ queue/worker wiring, job lifecycle, retry policies, idempotency, progress.
- **Inputs:** enqueue commands; job state transitions.
- **Outputs:** job state, progress, DLQ handling.
- **Tables read:** `tasks`, `executions`.
- **Tables written:** `tasks`/`executions` job-status fields (coordinated with `control-plane`), job logs.
- **Emitted events:** `job.enqueued`, `job.started`, `job.completed`, `job.failed`, `job.retried`.
- **Approval requirements:** none.
- **Failure behaviour:** selective retries (429/5xx/timeout), no retry on permanent failures, idempotent job keys, dead-letter queue for poison messages.

---

## 16. Module Interaction Matrix (who calls whom, in-process)

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

Legend: `✓` = calls the module's application service; `events` = emits an event the module may subscribe to; `—` = no direct dependency.

**Key rule:** any arrow crosses a boundary through a **service**, never through a shared table write. Table writes remain single-owner (see `data-ownership.md`). `research_records`/`research_findings` have exactly one write-owner (`research-records`).
