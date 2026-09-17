# Decisions

> **Canonical source:** the canonical decision log lives at the repository root
> in [`docs/system/decisions.md`](../../docs/system/decisions.md). This file is
> the implementation-local companion; where they overlap, the root canonical
> log wins.

**Status:** Implementation decision log. Newest first.
**Companion:** `AGENTS.md` (hierarchy places this below architecture/security/contracts).

Every consequential design decision is recorded here with a date, the decision,
and the reason. The agent must not silently override a recorded decision.

---

## 2026-09-15 — Evidence-linked offerings + manager write encoding fix (O-013 round 2)

Added a bounded, evidence-owned `research_offerings` read model: a structured
company offering with mandatory provenance (`sourceReferenceId` + `evidenceId`,
optional `claimId`) and a deterministic per-run `fingerprint` (unique) so
re-imports do not duplicate. Values are explicit only — an unrecorded field is
null and its enum `UNKNOWN`; the UI never parses prose. Exposed as
`POST/GET .../research-runs/:runId/offerings`, internal-key guarded.

The corrupted Lithuanian/Finnish text was traced to the **manager's PowerShell
write path** (BOM-less `.ps1` scripts read as CP1252, plus string-body
encoding), not the API or web rendering. The API transport is proven correct by
a non-ASCII round-trip integration test; the manager path now writes UTF-8
bytes and reads scripts as UTF-8. Two historically double-encoded
`research_queries` rows are reported for repair, not silently rewritten.

- Reason: a sales-manager view needs structured company/offering/price fields
  with provenance; the encoding defect had to be localized before a fix.
- Consequence: run claims/evidence/corrections/checkpoint are unchanged; no
  generic CRM or extraction framework. `product_facts` remain researcher-closed.

## 2026-09-15 — Bounded claim-correction lifecycle: retraction/replacement (not versioning)

## 2026-09-15 — Bounded claim-correction lifecycle: retraction/replacement (not versioning)

`claims` gains a small correction lifecycle: `lifecycleStatus`
(`CURRENT | RETRACTED | REPLACED`, default `CURRENT`), `correctionReason`,
`correctedAt`, and a self-FK `replacedByClaimId`. The `evidence` module exposes
`POST .../claims/:claimId/corrections` (`{ kind: RETRACTION | REPLACEMENT,
reason, replacementClaimId? }`) and `GET .../claims?includeHistory=true`.
Original claims and their evidence links are never edited or deleted. This is a
**separate dimension** from `ClaimType` (FACT/INFERENCE/UNKNOWN) and from
`EvidenceVerificationStatus`. Validation is transactional: the target must be
`CURRENT` and in the same run; a replacement must be a different, `CURRENT`
claim in the same run and must not form a cycle; a second correction of the same
claim is a conflict.

- Reason: overlapping corrections of research claims were previously expressed
  by appending more `INFERENCE` claims, which is ambiguous and does not formally
  supersede anything. A bounded, domain-specific lifecycle makes retraction and
  replacement explicit and keeps current reads clean.
- Consequence: this is **not** a generic versioning framework (no version
  numbers, no generic entity-version table); the `products-and-offers` fact
  append-only versioning remains separate and unimplemented. The research
  harness is updated to require this mechanism for future corrections.

## 2026-09-15 — Research persistence keeps discovery, evidence, and claims apart (T-007)

A first-class `evidence` entity sits between sources and claims, replacing the
previously planned `claim_sources` join: `source_references` (deduplicated by
URL) ← `evidence` (observation + retrieval date + `VERIFIED`/`UNVERIFIED`) →
`claim_evidence` (stance) → `claims` (`FACT`/`INFERENCE`/`UNKNOWN` +
confidence). Run-scoped discovery is a separate `research_queries` table, and
`research_runs` gains `PAUSED` + `pauseReason`/`pauseNote` and a JSONB
`checkpoint`/`checkpointAt`. A `FACT`/`INFERENCE` claim requires ≥1 evidence
link and an `UNKNOWN` claim carries none (service-enforced, because the rule
spans rows). A generic `search_results` table was deliberately not introduced.

- Reason: the harness requires provenance and an explicit discovery/evidence/
  conclusion separation; a join-only `claim_sources` could not represent an
  observation independent of a claim or multiple evidence records per claim.
- Consequence: canonical `data-governance.md`/`module-map.md` were updated;
  `research_contexts` freeze, `research-records`, suggestions, clarifications,
  and job/worker orchestration remain separate future tasks.

## 2026-09-15 — Test harness spawns `pnpm` through a shell on Windows (T-007)

`packages/database/test/global-setup.ts` and `apps/api/test/global-setup.ts`
pass `shell: process.platform === 'win32'` to `execFileSync`, because Windows
only provides `pnpm.cmd`, which `execFileSync` cannot launch directly.

- Reason: the integration tests must run on the Windows host without changing
  how they run elsewhere (Node emits a `DEP0190` warning; arguments are static).

## 2026-09-10 — Internal API key guards business endpoints (T-006)

Every business endpoint (product/offer/fact/target-market/opportunity creation
and the research-context read) is protected by an `INTERNAL_API_KEY`
service-to-service guard (`x-internal-api-key`). `GET /health` and `GET /ready`
stay public. This is not end-user authentication (no users/roles/sessions/JWT),
and the key is never logged, echoed, or returned. A missing/too-short configured
key fails closed (503); a missing/wrong provided key returns 401.

- Reason: business writes and context reads must not be open by default, while
  keeping the operational endpoints simple.

## 2026-09-10 — Opportunity context version increments transactionally (T-006)

`Opportunity.contextVersion` is a monotonic revision of the opportunity's
operational research context. It is incremented in the same transaction as the
triggering write: attaching a target market (owned by `opportunities`) and
creating a relevant product/offer fact (owned by `products-and-offers`, which
calls the `opportunities` service inside a shared transaction). Any
non-SUPERSEDED fact changes the assembled context (a value, or a redacted
placeholder), so fact creation bumps every affected opportunity.

- Reason: consumers can detect when the context they cached is stale, without a
  separate snapshot table yet. The write still happens through the owning
  module's repository, preserving single-writer ownership.

## 2026-09-10 — Research Context v1 is a current assembled context (T-006)

`GET /opportunities/:id/research-context` returns `research_context_v1` assembled
on demand (`frozenAt` = assembly time, `contextVersion` = the Opportunity
revision). It is **not yet** an immutable research-run snapshot;
`research_contexts` freeze, `POST/GET .../research-runs`, and related endpoints
remain planned. Sections whose owning modules do not exist yet
(`priorResearchRuns`, `existingCompanies`, `approvedKnowledge`, `humanDecisions`)
are returned empty; asserted facts carry `sourceLabel` and empty `evidence`
until the `evidence` module lands.

- Reason: deliver the first usable read path without fabricating data from
  modules that are not built.

## 2026-09-10 — Added Product.category and Opportunity.objective (T-006)

The canonical research-context DTO requires `product.category` and
`opportunity.objective`; the T-004 schema lacked both. One migration adds those
nullable columns alongside `opportunities.context_version`.

- Reason: implement the canonical contract faithfully rather than returning
  placeholder empty values for fields the operator can supply.

---

## 2026-09-10 — Workspace TypeScript boundary: typecheck on source, build on dist (T-004 review)

`apps/api` maps `@ai-sdr/database` to `../../packages/database/src/index.ts`
via a TypeScript `paths` mapping, so type-checking resolves the package source
without a prior build. The emitted build (`tsconfig.build.json`) clears that
mapping (`paths: {}`) and resolves the package's compiled `dist` entry; `pnpm -r
build` builds `packages/database` first. The Prisma client is generated by the
root `postinstall` and by the database package's `build`/`typecheck` scripts.

- Reason: root `pnpm typecheck` must pass from a clean install with no compiled
  `packages/database/dist`, without making typecheck depend on a prior build.

## 2026-09-10 — No generic `RepositoryBase`; direct Prisma client boundary (T-004 review)

The speculative `RepositoryBase` abstraction was removed from
`packages/database`. The package exposes only the Prisma schema, generated
client, and `PrismaService` (the direct DB boundary). Module-owned typed
repositories are added only when a real consumer needs them.

- Reason: avoid an abstraction prepared for imaginary future modules.

## 2026-09-10 — API loads the workspace root `.env` at runtime (T-004 review)

`apps/api` explicitly loads the workspace root `.env` at startup via
`process.loadEnvFile` (Node built-in), guarded by an existence check. Existing
environment variables take precedence (real env wins over `.env`); nothing is
read, logged, or echoed. This makes local development/runtime work without the
user exporting `DATABASE_URL` first.

- Reason: the API is a separate process from the Prisma CLI, so CLI `.env`
  loading is not sufficient; a missing `.env` must remain a safe no-op.

---

## 2026-09-10 — Prisma 7 with driver adapters + `prisma.config.ts` (T-004)

`packages/database` uses Prisma ORM 7: the ESM `prisma-client` generator with a
required `output` path (`src/generated`), the PostgreSQL driver adapter
(`@prisma/adapter-pg`), and `prisma.config.ts` for datasource/migrations config
(`dotenv` loads the workspace root `.env` for the CLI). The generated client is
git-ignored and regenerated by `pnpm run generate` / the `build` script.

- Reason: current Prisma conventions; Prisma 7 no longer auto-loads `.env`,
  requires a custom `output`, and requires a driver adapter for connections.

## 2026-09-10 — `Offer` is a sellable product form (T-004)

`Offer` is the concrete sellable product form belonging to exactly one
`Product` (e.g. "Thermo Abachi STS 3D" is an Offer of "Abachi"); an
`Opportunity` belongs to one `Offer`. This refines the earlier
`opportunity_offers` placeholder (per-opportunity commercial terms), which is
deferred to a later task.

- Reason: the minimal commercial domain needs a sellable variant distinct from
  per-opportunity commercial terms.

## 2026-09-10 — ProductFact subject/value rules as DB CHECK constraints

The "exactly one of Product/Offer" and "at least one value" rules for
`ProductFact` are enforced with hand-authored CHECK constraints in the initial
migration SQL, because Prisma cannot express CHECK constraints. Future changes
to these rules require a new hand-authored migration.

- Reason: enforce invariants at the database level, not only in application code.

## 2026-09-10 — `RESTRICTED` is a fact visibility, not a status (T-004)

`ProductFact.status` ∈ `PENDING | CONFIRMED | SUPERSEDED` and
`ProductFact.visibility` ∈ `OPERATIONAL | RESTRICTED`. The research-context
contract's `RESTRICTED` status is reconciled as a visibility dimension; the
contract vocabulary will be re-aligned when ResearchContext assembly is built.

- Reason: the task defines status and visibility as distinct dimensions.

## 2026-09-10 — Lazy Prisma client + `SELECT 1` readiness (T-004)

`GET /health` stays a liveness check with no DB dependency. `GET /ready` runs a
safe `SELECT 1` through a lazily-created `PrismaService` and returns a
non-sensitive 503 on failure. The client is created lazily so the app can boot
without a configured/reachable database.

- Reason: keep liveness independent of the DB; never expose connection strings,
  stack traces, or database errors.

## 2026-09-10 — Isolated `ai_sdr_test` database for integration tests (T-004)

Database-package tests run against a disposable `ai_sdr_test` database (created
idempotently by test `globalSetup`, migrated with `prisma migrate deploy`,
truncated between tests). Tests never write to the development `ai_sdr` database.

- Reason: repeatable setup/cleanup with no leakage into development data.

## 2026-09-10 — Explicit `@Inject()` tokens for DI constructor params

NestJS providers/controllers that inject a dependency by constructor parameter
use an explicit `@Inject(Token)` decorator rather than relying on
`emitDecoratorMetadata`, which esbuild-based runners (vitest, tsx) do not emit.

- Reason: make DI work identically under tsc, vitest, and `tsx` dev mode.

---

## 2026-09-09 — Node 24 + pnpm 11 replace Bun as the toolchain

The workspace moves from Bun to **Node.js 24 LTS** (`.nvmrc` = `24.20.0`) and
**pnpm 11** (`packageManager` = `pnpm@11.26.0`, `pnpm-workspace.yaml`).
`bun.lock` is removed; `pnpm-lock.yaml` is the single lockfile. Root scripts
use `pnpm --filter` / `pnpm -r` (no `bun --cwd`).

- Reason: align the runtime and package manager with the accepted toolchain
  decisions; pnpm workspaces replace the Bun workspace model.

## 2026-09-09 — T-003 is the clean API host foundation (no DB/business)

T-003 is narrower than the earlier placeholder: it replaces the `apps/api`
scaffold with a clean NestJS 11 + Fastify host exposing only `GET /health`,
with vitest tests, pino structured logging, and env validation for
`NODE_ENV`/`PORT`. No Prisma, database, business module, AI, queue, or UI work.

- Reason: establish a runnable foundation first; the database/business spine
  is deferred to a later task.

## 2026-09-09 — Replace the existing `apps/api` scaffold

The current `apps/api` scaffold is replaced, not salvaged. It does not compile
(TS6133), has no tests, holds a Prisma schema in the wrong location
(`apps/api/prisma/`), and models only unrelated demo entities. See
`docs/audits/2026-09-09-existing-software-baseline.md`.

- Reason: the scaffold is incompatible with the modular architecture and is
  cheaper to rebuild than to repair.

## 2026-09-09 — Feature modules live under `apps/api/src/modules`

Bounded NestJS feature modules live in `apps/api/src/modules/<module>/`. There
is **no** root-level `modules/*` workspace.

- Reason: one REST host (`apps/api`) owns all controllers; modules expose
  services, not separate runtimes.

## 2026-09-09 — `packages/*` holds only shared packages

Root `packages/*` contains only genuinely shared packages: `packages/database`
(single Prisma schema/migration owner), `packages/contracts` (shared Zod /
TypeScript contracts), and later `packages/testkit`.

- Reason: feature modules are not shared packages; they live under `apps/api`.

## 2026-09-09 — `apps/web` is the planned future UI (retained, deferred)

`apps/web` is a fresh Next.js starter retained as the planned future user
interface for administration, review and approval queues, operational
reporting, and dashboards. Its status is `PLANNED_UI — retained,
implementation deferred`. It is **not** legacy and **not** a component to
remove; its code must not be modified in the current alignment task.

- Reason: the UI is a real future product surface, not scaffolding to discard;
  implementation is deferred until business slices exist to expose through it.

## 2026-09-09 — Worker is `apps/worker`, not root `workers/*`

A future BullMQ worker is `apps/worker` (created only when long-running jobs
genuinely require it). There is **no** root-level `workers/*` directory.

- Reason: consistent with `apps/*` being the runtimes workspace.

## 2026-09-09 — T-003 is the first code task (scope not yet created)

T-003 will be the clean API/database foundation plus the minimal central
business spine (Product, ProductFact, Opportunity, OpportunityOffer,
TargetMarket, Task, Execution, Activity, Source, Claim, ResearchContextService).
Its exact scope is intentionally **not** created yet.

- Reason: code work starts only after this documentation alignment is reviewed.

## 2026-09-09 — Modular NestJS rebuild

The system is rebuilt as a **modular NestJS system** (bounded domain modules),
not separate autonomous applications.

- Reason: one process/one DB, injectable services, single REST boundary, and
  a thin control-plane that routes and audits.

## 2026-09-09 — Central PostgreSQL as single source of truth

PostgreSQL is the only live state. Markdown files are historical evidence or
generated reports.

- Reason: one business source of truth; no module-private long-term state.

## 2026-09-09 — One Prisma schema and migration chain

`packages/database` is the sole owner of the schema and migrations.

- Reason: prevents schema drift and duplicated migration chains.

## 2026-09-09 — Explicit table ownership (single writer per table)

Every table has exactly one write-owner module; cross-boundary changes go
through the owning module's service.

- Reason: prevents modules reaching into unrelated tables; makes permission
  boundaries enforceable (see `data-ownership.md`).

## 2026-09-09 — Thin control-plane

The Assistant Manager (control-plane) owns only `tasks`, `executions`,
`activities`, and `research_contexts` — not business tables.

- Reason: keeps orchestration/audit separate from domain logic.

## 2026-09-09 — Versioned Research Context (research_context_v1)

Research modules receive only `taskId` + `opportunityId`; product data is
loaded from a frozen, versioned context — never from prompts/files.

- Reason: prevents prompt drift and unsafe fact assertion (see
  `contracts/research-context.v1.md`).

## 2026-09-09 — Typed product facts

Product facts are `CONFIRMED` / `PENDING` / `RESTRICTED` / `SUPERSEDED`,
append-only, and authored only by humans or trusted product-data sources.

- Reason: only CONFIRMED facts may be asserted; restricted/pending values are
  redacted; superseded values are audit-only.

## 2026-09-09 — Research-records single-writer module

`research_records` and `research_findings` are owned solely by
`research-records`; research modules call its service with a type
discriminator.

- Reason: eliminates split ownership of a shared table.

## 2026-09-09 — Human approval gates

Target-market changes, company/contact acceptance (where configured), outreach
sending, and any commercial commitment require human approval.

- Reason: human control is a product feature and a compliance requirement.

## 2026-09-09 — BullMQ direction, no worker yet

Long-running work will use BullMQ; a worker process reuses the same services
and Prisma package. No worker is implemented now.

- Reason: REST is for external clients, not internal module communication.

---

## Prior (historical) decisions

The earlier opportunity-centred plan and market-research harness live in
`../legacy/`. They are non-live historical input and are superseded by the
decisions above where they conflict.
