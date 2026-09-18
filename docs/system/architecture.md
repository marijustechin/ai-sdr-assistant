# System Architecture (Canonical)

**Status:** Canonical, live. Reconciled with implemented reality through T-004
(2026-09-10).
**Supersedes:** `docs/redesign/architecture.md` (historical proposal).
**Companion:** `module-map.md`, `data-governance.md`, `research-context-contract.md`,
`decisions.md`, `project-state.md`; root `AGENTS.md`.

---

## 1. Goal

A **modular NestJS system** for B2B sales research and prospecting:

- a thin **control-plane** (Assistant Manager) owns task routing, execution,
  approval routing, audit, and Research Context assembly;
- **mini-assistants are bounded domain modules**, not autonomous applications;
- every module reads and writes **one central PostgreSQL database** through
  `soft/packages/database`;
- **PostgreSQL is the single source of live business state**; Markdown is
  instructions, decisions, historical evidence, or generated reports.

---

## 2. Non-Negotiable Principles

1. **One process, one REST boundary.** `soft/apps/api` is the single
   NestJS/Fastify host. Internal modules communicate by injected application
   services in the same process, never over HTTP.
2. **One database.** PostgreSQL is the only live state. No module keeps private
   long-term state outside it.
3. **One schema, one migration owner.** `soft/packages/database` owns the Prisma
   schema and all migrations. The control-plane does **not** own the schema.
4. **Explicit read/write permissions.** Every table has exactly one write-owner
   module (`data-governance.md`). No module writes another module's tables.
5. **Bounded modules, not free agents.** Modules have typed I/O contracts,
   structured LLM output where AI is needed, source/claim persistence,
   execution limits, retries, and audit records.
6. **Automation-first; approval only for sending and commitments.** Within an
   approved task, the pipeline runs autonomously within the approved scope, tool
   permissions and execution limits: **product/objective intake → research →
   candidate discovery → evidence-based qualification → contact discovery →
   initial email drafting**. Routine persistence is authorized by the approved
   task and needs **no per-step human approval**: recording a qualification, a
   contact, provenance, and progress/checkpoints are **normal API writes**.
   Human approval is required only before **sending any message (outreach)** and
   **making a commercial commitment**; applying research suggestions as business
   state (e.g. target-market changes) remains human-gated. Human review of
   research candidates (shortlist / reject) is an **optional override**, not a
   gate: the agent qualifies candidates itself against documented, product-fit,
   evidence-backed criteria (recorded separately from human review), and an
   explicit human rejection always wins. **Email drafting is in scope; sending is
   not authorized.**
7. **Evidence over reasoning.** Facts, inferences, and unknowns are separated.
   No chain-of-thought storage. Sources and claims are persisted.
8. **BullMQ for long-running work.** A future worker
   (`soft/apps/worker`) reuses the same application services and Prisma package.
   REST is for external clients, not internal worker-to-module communication.
9. **Versioned Research Context.** Research modules receive only `taskId` +
   `opportunityId` and obtain everything else from a frozen, versioned
   `ResearchContext` (`research-context-contract.md`). Only CONFIRMED facts may
   be asserted.

---

## 3. Module Set

Feature modules live in **`soft/apps/api/src/modules/<module>/`**. There is **no
root `modules/` workspace**.

| # | Module | Responsibility | Status |
|---|---|---|---|
| 1 | `control-plane` | Task routing, executions, activities, approval routing, `ResearchContextService` | **not implemented** |
| 2 | `opportunities` | Opportunity + TargetMarket lifecycle; workspace read model | **not implemented** |
| 3 | `products-and-offers` | Product catalog, sellable offers, typed facts | **not implemented** |
| 4 | `knowledge` | Customer profiles, buyer personas, value propositions (versioned) | **not implemented** |
| 5 | `evidence` | Source references + claims (FACT / INFERENCE / UNKNOWN) | **not implemented** |
| 6 | `research-records` | Single write-owner of `research_records` + `research_findings` | **not implemented** |
| 7 | `market-researcher` | Market research → findings + target-market suggestions + clarification requests | **not implemented** |
| 8 | `lead-discoverer` | Company discovery + deduplication | **not implemented** |
| 9 | `lead-evaluator` | Qualification/scoring → qualification records | **not implemented** |
| 10 | `company-intelligence` | Deep company research → company profiles | **not implemented** |
| 11 | `contact-discovery` | Contact discovery + email-pattern inference | **not implemented** |
| 12 | `inbox-intelligence` | Inbox ingestion + reply analysis (reserved, post-MVP) | **not implemented** |
| 13 | `outreach-drafter` | Evidence-based outreach drafts | **not implemented** |
| 14 | `approvals` | Approval workflow engine + mutation application | **not implemented** |
| 15 | `jobs` | BullMQ queue/worker wiring + job lifecycle | **not implemented** |

What **is** implemented today is the host + data foundation, not the modules:
the API host, liveness/readiness endpoints, the central PostgreSQL database, the
Prisma schema/migration, and the core commercial schema (see
`project-state.md`).

### Cross-cutting service: `ResearchContextService`

Owned by `control-plane`, assembles the versioned `ResearchContext`
(opportunity + product + offer + typed facts + target markets + prior runs +
companies + approved knowledge + human decisions). Research modules receive only
`taskId` + `opportunityId`, resolve scope from the `Task`, and call this service
via DI in-process or the identical REST contract when running as a worker.
Full contract: `research-context-contract.md`.

---

## 4. Layered Architecture

Every module uses the same internal layering under
`soft/apps/api/src/modules/<module>/`:

```text
<module>/
├── domain/           # entities, value objects, invariants, repository interfaces
├── application/      # application services, use-cases, input/output DTOs
├── infrastructure/   # Prisma repositories, external adapters (search, LLM, scrape)
├── presentation/     # controllers (apps/api only) and CLI commands
└── <module>.module.ts
```

Rules:

- `domain` has **no** NestJS, Prisma, or HTTP imports.
- `application` depends on `domain` interfaces and `soft/packages/contracts`.
- `infrastructure` implements `domain` repository interfaces with Prisma and
  external adapters.
- `presentation` exists only in `soft/apps/api` (controllers) or `jobs`
  (CLI/commands); modules expose **services**, not controllers.
- Cross-module calls go through another module's **application service**, never
  directly into its repository or database table.

---

## 5. Central Database and Access Pattern

- `soft/packages/database` is the **only** Prisma schema/migration owner. It
  exposes the Prisma schema, the generated client, and `PrismaService` (the
  direct Prisma client boundary).
- **There is no generic `RepositoryBase` abstraction.** A module adds a typed
  repository only when a real consumer needs one.
- Modules receive an injected repository **scoped** to the tables the module
  owns.
- Read access to another module's tables is allowed only through that module's
  application service or an exported read-model query service. Direct
  cross-table writes are forbidden.
- The control-plane does **not** own business tables. It owns `tasks`,
  `executions`, `activities`, `research_contexts` and coordinates
  `approval_requests` (owned by `approvals`).

### Implemented core commercial schema (T-004)

Defined in `soft/packages/database/prisma/schema.prisma`:

- **Product** — canonical product identity.
- **Offer** — a concrete sellable product form (variant) of one Product; an
  Opportunity belongs to one Offer.
- **ProductFact** — one structured fact about exactly one Product **or** Offer
  (CHECK-enforced). `status` ∈ `PENDING | CONFIRMED | SUPERSEDED`;
  `visibility` ∈ `OPERATIONAL | RESTRICTED`.
- **TargetMarket** — country/region + segment (unique per pair).
- **Opportunity** — the commercial work unit.
- **OpportunityTargetMarket** — explicit join (compound-unique).
- **ResearchRun** — auditable record that research ran for one Opportunity,
  with `contextVersion`, status, and lifecycle timestamps.
- **ResearchRunTargetMarket** — research scope join (compound-unique).

Deferred (not in T-004): per-opportunity commercial terms
(`opportunity_offers`), append-only fact versioning, research records/findings,
sources/claims, and the `research_contexts` snapshot.

---

## 6. Repository Folder Tree

```text
ai-sdr-assistant/
├── AGENTS.md                       # root manager contract
├── ops/                            # root manager task loop
├── docs/system/                    # canonical system/business docs (this set)
├── docs/redesign/                  # HISTORICAL, SUPERSEDED proposals
├── legacy/                         # historical, non-live input
└── soft/                           # implementation workspace (Node 24 + pnpm 11)
    ├── AGENTS.md
    ├── apps/
    │   ├── api/                    # NestJS + Fastify host (only runtime today)
    │   │   └── src/
    │   │       ├── main.ts
    │   │       ├── app.module.ts
    │   │       ├── config/         # env validation + loading
    │   │       ├── database/       # DatabaseModule (PrismaService provider)
    │   │       ├── health/         # health + readiness controllers
    │   │       └── modules/        # bounded feature modules (planned)
    │   └── web/                    # retained planned UI (implementation deferred)
    ├── packages/
    │   ├── database/               # SINGLE Prisma schema + migration owner
    │   │   ├── prisma/schema.prisma + prisma/migrations/
    │   │   ├── prisma.config.ts
    │   │   └── src/{index.ts, prisma.service.ts, generated/}
    │   └── contracts/              # planned: shared Zod schemas + types
    ├── docs/                       # implementation/testing/security/harness
    ├── harness/  scripts/          # programmer template + verify.sh
    └── tasks/                      # programmer task loop
```

The future worker is **`soft/apps/worker`**, not a root `workers/` directory.

---

## 7. Runtime Model

Two processes are envisioned, one for the MVP:

1. **API process** (`soft/apps/api`) — hosts all modules, serves REST, enqueues
   jobs. The only process required for the first slice.
2. **Worker process** (`soft/apps/worker`, future) — consumes BullMQ queues
   using the same module application services and Prisma package.

Internal communication is synchronous service calls (in-process) or events/jobs
(async, long-running). There is no HTTP between modules.

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

See `module-map.md` and `research-context-contract.md`.

---

## 8. Live State vs. Markdown

- PostgreSQL is the single source of live business state.
- Markdown is only: instructions, decisions, historical evidence, or generated
  reports. It is never a competing store for products, offers, facts,
  opportunities, target markets, research runs, findings, companies, contacts,
  or leads.
- `legacy/**` is historical, non-live input — never modified, never
  authoritative.

---

## 9. What This Deliberately Avoids

- No autonomous agent framework; modules are deterministic services with
  optional structured LLM calls.
- No general-purpose orchestrator; control-plane is a thin routing/audit layer.
- No module-to-module HTTP.
- No per-module databases or migrations; no root `modules/` or `workers/`.
- No generic repository abstraction.
- No chain-of-thought persistence.
- No auto-send, auto-approval, or auto-mutation of commercial state.
- No live business state in Markdown.
