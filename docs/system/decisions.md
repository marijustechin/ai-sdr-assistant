# Decisions (Canonical)

**Status:** Canonical, live decision log. Newest first.
**Supersedes:** `docs/redesign/*` as decision authority; consolidates and
supersedes `soft/docs/decisions.md` (which remains the implementation-local
companion).
**Companion:** `architecture.md`, `data-governance.md`,
`research-context-contract.md`, `project-state.md`; root `AGENTS.md`.

Every consequential design decision is recorded here with a date, the decision,
and the reason. The agent must not silently override a recorded decision.

---

## 2026-09-10 — Business endpoints sit behind an internal API key (T-006)

Every implemented business endpoint (Product/Offer/ProductFact, TargetMarket,
Opportunity, target-market attachment, and the research-context read) requires
the `x-internal-api-key` header. The check is constant-time; when
`INTERNAL_API_KEY` is unconfigured the guard fails closed with a non-sensitive
503; a missing/wrong key returns a non-sensitive 401. The key is never logged,
returned, or embedded in an error. `GET /health` and `GET /ready` remain public.
This is service-to-service identification only — **not** user authentication
(no users, roles, sessions, or JWT).

- Reason: business writes and context reads must not be open by default, while
  keeping operational liveness/readiness simple.

## 2026-09-10 — Research Context v1 is current-assembled, not yet frozen (T-006)

`GET /opportunities/:id/research-context` returns a **current assembled**
`research_context_v1` payload: `schemaVersion` is the contract literal and
`contextVersion` is the Opportunity's current revision (incremented with the
triggering write — target-market attachment or a relevant fact creation).
It is **not** an immutable or research-run snapshot. A future
ResearchRun/`research_contexts` capability will freeze the exact context for
audit and reproducibility at a binding version. Redaction (PENDING/RESTRICTED
values withheld) and SUPERSEDED omission remain mandatory and are enforced at
assembly time.

- Reason: deliver a usable context read path now without overstating
  reproducibility guarantees that only frozen snapshots can provide.

## 2026-09-10 — Initial feature modules implemented (T-006)

The first business modules now exist: `products-and-offers`, `opportunities`,
and a minimal `control-plane` (`ResearchContextService`), with shared
`packages/contracts` implementing the canonical contract. The remaining modules
(`knowledge`, `evidence`, `research-records`, `market-researcher`, discovery,
outreach, `approvals`, `jobs`) and the `research_contexts` snapshot remain
planned.

- Reason: record the implemented reality so `project-state.md` and
  `module-map.md` no longer describe the modules as entirely absent.

## 2026-09-10 — Legacy evidence is immutable; whitespace checking must not force normalization

`legacy/**` is historical, non-live evidence and is **immutable**: it must not
be edited to satisfy tooling. A repository-root `.gitattributes` rule disables
Git's trailing-whitespace check for `legacy/**` **only**, so
`git diff --cached --check` never forces normalisation of historical content.
All other paths — source, docs, ops tasks, migrations, and archived
`soft/tasks/**` records — retain the default whitespace checking
(`blank-at-eol`, `blank-at-eof`, `space-before-tab`).

- Reason: preserve historical evidence verbatim while keeping the pre-commit
  whitespace gate meaningful for authored content. A failing check must not be
  accepted as a warning, and historical content must not be rewritten.

## 2026-09-10 — Root Manager Workspace and one documentation hierarchy (O-001)

The repository root gains a **Manager Workspace** (root `AGENTS.md`,
`ops/` task loop, `docs/system/` canonical docs, root `.gitignore`). There is
one canonical documentation set (`docs/system/`); `docs/redesign/` is marked
historical/superseded; `soft/docs/` remains the implementation/testing/security
set and links to the canonical root.

- Reason: the repository needs a manager-level workspace and a single clear
  documentation hierarchy before any baseline commit.

## 2026-09-10 — Markdown is never live business state

PostgreSQL (owned by `soft/packages/database`) is the single source of live
business state. Markdown serves exactly four purposes: instructions, decisions,
historical evidence, and generated reports. It must never act as a competing
store for products, offers, facts, opportunities, target markets, research runs,
findings, companies, contacts, or leads.

- Reason: one business source of truth; prevents drift and stale duplicate data.

## 2026-09-10 — `docs/redesign/` superseded by `docs/system/`

`docs/redesign/` is retained as historical proposal material only. The canonical,
reconciled architecture lives in `docs/system/`. The redesign's stale elements
(Bun workspaces, root `modules/`, root `workers/`, `repository.base.ts`,
`RESTRICTED` as a status) are superseded.

- Reason: preserve rationale without propagating outdated design.

## 2026-09-10 — Workspace TypeScript boundary: typecheck on source, build on dist

`soft/apps/api` maps `@ai-sdr/database` to the package source for type-checking
and tests (`paths` + vitest alias), while the emitted build resolves the
compiled `dist`. The Prisma client is generated by the root `postinstall` and by
the database package's `build`/`typecheck` scripts.

- Reason: root `pnpm typecheck` must pass from a clean install with no compiled
  `packages/database/dist`, without making typecheck depend on a prior build.

## 2026-09-10 — No generic `RepositoryBase`; direct Prisma client boundary

`soft/packages/database` exposes only the Prisma schema, generated client, and
`PrismaService`. Module-owned typed repositories are added only when a real
consumer needs them.

- Reason: avoid an abstraction prepared for imaginary future modules.

## 2026-09-10 — API loads the workspace root `.env` at runtime

`soft/apps/api` loads the workspace root `.env` at startup via
`process.loadEnvFile` (existence-guarded). Existing environment variables take
precedence; nothing is read, logged, or echoed.

- Reason: the API is a separate process from the Prisma CLI; local
  development/runtime must not require exporting `DATABASE_URL` first.

## 2026-09-10 — Prisma 7 with driver adapters + `prisma.config.ts`

`soft/packages/database` uses Prisma ORM 7: the ESM `prisma-client` generator
with a required `output`, the `@prisma/adapter-pg` driver adapter, and
`prisma.config.ts` (with `dotenv` for the CLI). Generated client lives under
`src/generated` (git-ignored).

- Reason: current Prisma conventions; Prisma 7 no longer auto-loads `.env`,
  requires a custom `output`, and requires a driver adapter.

## 2026-09-10 — `Offer` is a sellable product form

`Offer` is the concrete sellable product form (variant) belonging to exactly one
`Product`; an `Opportunity` belongs to one `Offer`. This refines the earlier
`opportunity_offers` placeholder (per-opportunity commercial terms), which is
deferred.

- Reason: the minimal commercial domain needs a sellable variant distinct from
  per-opportunity commercial terms.

## 2026-09-10 — ProductFact subject/value rules as DB CHECK constraints

`ProductFact`'s "exactly one of Product/Offer" and "at least one value" rules are
enforced with hand-authored CHECK constraints in the migration, because Prisma
cannot express CHECK constraints.

## 2026-09-10 — Fact status and visibility are separate dimensions

`ProductFact.status` ∈ `PENDING | CONFIRMED | SUPERSEDED` and
`ProductFact.visibility` ∈ `OPERATIONAL | RESTRICTED`. `RESTRICTED` is a
visibility dimension, not a status.

- Reason: the implemented model separates assertability from value exposure.

## 2026-09-10 — Lazy Prisma client + `SELECT 1` readiness

`GET /health` stays a DB-free liveness check. `GET /ready` runs a safe
`SELECT 1` through a lazily-created `PrismaService` and returns a non-sensitive
503 on failure.

## 2026-09-10 — Isolated `ai_sdr_test` database for integration tests

Database-package tests run against a disposable `ai_sdr_test` database (created
idempotently, migrated, truncated between tests); they never write to the
development database.

## 2026-09-10 — Explicit `@Inject()` tokens for DI constructor params

NestJS providers/controllers inject by constructor parameter using an explicit
`@Inject(Token)`, not `emitDecoratorMetadata` (not emitted by esbuild-based
runners such as vitest/tsx).

---

## Prior decisions (2026-09-09)

- **Node 24 + pnpm 11 replace Bun.** `.nvmrc` = `24.20.0`;
  `packageManager` = `pnpm@11.26.0`; `pnpm-lock.yaml` is the single lockfile.
- **Modular NestJS rebuild.** Bounded modules, one process/one DB, injectable
  services, one REST boundary.
- **Feature modules live in `soft/apps/api/src/modules/<module>/`.** No root
  `modules/*` workspace.
- **`soft/packages/*` holds only shared packages.** `database` (schema/
  migrations), `contracts` (Zod/TS), later `testkit`.
- **`soft/apps/web` is the planned future UI** (retained, implementation
  deferred).
- **The worker is `soft/apps/worker`**, not a root `workers/` directory
  (created only when long-running jobs require it).
- **Central PostgreSQL is the single source of truth.** Markdown is historical
  evidence or generated reports.
- **One Prisma schema and migration chain** in `soft/packages/database`.
- **Explicit table ownership (single writer per table);** cross-boundary changes
  go through the owning module's service.
- **Thin control-plane:** owns only `tasks`, `executions`, `activities`,
  `research_contexts` — not business tables.
- **Versioned Research Context (`research_context_v1`):** research modules
  receive only `taskId` + `opportunityId`; product data comes from a frozen,
  versioned context.
- **Typed product facts:** `PENDING | CONFIRMED | SUPERSEDED` plus visibility
  `OPERATIONAL | RESTRICTED`; authored only by humans/trusted product-data
  sources.
- **`research-records` is the single write-owner** of `research_records` and
  `research_findings`.
- **Human approval gates:** target-market changes, company/contact acceptance
  where configured, outreach sending, and any commercial commitment.
- **BullMQ direction, no worker yet.**

The earlier opportunity-centred plan and market-research harness live in
`legacy/` as non-live historical input, superseded where they conflict.
