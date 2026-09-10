# Project State (Canonical)

**Status:** Canonical, live snapshot. Last updated 2026-09-10 (post-review
documentation reconciliation of O-005/T-006).
**Companion:** `architecture.md`, `module-map.md`, `data-governance.md`,
`research-context-contract.md`, `decisions.md`.

This is a truthful snapshot of what exists, what does not, what is blocked, and
what comes next. It never contains live business values (those live only in
PostgreSQL).

---

## Implemented

| Area | Detail | Evidence |
|---|---|---|
| Repository workspace | Node 24 + pnpm 11 monorepo under `soft/` (pnpm workspaces: `apps/*`, `packages/*`) | `soft/packages/database`, `soft/apps/api`, `soft/apps/web` |
| Clean API host | NestJS 11 + Fastify, native ESM, strict TypeScript, structured pino logging, env validation (`NODE_ENV`, `PORT`) | `soft/apps/api/src` |
| Liveness endpoint | `GET /health` → `200 {"status":"ok"}` (no DB dependency) | `soft/apps/api/src/health/health.controller.ts` |
| Readiness endpoint | `GET /ready` → `200 {"status":"ready"}` via safe `SELECT 1`; non-sensitive `503 {"status":"not_ready"}` on failure | `soft/apps/api/src/health/readiness.controller.ts` |
| Central database | Local PostgreSQL 17 via project-scoped Docker Compose (host port 54329) | `soft/docker-compose.yml` |
| Prisma foundation | Prisma 7, ESM `prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`; `soft/packages/database` is the single schema/migration owner | `soft/packages/database` |
| Migrations | `20260910112935_init` and `20260910150428_research_context_fields` applied; `prisma migrate status` clean | `soft/packages/database/prisma/migrations` |
| Core commercial schema | `Product`, `Offer`, `ProductFact` (CHECK-constrained), `TargetMarket`, `Opportunity` (with `contextVersion`/`objective`), `OpportunityTargetMarket`, `ResearchRun`, `ResearchRunTargetMarket`; `Product.category` | `soft/packages/database/prisma/schema.prisma` |
| Shared contracts | `@ai-sdr/contracts` (Zod 4 + TypeScript) implements the canonical `research_context_v1` and the write-side input schemas | `soft/packages/contracts` |
| Initial feature modules | `products-and-offers` (Product/Offer/ProductFact writes), `opportunities` (TargetMarket/Opportunity + join + context-version increments), and a minimal `control-plane` (`ResearchContextService` assembly with redaction) | `soft/apps/api/src/modules` |
| Catalogue + Research Context API | `POST /products`, `POST /products/:productId/offers`, `POST /product-facts`, `POST /target-markets`, `POST /opportunities`, `POST /opportunities/:opportunityId/target-markets`, `GET /opportunities/:opportunityId/research-context` | `soft/apps/api/src/modules` |
| Internal-key boundary | Every business route requires `x-internal-api-key`; constant-time check, fail-closed non-sensitive `503` when `INTERNAL_API_KEY` is unconfigured, non-sensitive `401` otherwise; key never logged or returned. `GET /health`/`GET /ready` stay public | `soft/apps/api/src/security` |
| Tests | Database integration tests (isolated `ai_sdr_test`), contract tests, and API integration tests including the catalogue/research-context slice (isolated `ai_sdr_test_api`); API health/readiness/env tests still pass | `soft/packages/database/test`, `soft/packages/contracts/test`, `soft/apps/api/test` |
| Root manager workspace | Root `AGENTS.md`, `ops/` task loop, `docs/system/` canonical docs, root `.gitignore` | this repository root |

The **Catalogue + Research Context API** vertical slice (O-005/T-006) is
implemented and awaiting human review: an operator enters canonical product,
offer, product-fact, target-market, and opportunity data once, and `GET
/opportunities/:id/research-context` returns the current assembled
`research_context_v1` (CONFIRMED+OPERATIONAL values, PENDING/RESTRICTED redacted,
SUPERSEDED omitted).

`soft/apps/web` is a retained **planned UI** (implementation deferred), not
implemented functionality.

---

## Not implemented

- Business feature modules beyond the initial slice: `knowledge`, `evidence`,
  `research-records`, `market-researcher`, `lead-discoverer`, `lead-evaluator`,
  `company-intelligence`, `contact-discovery`, `outreach-drafter`, `approvals`,
  `jobs`.
- Control-plane task routing, executions, activities, approval routing, and Task
  scope. Only the `ResearchContextService` read-model assembler exists today;
  ResearchContext `scope` is derived from the Opportunity's attached target
  markets until the Task table lands.
- Immutable Research Context snapshots (`research_contexts`) and the
  research-run endpoints (`POST`/`GET /opportunities/:id/research-runs`). The
  implemented `GET .../research-context` returns a **current assembled** context,
  not a frozen research-run snapshot.
- `market-researcher` (first AI vertical) and BullMQ `jobs`.
- Worker process (`soft/apps/worker`).
- UI (`soft/apps/web`).
- Per-opportunity commercial terms (`opportunity_offers`); fact append-only
  versioning; research records/findings; sources/claims; companies/contacts.
- `evidence` resolution, so asserted facts carry `sourceLabel` and an empty
  `evidence` array; knowledge/companies/human-decision context sections are
  empty.

See `module-map.md` for the full intended module set and status markers.

---

## Blocked

- None. The repository baseline is established: the root repository exists,
  `main` tracks `origin/main`, and baseline commit
  `0c6a10103519b9065654ad4ba8e51a6aa3d2058d` was pushed; the working tree was
  clean immediately after the push. T-005 (commit/push foundation baseline) was
  attempted, blocked on the then-missing remote, and then **superseded** by the
  decision to establish this root manager workspace first; the baseline was
  completed under O-002 (see
  `ops/done/2026-09-10-commit-push-complete-project-baseline.md`). The prior
  block on a missing `origin` remote is resolved.

---

## Next planned functional slice

**Knowledge + Approvals (human gate)** — the next slice after the implemented
Catalogue + Research Context API (which is awaiting human review):

- `knowledge` versioned entities (customer profiles, buyer personas, value
  propositions);
- `approvals` request/decision tables and the human gate that a fact moves
  `PENDING → CONFIRMED` through.

Ref: `module-map.md` §§4, 14; `research-context-contract.md` §10.

---

## Sequencing after the first slice (planned)

The first slice (Catalogue + Research Context API) is implemented and awaiting
review. Remaining sequence:

1. Knowledge + Approvals (human gate).
2. Research-records + Market Researcher (+ jobs/worker).
3. Discovery & intelligence (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
4. Outreach + inbox (post-MVP).
