# Project State (Canonical)

**Status:** Canonical, live snapshot. Last updated 2026-09-10.
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
| Migration | Initial migration `20260910112935_init` applied; `prisma migrate status` clean | `soft/packages/database/prisma/migrations` |
| Core commercial schema | `Product`, `Offer`, `ProductFact` (CHECK-constrained), `TargetMarket`, `Opportunity`, `OpportunityTargetMarket`, `ResearchRun`, `ResearchRunTargetMarket` | `soft/packages/database/prisma/schema.prisma` |
| Tests | Database integration tests (isolated `ai_sdr_test`) and API health/readiness/env tests pass | `soft/packages/database/test`, `soft/apps/api/test` |
| Root manager workspace | Root `AGENTS.md`, `ops/` task loop, `docs/system/` canonical docs, root `.gitignore` | this repository root |

`soft/apps/web` is a retained **planned UI** (implementation deferred), not
implemented functionality.

---

## Not implemented

- Business feature modules (`products-and-offers`, `opportunities`,
  `control-plane`, `knowledge`, `evidence`, `research-records`,
  `market-researcher`, `lead-discoverer`, `lead-evaluator`,
  `company-intelligence`, `contact-discovery`, `outreach-drafter`, `approvals`,
  `jobs`) — none exist; `soft/apps/api/src/modules/` is empty.
- Control plane (task routing, executions, activities, approval routing).
- `ResearchContextService` and Research Context assembly/redaction; the
  `research_contexts` snapshot and the research-run endpoints.
- `market-researcher` (first AI vertical) and BullMQ `jobs`.
- Worker process (`soft/apps/worker`).
- `soft/packages/contracts` (shared Zod schemas/types).
- UI (`soft/apps/web`).
- Per-opportunity commercial terms (`opportunity_offers`); fact append-only
  versioning; research records/findings; sources/claims; companies/contacts.

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

**Catalogue + Research Context API** — delegated as one `soft/tasks/current.md`
implementation task:

- `products-and-offers` + `opportunities` application services over the
  implemented schema;
- a thin `control-plane` skeleton (Task scope) and `ResearchContextService`
  assembly with redaction (CONFIRMED/OPERATIONAL asserted, PENDING and RESTRICTED
  redacted, SUPERSEDED absent);
- `GET /opportunities/:opportunityId/research-context` returning
  `schemaVersion: research_context_v1`.

Ref: `research-context-contract.md`, `module-map.md`.

---

## Sequencing after the first slice (planned)

1. Knowledge + Approvals (human gate).
2. Research-records + Market Researcher (+ jobs/worker).
3. Discovery & intelligence (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
4. Outreach + inbox (post-MVP).
