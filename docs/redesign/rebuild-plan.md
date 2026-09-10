# Redesign — Rebuild Plan

**Status:** Proposal. No code, migrations, or destructive cleanup performed.
**Companion:** `architecture.md`, `module-boundaries.md`, `data-ownership.md`, `task-and-execution-model.md`, `research-context-contract.md`.

This is the ordered plan for rebuilding from scratch into the modular system defined in the companion docs.

---

## 1. Starting Position

- `legacy/` — historical docs and Phase 0 research (importable evidence, read-only).
- `soft/` — the old broken NestJS scaffold (`apps/api`, empty `apps/web`, empty `packages/`). To be **replaced**, not repaired.
- No commits yet on `main`; everything is untracked (safe to re-lay).

The rebuild does **not** delete `legacy/`. It re-lays `apps/`, `packages/`, `modules/`, and `workers/`.

---

## 2. Rebuild Principles

1. Build the **foundation** (database package + contracts) before any module.
2. Land each module only when its consumers need it (incremental knowledge/module strategy).
3. Prove the **skeleton pattern end-to-end** with one vertical slice before adding breadth.
4. Every slice keeps the single-writer and single-migration-owner rules.
5. Old data is **imported**, never treated as live state.

---

## 3. Phases

### Phase 0 — Workspace + Foundation (no business logic)

- Create bun workspaces layout: `apps/api`, `packages/database`, `packages/contracts`, `modules/`, `workers/`.
- `packages/database`: Prisma schema with the **core set only** (see §4), `PrismaService`, repository base, migration tooling.
- `packages/contracts`: shared Zod schemas + types for the first slice.
- `apps/api`: bootstrap with Fastify, config + env validation, health endpoint.
- **Acceptance:** `apps/api` boots; `packages/database` applies a migration to a local Postgres; no business tables beyond the core set exist yet.

### Phase 1 — Foundation Domain + Control-plane + Evidence + ResearchContextService (the first vertical slice)

This is the first real slice (detailed in §5). It includes the **core business entities** (`Product`, `ProductFact`, `Opportunity`, `OpportunityOffer`, `TargetMarket`), the **foundational modules** (`control-plane`, `evidence`, `products-and-offers`, `opportunities`), and the **`ResearchContextService`** — with `Task` scope support. No AI, search, BullMQ, or UI.

- **Acceptance:** a `Task → Execution → Activity` chain works; product facts are typed/versioned (CONFIRMED/PENDING/RESTRICTED/SUPERSEDED); a frozen `ResearchContext` (`schemaVersion: research_context_v1`) can be assembled and read back with SUPERSEDED facts absent and PENDING/RESTRICTED values redacted.

### Phase 2 — Knowledge + Approvals (the human gate)

- `knowledge`: customer profile, buyer persona, value proposition (versioned).
- `approvals`: request lifecycle + mutation application via owning services; fact confirmation path (PENDING → CONFIRMED).
- **Acceptance:** a `TargetMarketSuggestion` (and a proposed product fact) is created PENDING, approved, and applied with a decision record — proving the mandatory human gate.

### Phase 3 — Research-records + Market Researcher (first AI vertical + jobs)

- `research-records`: the single write-owner of `research_records`/`research_findings`.
- `market-researcher` + `jobs` (BullMQ) + optional worker process.
- Implements the **Research Context contract** (`research-context-contract.md`): `GET /opportunities/:id/research-context`, `POST /opportunities/:id/research-runs`, `GET /opportunities/:id/research-runs`; scope resolved from `Task`.
- Implements the harness contract (`legacy/docs/market-research-harness.md`): run manifest, budgets, source/claim persistence via `evidence`, research records via `research-records`, partial results, suggestions via `opportunities` + `approvals`, clarification requests (never product facts).
- **Acceptance:** the researcher is invoked with only `taskId` + `opportunityId`; it reads a frozen context, asserts only CONFIRMED facts, surfaces PENDING/RESTRICTED as unknowns, and produces sourced claims + PENDING suggestions + clarification requests — with an execution + activity trail.

### Phase 4 — Discovery & Intelligence (breadth)

- `lead-discoverer` → `lead-evaluator` → `company-intelligence` → `contact-discovery`, in that order (each consumes the previous), all writing research records through `research-records`.
- **Acceptance:** from a target market, discover companies → qualify them → research one → find a contact, all with sources and approval gates.

### Phase 5 — Outreach + Inbox (close the loop)

- `outreach-drafter` (drafts with traceability + approval), then `inbox-intelligence` (post-MVP).
- **Acceptance:** a sourced, human-approved draft is produced for a qualified company.

---

## 4. Minimal Core Schema (Phase 0–1)

The first schema version includes the foundational entities + the first-slice modules:

```text
tasks, executions, activities, research_contexts      (control-plane)
source_references, claims, claim_sources, fact_sources  (evidence)
products, product_facts, opportunity_offers             (products-and-offers)
opportunities, target_markets, target_market_suggestions (opportunities)
```

`knowledge`, `approval_requests`, `decision_records`, `research_runs`, `research_records`, and the discovery/draft tables arrive with their modules. This keeps migrations small and reviewable and avoids recreating the "empty CRUD shell" problem from the old scaffold.

---

## 5. The Smallest First Implementation Slice

**Goal:** prove the full vertical slice — central DB + core business entities + foundational modules + the Research Context — before any AI, search, BullMQ, or UI.

**Slice contents (modules + entities + service):**

1. `packages/database` — schema with:
   - `tasks` (with `scope.targetMarketIds` + optional `country`/`industry`), `executions`, `activities`, `research_contexts`;
   - `source_references`, `claims`, `claim_sources`, `fact_sources`;
   - `products`, `product_facts` (typed/versioned), `opportunity_offers`;
   - `opportunities`, `target_markets`, `target_market_suggestions`;
   - `PrismaService`, repository base, migration.
2. `packages/contracts` — typed contracts for: `Task` (+`scope`), `Execution`, `Activity`, `SourceReference`, `Claim` (FACT/INFERENCE/UNKNOWN + confidence), `Product`, `ProductFact` (CONFIRMED/PENDING/RESTRICTED/SUPERSEDED), `Opportunity`, `OpportunityOffer`, `TargetMarket`, and `ResearchContext` (`schemaVersion: research_context_v1`).
3. `modules/control-plane` — `createTask` (with scope), `startExecution`, `completeExecution`, `recordActivity`, and `ResearchContextService` (assembles + freezes + redacts the context).
4. `modules/evidence` — `registerSource`, `persistClaim`, `validateClaim`, `exportRegister`.
5. `modules/products-and-offers` — product + offer + typed/versioned facts (human/trusted-source authoring only).
6. `modules/opportunities` — opportunity + target-market + suggestion lifecycle; workspace read model.
7. `apps/api` — thin controllers for the above (including `GET /opportunities/:id/research-context`) + health; wire modules into `AppModule`.

**Definition of done:**

- `apps/api` boots against a local Postgres with the core migration applied.
- A `Task → Execution → Activity` chain can be created and read back; a Task carries non-empty `scope.targetMarketIds` for research tasks.
- Product facts are typed/versioned; a change supersedes the previous version; SUPERSEDED facts are absent from the context; PENDING/RESTRICTED facts expose only key/status/explanation.
- `GET /opportunities/:id/research-context` returns `schemaVersion: research_context_v1` with CONFIRMED facts carrying evidence metadata and redacted non-CONFIRMED values.
- A FACT claim without a source and an UNKNOWN claim with a price are both rejected.
- No module writes another module's tables; schema/migrations live only in `packages/database`.
- No code is written to `legacy/`; nothing there is modified.

**Explicitly out of scope for this slice:** AI/LLM calls, search/scrape adapters, BullMQ worker, `research-records`, company/contact/outreach tables, `market-researcher`, any web UI.

---

## 6. Legacy Import Plan (later, optional)

- `legacy/docs/research/thermo-abachi-source-register.csv` → import rows into `source_references`.
- `legacy/docs/research/thermo-abachi-europe-market-research.md` → import material findings as `claims` (typed, dated 2026-09-09), linked to imported sources.
- `legacy/phase-0-research/*` → import only terminology and methodology notes; prospect batches are **not** imported as live companies without re-validation.
- `legacy/docs/market-research-harness.md` → remains the source of truth for `market-researcher` and `evidence` operating rules (or is promoted into `docs/` when the module lands).

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Schema drift (multiple Prisma files) | Single `packages/database`, `@owner` tags, CI ownership check |
| Modules reaching into each other's tables | Scoped repositories + read-model services + PR review |
| Over-engineering before proof | Phased slices; core schema only; no module before its consumer |
| Worker/API divergence | Shared module services + shared Prisma package; worker is a thin host |
| Losing historical evidence | `legacy/` untouched; import path defined but not executed in first slice |
| Recreating the old empty-CRUD scaffold | Every phase has a concrete acceptance criterion tied to business value |

---

## 8. Immediate Decisions Needed (from Eimantas)

1. Confirm the module set and ownership model above (including the new `research-records` module as the sole writer of `research_records`/`research_findings`).
2. Confirm the monorepo tooling stays **bun workspaces** (current `soft/package.json` already uses it).
3. Confirm whether to keep the folder name `apps/api` + `packages/database` + `modules/*` or prefer an alternative (e.g. `modules/` inside `apps/api/src`).
4. Confirm Postgres connection approach for local dev (docker-compose) and whether the old `soft/apps/api/.env` values should be reused or fresh.
5. Confirm the first slice scope (§5) — now includes the core business entities + `ResearchContextService`, and excludes AI/search/BullMQ.
6. Confirm the Research Context contract design (`research-context-contract.md`): `schemaVersion`, fact statuses, resolved evidence metadata, task scope, and that research modules receive only `taskId` + `opportunityId`.
7. Confirm that fact authoring is **human/trusted-source only** (the market researcher never proposes product facts — it files clarification requests instead).
