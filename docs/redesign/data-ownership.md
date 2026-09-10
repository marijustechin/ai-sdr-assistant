# Redesign — Data Ownership

**Status:** Proposal. No code written.
**Companion:** `architecture.md`, `module-boundaries.md`, `task-and-execution-model.md`.

This document defines the canonical table list, the single write-owner per table, read rules, cross-boundary coordination, and migration ownership.

---

## 1. Ownership Principles

1. **One write-owner per table.** Exactly one module may write to a given table (through its own repositories/services). Other modules read it, or ask the owner's service to mutate it.
2. **Reads are permissioned.** Read access is declared per module and granted through the owner's exported query/read-model service, or (for genuinely read-only reporting) through a `control-plane` read model. No module may `SELECT *` across the whole DB at will.
3. **Cross-boundary mutation = service call.** When module A needs a change owned by module B, A calls B's application service. B validates and performs the write, then emits an event. A never opens a write transaction on B's tables.
4. **The Assistant Manager does not own business tables.** It owns routing/audit tables only.
5. **Schema and migrations are owned by `packages/database`** — one schema, one migration chain, one owner. Modules add tables only through that package's migration process, with an explicit owner declared in the schema (via naming conventions and a `@map` comment registry described in §5).

---

## 2. Canonical Tables and Write Owners

| Table | Purpose | Write owner |
|---|---|---|
| `tasks` | A requested unit of work (routed by Assistant Manager) | `control-plane` |
| `executions` | Technical run of a task (provider calls, metrics, errors, status) | `control-plane` |
| `activities` | User-visible business audit events | `control-plane` |
| `research_contexts` | Frozen, versioned snapshot of the Research Context | `control-plane` |
| `approval_requests` | Human approval requests and their decisions | `approvals` |
| `decision_records` | Accepted/rejected decisions with reasoning + sources | `approvals` |
| `opportunities` | The central business object | `opportunities` |
| `target_markets` | Where/to whom the product should be sold | `opportunities` |
| `target_market_suggestions` | Research-driven suggestions (PENDING→ACCEPTED/REJECTED) | `opportunities` |
| `products` | Reusable product catalog | `products-and-offers` |
| `opportunity_offers` | Per-opportunity commercial terms (1:1 with opportunity) | `products-and-offers` |
| `product_facts` | Versioned, typed facts (CONFIRMED/PENDING/RESTRICTED/SUPERSEDED) | `products-and-offers` |
| `fact_sources` | Fact↔source join | `evidence` |
| `clarification_requests` | Product-data questions filed by research modules | `market-researcher` |
| `companies` | Potential buyer organisations | `lead-discoverer` |
| `opportunity_companies` | Company↔opportunity join (status, latest qualification) | `lead-discoverer` |
| `contacts` | People at companies | `contact-discovery` |
| `qualification_records` | Versioned qualification results | `lead-evaluator` |
| `research_runs` | A market-research run bound to a context version | `market-researcher` |
| `research_records` | Structured research (MARKET / COMPANY / CONTACT / COMPETITOR / IMPORT_EXPORT) | `research-records` |
| `research_findings` | Individual findings within a research record | `research-records` |
| `research_findings` | Individual findings within a research record | same split as `research_records` |
| `source_references` | Retrieved sources (url, publisher, type, retrieval date) | `evidence` |
| `claims` | Typed claims (FACT / INFERENCE / UNKNOWN) with confidence | `evidence` |
| `claim_sources` | Claim↔source join | `evidence` |
| `company_sources` | Company↔source join | `evidence` |
| `contact_sources` | Contact↔source join | `evidence` |
| `research_record_sources` | ResearchRecord↔source join | `evidence` |
| `outreach_draft_sources` | Draft↔source join | `evidence` |
| `outreach_drafts` | Outreach drafts | `outreach-drafter` |
| `outreach_draft_research` | Draft↔research join (traceability) | `outreach-drafter` |
| `customer_profiles` | Versioned ideal-customer profiles | `knowledge` |
| `buyer_personas` | Versioned buyer personas | `knowledge` |
| `value_propositions` | Versioned value propositions + approved/forbidden claims | `knowledge` |
| `opportunity_customer_profile` | Opportunity↔customer-profile association | `opportunities` |
| `opportunity_buyer_persona` | Opportunity↔buyer-persona association | `opportunities` |
| `opportunity_value_proposition` | Opportunity↔value-proposition association | `opportunities` |
| `inbox_items` | Ingested inbound messages (future) | `inbox-intelligence` |
| `job_logs` | Queue job bookkeeping (progress, attempts, DLQ) | `jobs` |

---

## 3. Research Records: Single-Writer Module

`research_records` and `research_findings` have exactly **one write-owner: the `research-records` module**. There is no type-discriminator split ownership.

- `market-researcher`, `company-intelligence`, and `contact-discovery` do **not** write these tables. They call `research-records.createRecord({ type, ... })` and `research-records.addFinding(...)`.
- The `research-records` module validates the `type` (MARKET / COMPANY / CONTACT / COMPETITOR / IMPORT_EXPORT) and required scope fields, then performs the write.
- Reads are served by the `research-records` query/read-model service, used by `ResearchContextService`, `outreach-drafter`, and `lead-evaluator`.

```text
market-researcher ─┐
company-intelligence ─┼─(service calls)─▶ research-records ─▶ research_records / research_findings
contact-discovery ─┘
```

### `product_facts` (append-only, versioned, typed)

- Owned by `products-and-offers`. Append-only: a change creates a new row with `version = prev + 1` and marks the previous `SUPERSEDED`.
- `status` ∈ `CONFIRMED | PENDING | RESTRICTED | SUPERSEDED`. Only `CONFIRMED` is assertable by research modules (see `research-context-contract.md` §6).
- Fact authoring is **human or trusted internal product-data source only**. Research modules never propose facts — they file `clarification_requests` instead. A fact moves to `CONFIRMED` only through an approved `approvals` request.

### `research_contexts` (frozen snapshot) and `research_runs`

- `research_contexts` is owned by `control-plane`. It is a read-only materialization of the assembled `ResearchContext` at freeze time, referenced by `contextVersion`.
- `research_runs` is owned by `market-researcher` and holds exactly one `context_version` FK — making each run reproducible.
- The `ResearchContextService` (in `control-plane`) is the only assembler; it composes the snapshot from each module's read/query service and never writes another module's tables.

---

## 4. Read Rules and Read Models

- Each module declares its read set in `module-boundaries.md`. Those reads are satisfied by:
  - its own tables (direct repository);
  - another module's tables through that module's **read-model/query service** (e.g. `OpportunityWorkspaceService`, `EvidenceQueryService`, `KnowledgeQueryService`);
  - `control-plane` read models for cross-cutting audit/status reporting.
- Read models may join across owners but must be **read-only** and owned by a declared module (typically `control-plane` for aggregate reporting, or the module that "owns the question").
- Example: `outreach-drafter` needs `OpportunityWorkspace` (from `opportunities`), latest `QualificationRecord` (from `lead-evaluator`), research (from `research-records`), personas/value-props (from `knowledge`), and sources (from `evidence`). It obtains each through the respective service — never by reading those tables directly.

---

## 5. Schema Governance (how ownership is enforced)

1. `packages/database` is the only place migrations are generated/applied.
2. Table naming convention: business tables use plural snake_case; join tables `a_b`; all mapped via `@map`.
3. Each model in `schema.prisma` carries a comment tag `/// @owner <module>` so ownership is machine-readable and reviewable in PRs.
4. Prisma's generated client is wrapped so that raw `$executeRaw`/`$queryRaw` are disabled outside `packages/database`'s migration/seeding utilities. Application code uses typed repositories only.
5. A CI check verifies that a migration only touches tables owned by the module making the change (mapped from the `@owner` tag) — this is the automated enforcement of the single-writer rule.

---

## 6. Cross-Boundary Mutation Patterns

**Pattern A — direct service call (synchronous, in-process).**
`market-researcher` wants to store a `TargetMarketSuggestion`. It calls `opportunities.createSuggestion(...)`. `opportunities` writes the row (owner) and returns the id.

**Pattern B — approval-gated mutation.**
`market-researcher` produced suggestions. `approvals.createRequest(...)` creates an `approval_request`. On `approve`, `approvals` calls `opportunities.applySuggestion(...)`, which mutates `target_markets` (its owner) and resolves the suggestion. `control-plane` records an `activity`.

**Pattern C — event + job (async).**
`control-plane` routes a research task → `jobs` enqueues → worker runs `market-researcher.run(...)` → on completion emits `market_research.completed` → `control-plane` updates `executions` and records `activities`.

**Pattern D — evidence writes (shared utility, single owner).**
Any module needing to persist a source/claim calls `evidence.registerSource(...)` / `evidence.persistClaim(...)`. `evidence` owns the tables. No module writes `source_references`/`claims` directly.

**Pattern E — research-record writes (single owner).**
Any research module needing to persist a research record/finding calls `research-records.createRecord(...)` / `research-records.addFinding(...)`. `research-records` owns the tables. No research module writes `research_records`/`research_findings` directly.

---

## 7. What Must NOT Happen

- A module opening a transaction and writing another module's table.
- `control-plane` writing `opportunities`, `companies`, `claims`, etc.
- A migration authored outside `packages/database`.
- Markdown files acting as live state (they are import-only).
- A research module writing `product_facts` (fact authoring is human/trusted-source only).
- A research module writing `research_records`/`research_findings` directly (must go through `research-records`).
