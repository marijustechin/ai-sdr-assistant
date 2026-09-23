# Data Governance and Ownership (Canonical)

**Status:** Canonical, live. Reconciled with implemented reality through T-004.
**Supersedes:** `docs/redesign/data-ownership.md`.
**Companion:** `architecture.md`, `module-map.md`, `research-context-contract.md`;
implementation view: `soft/docs/data-model.md`, `soft/docs/data-ownership.md`.

> **PostgreSQL is the single source of live business state.** This document
> defines table ownership and write rules. It never lists live values; values
> live only in the database.

---

## 1. Ownership Principles

1. **One write-owner per table.** Exactly one module may write a given table
   (through its own services). Other modules read it or ask the owner to mutate.
2. **Reads are permissioned.** Read access is declared per module and granted
   through the owner's exported query/read-model service, or `control-plane` read
   models for cross-cutting reporting. No module does free-form `SELECT *`.
3. **Cross-boundary mutation = service call.** Module A asks module B's
   application service; B validates, writes, and emits an event. A never opens a
   write transaction on B's tables.
4. **The Assistant Manager owns no business tables.** It owns routing/audit
   tables only.
5. **Schema and migrations are owned by `soft/packages/database`** — one schema,
   one migration chain, one owner. Each model carries a `/// @owner <module>`
   tag.
6. **Composition modules own no tables.** The `dashboard` admin summary
   aggregates through owner services (e.g. `products-and-offers`,
   `market-researcher`, `lead-discoverer`, `outreach-drafter`) and is never a
   table owner; it does not widen any read permission beyond the owner's exported
   service.

---

## 2. Canonical Tables and Write Owners

Status: **impl** = implemented (T-004); **plan** = planned.

| Table | Purpose | Write owner | Status |
|---|---|---|---|
| `tasks` | A requested unit of work | `control-plane` | plan |
| `executions` | Technical run of a task | `control-plane` | plan |
| `activities` | User-visible business audit events | `control-plane` | plan |
| `research_contexts` | Frozen, versioned Research Context snapshot | `control-plane` | plan |
| `approval_requests` | Human approval requests + decisions | `approvals` | plan |
| `decision_records` | Accepted/rejected decisions with reasoning + sources | `approvals` | plan |
| `opportunities` | The commercial work unit | `opportunities` | impl |
| `target_markets` | Country/region + market segment | `opportunities` | impl |
| `opportunity_target_markets` | Opportunity↔target-market join (compound-unique) | `opportunities` | impl |
| `target_market_suggestions` | Research-driven suggestions (PENDING→ACCEPTED/REJECTED) | `opportunities` | plan |
| `products` | Canonical product identity / catalog | `products-and-offers` | impl |
| `offers` | Concrete sellable product form (variant) of one product | `products-and-offers` | impl |
| `product_facts` | Typed facts (PENDING/CONFIRMED/SUPERSEDED; OPERATIONAL/RESTRICTED) | `products-and-offers` | impl |
| `opportunity_offers` | Per-opportunity commercial terms (1:1) | `products-and-offers` | plan |
| `fact_sources` | Fact↔source join | `evidence` | plan |
| `clarification_requests` | Product-data questions filed by research modules | `market-researcher` | plan |
| `companies` | Potential buyer organisations (minimal identity; deterministic dedup) | `lead-discoverer` | impl |
| `opportunity_companies` | Opportunity-scoped candidate buyer: evidence provenance + observed facts vs buyer-fit hypothesis + operator review (`UNREVIEWED \| SHORTLISTED \| REJECTED`, optional reason); idempotent per opportunity | `lead-discoverer` | impl |
| `contacts` | Public business contacts for a company (general email/phone/contact-page URL or a named person with a published title); original values plus normalized columns for dedup; usability and published-vs-deliverability state; no research-run coupling | `contact-discovery` | impl |
| `qualification_records` | Versioned qualification results | `lead-evaluator` | plan |
| `research_runs` | A market-research run bound to a context version (lifecycle + pause + checkpoint) | `market-researcher` | impl |
| `research_run_target_markets` | ResearchRun↔target-market scope join | `market-researcher` | impl |
| `research_queries` | Discovery/search queries issued during a research run | `market-researcher` | impl |
| `research_records` | Structured research (MARKET/COMPANY/CONTACT/COMPETITOR/IMPORT_EXPORT) | `research-records` | plan |
| `research_findings` | Findings within a research record | `research-records` | plan |
| `source_references` | Retrieved sources (url, publisher, type; deduplicated by URL) | `evidence` | impl |
| `evidence` | Factual observations extracted from a source during a run | `evidence` | impl |
| `claims` | Typed claims (FACT/INFERENCE/UNKNOWN) with confidence | `evidence` | impl |
| `claim_evidence` | Claim↔evidence join with stance (refines the earlier `claim_sources`) | `evidence` | impl |
| `research_offerings` | Structured, evidence-linked company offerings (provenance + idempotent fingerprint); verbatim `price_text` plus an optional explicit `price_amount_numeric` (never parsed from prose, never converted) | `evidence` | impl |
| `company_sources` | Company↔source join | `evidence` | plan |
| `contact_sources` | Contact↔source provenance (source reference deduplicated by URL + retrieval date + supporting excerpt); one contact may have many sources | `contact-discovery` | impl |
| `research_record_sources` | ResearchRecord↔source join | `evidence` | plan |
| `outreach_draft_sources` | Draft↔source join | `evidence` | plan |
| `sender_profiles` | Reusable, product-independent **sender identities** (label, sender/company, From/Reply-To, signature, status) + optional `email_account_id`; owns **no** transport credentials | `sender-profiles` | impl |
| `email_accounts` | Technical **mailbox connection** for a password-authenticated mailbox (account email, status, `provider`, SMTP + IMAP host/port/TLS/username, `credentialsShared`); passwords stored only as authenticated ciphertext (`EMAIL_SECRETS_KEY` server-side, never DB/Git); referenced by `sender_profiles.email_account_id` and `outreach_drafts.email_account_id` | `email-accounts` | impl |
| `outreach_drafts` | Evidence-backed **initial** outreach drafts: recipient reference, subject/body, language, preparation status (`PREPARED \| BLOCKED`), rationale, context/evidence references, sender profile reference + non-secret identity snapshot, and precise missing fields; append-only/versioned + idempotent fingerprint; no send state | `outreach-drafter` | impl |
| `outreach_draft_research` | Draft↔research join | `outreach-drafter` | plan |
| `customer_profiles` | Versioned ideal-customer profiles | `knowledge` | plan |
| `buyer_personas` | Versioned buyer personas | `knowledge` | plan |
| `value_propositions` | Versioned value propositions + approved/forbidden claims | `knowledge` | plan |
| `opportunity_customer_profile` | Opportunity↔customer-profile association | `opportunities` | plan |
| `opportunity_buyer_persona` | Opportunity↔buyer-persona association | `opportunities` | plan |
| `opportunity_value_proposition` | Opportunity↔value-proposition association | `opportunities` | plan |
| `inbox_items` | Ingested inbound messages (future) | `inbox-intelligence` | plan |
| `job_logs` | Queue job bookkeeping | `jobs` | plan |

The exact implemented columns and constraints are defined in
`soft/packages/database/prisma/schema.prisma` and described in
`soft/docs/data-model.md`. Business values are never reproduced here.

---

## 3. Single-Writer Modules

### `research_records` / `research_findings`

Exactly **one write-owner: `research-records`**. `market-researcher`,
`company-intelligence`, and `contact-discovery` call
`research-records.createRecord({ type, ... })` / `addFinding(...)`; they never
write the tables directly. `research-records` validates the `type` and required
scope fields. Reads are served by its query/read-model service.

### `product_facts` (typed; exactly one subject)

- Owned by `products-and-offers`. **Implemented model:** one structured fact per
  row about exactly one Product **or** one Offer (never both, never neither —
  enforced by a DB CHECK constraint; the fact must also carry a value).
- `status` ∈ `PENDING | CONFIRMED | SUPERSEDED`; `visibility` ∈
  `OPERATIONAL | RESTRICTED` (**visibility is a separate dimension**; contrast
  with the historical redesign, which treated RESTRICTED as a status).
- Only `CONFIRMED` facts are assertable by research modules.
- Fact authoring is **human or trusted internal product-data source only**;
  research modules file `clarification_requests` instead. A fact moves to
  `CONFIRMED` only through an approved `approvals` request.
- Append-only versioning is **planned**; T-004 stores the `status`/`visibility`
  columns only.

### `research_contexts` and `research_runs`

- `research_contexts` is owned by `control-plane`: a read-only materialization of
  the assembled `ResearchContext` at freeze time, referenced by `contextVersion`.
- `research_runs` is owned by `market-researcher` and holds exactly one
  `context_version` column; its target-market scope is recorded in
  `research_run_target_markets` (compound-unique). `ResearchContextService`
  composes snapshots from each module's read service and never writes another
  module's tables.
- `research_runs` also carries the run lifecycle: a `PAUSED` status with a
  **separate** `pauseReason` (`BUDGET_EXHAUSTED | ACCESS_BLOCKED |
  CONTEXT_CHANGED | DIMINISHING_RETURNS | NEEDS_HUMAN`), `errorCode`/`errorNote`
  for `FAILED`, and a JSONB `checkpoint` + `checkpointAt`. A reason is never
  encoded as a status. `research_queries` (owner `market-researcher`) records the
  discovery/search queries issued during a run. Since 2026-09-17 `research_runs`
  also carries the product-independent request fields `request_parameters` (JSONB,
  validated operator goals/geography/segments/questions/constraints/limits) and
  `request_key` (unique, idempotency); a **research request is a `QUEUED`
  `research_run`** — no separate request table and no parallel task framework.

### `evidence` (sources, evidence, claims)

- `evidence` is the single write-owner of `source_references`, `evidence`,
  `claims`, and `claim_evidence`. `source_references` is deduplicated by URL;
  `evidence` is a factual observation extracted from a source, carrying a
  retrieval date and a `VERIFIED | UNVERIFIED` state; `claims` are conclusions
  (`FACT | INFERENCE | UNKNOWN` + confidence) linked to evidence through
  `claim_evidence` with an explicit stance (`SUPPORTS | REFUTES | CONTEXT`).
- `claim_evidence` **refines** the earlier planned `claim_sources`: discovery
  snippets are not evidence, evidence is not a conclusion, and one claim may
  rest on many evidence records.
- Cross-row rules (a `FACT`/`INFERENCE` claim needs ≥1 evidence link; an
  `UNKNOWN` claim carries none; linked evidence must belong to the same run) are
  enforced by the `evidence` module, not by a single-row DB constraint.
- Claims also carry a bounded **correction lifecycle**, separate from claim type
  and evidence verification: `lifecycleStatus`
  (`CURRENT | RETRACTED | REPLACED`) with `correctionReason`/`correctedAt` and a
  `replacedByClaimId` self-reference. Retraction/replacement never edits or
  deletes the original claim or its evidence links; current claim reads exclude
  non-`CURRENT` claims by default, and history is retrievable explicitly.

---

## 4. Read Rules and Read Models

- Each module declares its read set in `module-map.md`, satisfied by its own
  tables, another module's read-model/query service, or `control-plane` read
  models.
- Read models may join across owners but are read-only and owned by a declared
  module. No module may `SELECT *` across the DB at will.

---

## 5. Schema Governance

1. `soft/packages/database` is the only place migrations are generated/applied.
2. Business tables use plural snake_case; join tables `a_b`; all mapped with
   `@map`.
3. Each model carries `/// @owner <module>` for machine-readable ownership.
4. Raw `$executeRaw`/`$queryRaw` are not exposed to application code outside the
   database package's typed boundary; application code uses typed repositories
   or injected services.
5. A migration may only touch tables owned by the module authoring it (mapped
   from `@owner`); this is reviewable and CI-enforceable.

---

## 6. Cross-Boundary Mutation Patterns

- **A — direct service call:** `market-researcher` → `opportunities.createSuggestion(...)`.
- **B — approval-gated:** `approvals.createRequest(...)` → human approve →
  `approvals` calls the owning module's `apply()`.
- **C — event + job:** `control-plane` routes → `jobs` enqueues → worker runs
  the module service → events update `executions`/`activities`.
- **D — evidence writes:** any module calls `evidence.registerSource(...)` /
  `persistClaim(...)`.
- **E — research-record writes:** any research module calls
  `research-records.createRecord(...)` / `addFinding(...)`.

---

## 7. What Must Not Happen

- A module writing another module's table (including `control-plane` writing
  business tables).
- A migration authored outside `soft/packages/database`.
- Markdown acting as live state (it is instructions/decisions/evidence/reports).
- A research module writing `product_facts`.
- A research module writing `research_records`/`research_findings` directly.
