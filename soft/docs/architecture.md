# Architecture

> **Canonical source:** system/business architecture lives at the repository root
> in [`docs/system/architecture.md`](../../docs/system/architecture.md). This
> file is the implementation-local view of the `soft/` workspace; the root
> canonical document wins on conflict.

**Status:** Implementation view (self-contained within `soft/`). Central
database foundation and the core commercial domain are established (T-004); the
first vertical slice — `products-and-offers`, `opportunities`, and the
`control-plane` research-context assembly — is implemented (T-006). Remaining
business modules are not yet implemented.
**Date:** 2026-09-10
**Companion:** `module-boundaries.md`, `data-ownership.md`, `data-model.md`, `task-execution.md`, `contracts/research-context.v1.md`, `security.md`, `testing.md`, `decisions.md`.
**Canonical companion (root):** [`docs/system/`](../../docs/system/).

---

## 1. Goal

A **modular NestJS system** for sales research and prospecting, where:

- a thin "control-plane" (Assistant Manager) owns routing, execution, approval and audit;
- "mini-assistants" are **bounded domain modules**, not autonomous applications;
- every module reads and writes **one central PostgreSQL database** through the Prisma package;
- PostgreSQL is the single business source of truth — Markdown files are historical evidence or generated reports, never live state.

---

## 2. Non-Negotiable Principles

1. **One process, one REST boundary.** `apps/api` is the single NestJS/Fastify host. Internal modules communicate by **injected application services and repositories in the same process**, never over HTTP.
2. **One database.** PostgreSQL is the only live state. No module keeps private long-term state outside it.
3. **One schema, one migration owner.** `packages/database` owns the Prisma schema and all migrations. The control-plane does **not** own the whole schema.
4. **Explicit read/write permissions.** Every module declares which tables it reads and which it writes. No module performs arbitrary direct writes to unrelated tables. Repositories and domain services enforce these boundaries.
5. **Bounded modules, not free agents.** Each mini-assistant has typed I/O contracts, structured LLM output where AI is needed, source/claim persistence, execution limits, retries and audit records.
6. **Human approval is mandatory** before: target-market changes; company/contact acceptance where configured; outreach sending; any commercial commitment.
7. **Evidence over reasoning.** Facts, inferences and unknowns are separated. No chain-of-thought storage. Sources and claims are persisted (see `evidence` module).
8. **BullMQ for long-running work.** A future worker process reuses the same application services and Prisma package. REST is for external clients, not internal worker-to-module communication. No worker implementation yet.
9. **Versioned Research Context.** Research modules receive only `taskId` + `opportunityId` and obtain everything else from a frozen, versioned `ResearchContext` (see `contracts/research-context.v1.md`). Product facts are typed (`CONFIRMED` / `PENDING` / `RESTRICTED` / `SUPERSEDED`); only CONFIRMED facts may be asserted.

---

## 3. Module Set

| # | Module | One-line responsibility |
|---|---|---|
| 1 | `control-plane` | Assistant Manager: task routing, executions, activities, approval routing, ResearchContext assembly |
| 2 | `opportunities` | Opportunity + TargetMarket lifecycle |
| 3 | `products-and-offers` | Product catalog + per-opportunity offers + versioned typed facts |
| 4 | `knowledge` | Customer profiles, buyer personas, value propositions (versioned) |
| 5 | `evidence` | Source references + claims (FACT / INFERENCE / UNKNOWN) |
| 6 | `research-records` | Single write-owner of `research_records` + `research_findings` |
| 7 | `market-researcher` | Market research → findings + target-market suggestions + clarification requests |
| 8 | `lead-discoverer` | Company discovery + deduplication |
| 9 | `lead-evaluator` | Qualification/scoring → qualification records |
| 10 | `company-intelligence` | Deep company research → company profiles |
| 11 | `contact-discovery` | Contact discovery + email pattern inference |
| 12 | `inbox-intelligence` | Inbox ingestion + reply analysis (post-MVP, module reserved) |
| 13 | `outreach-drafter` | Evidence-based outreach drafts |
| 14 | `approvals` | Approval workflow engine and mutation application |
| 15 | `jobs` | BullMQ queue/worker wiring and job lifecycle |

### Cross-cutting service: `ResearchContextService`

Owned by `control-plane`, this assembles the versioned `ResearchContext`
(opportunity + product + offer + typed facts + target markets + prior runs +
companies + approved knowledge + human decisions) that research modules
consume. Research modules receive only `taskId` + `opportunityId`, resolve
their **scope** from the `Task`, and call this service — via DI in-process, or
via the identical REST contract (`GET /opportunities/:id/research-context`)
when running as a worker. Full contract: `contracts/research-context.v1.md`.

---

## 4. Layered Architecture

Every module lives under `apps/api/src/modules/<module>/` and uses the same
internal layering:

```text
apps/api/src/modules/<module>/
├── domain/           # entities, value objects, invariants, repository interfaces
├── application/      # application services, use-cases, input/output DTOs
├── infrastructure/   # Prisma repositories, external adapters (search, LLM, scrape)
├── presentation/     # controllers (apps/api only) and CLI commands
└── <module>.module.ts
```

Rules:

- `domain` has **no** NestJS, Prisma, or HTTP imports.
- `application` depends on `domain` interfaces and `packages/contracts`.
- `infrastructure` implements `domain` repository interfaces with Prisma and external adapters.
- `presentation` exists only in `apps/api` (controllers) or `jobs` (CLI/commands); modules expose **services**, not controllers.
- Cross-module calls go through another module's **application service**, never directly into its repository or database table.

---

## 5. The Central Database and Access Pattern

- `packages/database` exposes the Prisma schema, the generated client, and `PrismaService` — the direct Prisma client boundary. There is deliberately no generic repository abstraction; a module adds a typed repository only when a real consumer needs one.
- Modules receive an injected repository **scoped** to the tables that module owns.
- Read access to another module's tables is allowed only through that module's application service or a **read-model query service** it exports. Direct cross-table writes are forbidden.
- The control-plane does **not** own business tables. It owns `tasks`, `executions`, `activities`, `research_contexts`, and coordinates `approval_requests` (owned by `approvals`).

The T-004 foundation establishes the single PostgreSQL database (Docker
Compose, Postgres 17), the Prisma 7 schema + migration chain, and the minimal
commercial domain (`Product`, `Offer`, `ProductFact`, `TargetMarket`,
`Opportunity`, `OpportunityTargetMarket`, `ResearchRun`,
`ResearchRunTargetMarket`). See `docs/data-model.md` for the canonical model,
relationships, ownership, and constraints.

**Build/typecheck boundary:** `apps/api` type-checks against the
`packages/database` source through a TypeScript `paths` mapping, so root
`pnpm typecheck` passes with no prior build / no compiled
`packages/database/dist`. The emitted build (`tsconfig.build.json`) clears that
mapping and resolves the package's compiled `dist` entry; `pnpm -r build`
builds `packages/database` first (topological order). The Prisma client is
generated by the root `postinstall` on install and by the database package's
`build`/`typecheck` scripts.

---

## 6. Folder Tree (within `soft/`)

```text
soft/
├── apps/
│   ├── api/                        # NestJS + Fastify host (the only runtime today)
│   │   └── src/
│   │       ├── main.ts             # bootstrap, Fastify, global pipes/filters
│   │       ├── app.module.ts       # composition root: imports all modules + packages
│   │       ├── config/             # env validation + configuration
│   │       ├── health/             # health + readiness endpoints
│   │       └── modules/            # bounded domain modules (NestJS modules)
│   │           ├── control-plane/
│   │           ├── opportunities/
│   │           ├── products-and-offers/
│   │           ├── knowledge/
│   │           ├── evidence/
│   │           ├── research-records/
│   │           ├── market-researcher/
│   │           ├── lead-discoverer/
│   │           ├── lead-evaluator/
│   │           ├── company-intelligence/
│   │           ├── contact-discovery/
│   │           ├── inbox-intelligence/
│   │           ├── outreach-drafter/
│   │           ├── approvals/
│   │           └── jobs/
│   │               └── <each module>/
│   │                   ├── domain/
│   │                   ├── application/
│   │                   ├── infrastructure/
│   │                   └── <module>.module.ts
│   ├── web/                        # planned future UI (PLANNED_UI; retained, implementation deferred)
│   └── worker/                     # future: BullMQ worker (reuses modules + packages)
│
├── packages/
│   ├── database/                   # SINGLE Prisma schema + migration owner
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── prisma.config.ts        # Prisma 7 CLI config (datasource url, migrations)
│   │   └── src/
│   │       ├── prisma.service.ts
│   │       ├── generated/          # generated Prisma client (git-ignored)
│   │       └── index.ts
│   ├── contracts/                  # shared Zod schemas + TS types (module I/O)
│   │   └── src/
│   └── testkit/                    # future: shared test helpers/fixtures
│
├── docs/                           # self-contained architecture + contracts
├── harness/                        # task template + acceptance checklist
├── scripts/                        # verify.sh
├── tasks/                          # backlog.md, current.md, done/
├── docker-compose.yml              # local PostgreSQL 17 (project-scoped)
├── .env.example                    # safe dev env template (DATABASE_URL, POSTGRES_*)
└── package.json                    # pnpm workspaces: apps/*, packages/*
```

---

## 7. Runtime Model (summary)

Two processes are envisioned, one for the MVP:

1. **API process** (`apps/api`) — hosts all modules, serves REST, enqueues jobs. The only process required for the first slice.
2. **Worker process** (`apps/worker`) — future; consumes BullMQ queues using the **same** module application services and Prisma package. It is a sibling, not a separate application.

Internal communication is **synchronous service calls** (in-process) or **events/jobs** (async, long-running). There is no HTTP between modules.

```text
control-plane routes a Task
        ↓
jobs enqueues → worker runs module service
        ↓
module service → evidence.registerSources / persistClaims
        ↓
module service → emit domain events + create Execution records via control-plane
        ↓
approvals.createRequest (where a human gate is required)
        ↓
human approve/reject → approvals applies the mutation via the owning module's service
        ↓
control-plane records Activity + updates Task/Execution state
```

See `task-execution.md` for full lifecycle, retries, idempotency and event vocabulary.

---

## 8. What This Deliberately Avoids

- No autonomous agent framework; modules are deterministic services with optional structured LLM calls.
- No general-purpose orchestrator; control-plane is a thin routing/audit layer.
- No module-to-module HTTP.
- No per-module databases or migrations.
- No chain-of-thought persistence.
- No auto-send, auto-approval, or auto-mutation of commercial state.

---

## 9. Historical Input (non-live)

| Historical material (in `../legacy/`) | Treatment |
|---|---|
| `ai-sdr-assistant-mvp-plan-v2.md` | Domain inspiration only (entities, phases, evidence rules). Not the implementation authority. |
| `docs/market-research-harness.md` | Reused as the operating contract for `market-researcher` and `evidence` (manifest, source/claim schema, price rules, partial-result rules, test fixtures). |
| `docs/research/thermo-abachi-*.md` | Historical evidence; importable into the DB as source/claim records, not live state. |
| `phase-0-research/*` | Historical evidence and terminology. Importable, never authoritative. |
| `soft/apps/api/**` (old scaffold) | Replaced by a clean `apps/api` host + `packages/database` (decision recorded in `decisions.md`). |

These live outside `soft/` and must not be modified from this workspace.
