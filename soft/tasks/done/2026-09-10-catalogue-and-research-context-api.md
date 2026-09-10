# Task: T-006 — Catalogue and Research Context API

**Status:** COMPLETED — APPROVED (archived 2026-09-10)

## Objective

Create the first usable API path where an operator can enter canonical product,
offer, product facts, target market, and opportunity data once; a future market
researcher can then retrieve the appropriate context using only the Opportunity
ID. No product description may be copied into a future researcher prompt.

Implement three NestJS feature modules (`products-and-offers`, `opportunities`,
`control-plane`) under `apps/api/src/modules/`, a shared `packages/contracts`
package (Zod + TS) that implements the canonical root
`docs/system/research-context-contract.md`, one migration, an internal API-key
guard, tests, and docs updates.

## Allowed scope

- `apps/api/src/modules/{products-and-offers,opportunities,control-plane}/`
  and shared API infrastructure (`apps/api/src/common`, `apps/api/src/security`).
- `apps/api/src/config/env.ts`, `apps/api/src/app.module.ts`,
  `apps/api/package.json`, `apps/api/tsconfig*.json`, `apps/api/vitest.config.ts`,
  `apps/api/test/**`.
- `packages/contracts/**` (new workspace package).
- `packages/database/prisma/schema.prisma` + exactly one new migration.
- `soft/docs/security.md`, `soft/docs/data-model.md`, `soft/docs/decisions.md`,
  `soft/docs/contracts/research-context.v1.md`, `soft/.env.example`,
  `soft/scripts/verify.sh`, `soft/docs/architecture.md` (status only).

## Prohibited scope

- ResearchRun endpoints, `research_records`/`research_findings`, sources/claims,
  BullMQ, workers, LLM calls, scraping, lead/company/contact/outreach modules.
- Real Abachi records or any live business data.
- Changing canonical root `docs/system/**`.
- Modifying `../legacy/**`; committing or pushing.

## Architecture references

- `docs/architecture.md`, `docs/module-boundaries.md`, `docs/data-ownership.md`,
  `docs/data-model.md`, `docs/security.md`, `docs/testing.md`,
  `docs/contracts/research-context.v1.md`
- root `../docs/system/research-context-contract.md` (canonical),
  `../docs/system/architecture.md`, `../docs/system/data-governance.md`

## Files/modules expected to change

- `apps/api/src/modules/products-and-offers/**`
- `apps/api/src/modules/opportunities/**`
- `apps/api/src/modules/control-plane/**`
- `apps/api/src/common/zod-validation.pipe.ts`
- `apps/api/src/security/**`
- `apps/api/src/config/env.ts`, `apps/api/src/app.module.ts`
- `packages/contracts/**`
- `packages/database/prisma/schema.prisma` + one migration
- tests, `.env.example`, and the listed `soft/docs/*`

## Schema/migration impact

One migration: add `opportunities.context_version` (int, default 1),
`opportunities.objective` (nullable text), and `products.category` (nullable
varchar). Rollback: drop the three columns (the context version default applies
to existing rows).

## Endpoint/contract impact

- `POST /products`, `POST /products/:productId/offers`,
  `POST /product-facts`, `POST /target-markets`, `POST /opportunities`,
  `POST /opportunities/:opportunityId/target-markets`,
  `GET /opportunities/:opportunityId/research-context`.
- All business routes require the `x-internal-api-key` header; `GET /health`
  and `GET /ready` stay public.
- New `@ai-sdr/contracts` package publishes `research_context_v1` and the
  input schemas.

## Acceptance criteria

- [x] Only the three modules + contracts + one migration change business code.
- [x] Internal API key required on all business routes; missing server config
      fails safely; key never logged or returned.
- [x] Creation routes enforce relations and input rules (SUPERSEDED rejected as
      initial state; CONFIRMED requires a source label; exactly one fact
      subject; at least one value).
- [x] Attaching a target market and creating a relevant fact each change the
      affected Opportunity context version.
- [x] Research context returns `research_context_v1`: CONFIRMED+OPERATIONAL
      facts carry values + source metadata; PENDING/RESTRICTED are redacted;
      SUPERSEDED absent.
- [x] No business endpoint leaks `DATABASE_URL` or `INTERNAL_API_KEY`.
- [x] `health`/`ready` behaviour unchanged.
- [x] Full verification sequence passes under Node 24.20.0.

## Verification commands

- `nvm exec 24.20.0 pnpm --dir soft install --frozen-lockfile`
- `nvm exec 24.20.0 pnpm --dir soft build`
- `nvm exec 24.20.0 pnpm --dir soft typecheck`
- `nvm exec 24.20.0 pnpm --dir soft lint`
- `nvm exec 24.20.0 pnpm --dir soft test`
- `nvm exec 24.20.0 pnpm --dir soft verify`

## Rollback/blocked conditions

- Rollback: `git checkout -- soft/` and reset `tasks/current.md`; drop the new
  migration if applied.
- Blocked if the migration, tests, or verification fail, or if a file outside
  the allowed scope is touched — leave this task in place and record the
  blocker; do not archive.

## Completion record

**Actual implementation summary**

- New workspace package `@ai-sdr/contracts` (Zod 4 + TS) implementing
  `research_context_v1` and all write-side input schemas. `RedactedFact` uses a
  strict object, so a value can never be attached to a redacted fact.
- Three bounded NestJS modules under `apps/api/src/modules/`:
  - `products-and-offers`: `ProductsRepository` (`products`, `offers`,
    `product_facts`), `ProductsAndOffersService`, controllers for
    `POST /products`, `POST /products/:productId/offers`, `POST /product-facts`;
    pure domain invariant `assertFactInvariants`.
  - `opportunities`: `OpportunitiesRepository` (`target_markets`,
    `opportunities`, `opportunity_target_markets` + declared `offers` read),
    `OpportunitiesService`, controllers for `POST /target-markets`,
    `POST /opportunities`, `POST /opportunities/:id/target-markets`; owns the
    context-version increments.
  - `control-plane`: `ResearchContextService` + `assembleFacts` redaction
    mapper; `GET /opportunities/:id/research-context`.
- Internal API-key guard (`security/`): constant-time comparison, fail-closed
  503 when unconfigured, non-sensitive 401 when missing/wrong; `SecurityModule`
  is `@Global`; `DatabaseModule` made `@Global` so `PrismaService` is shared.
- `ZodValidationPipe` validates request bodies with non-sensitive errors.
- Fact creation and the context-version bump run in one transaction: the
  `products-and-offers` service opens the transaction and calls
  `opportunities.bumpContextVersionForFact(tx, …)`; the write itself lives in
  the owner's repository. Target-market attachment + bump are transactional
  within `opportunities`.
- One migration adds `opportunities.context_version`, `opportunities.objective`,
  and `products.category`.

**Files changed**

- Added: `packages/contracts/**` (package.json, tsconfigs, vitest/eslint config,
  `src/{index,products,opportunities,research-context}.ts`,
  `test/contracts.spec.ts`).
- Added: `apps/api/src/modules/**` (three modules),
  `apps/api/src/security/**`, `apps/api/src/common/zod-validation.pipe.ts`,
  `apps/api/src/common/prisma-errors.ts`,
  `apps/api/test/{business-api.spec.ts,global-setup.ts,helpers/database.ts}`.
- Changed: `apps/api/src/{app.module.ts,config/env.ts,database/database.module.ts}`,
  `apps/api/{package.json,tsconfig.json,vitest.config.ts}`,
  `packages/database/prisma/schema.prisma`,
  `packages/database/prisma/migrations/20260910150428_research_context_fields/`,
  `soft/{.env.example,pnpm-lock.yaml,scripts/verify.sh}`,
  `soft/docs/{security,data-model,data-ownership,module-boundaries,decisions,architecture}.md`,
  `soft/docs/contracts/research-context.v1.md`.

**Migration applied**

- `20260910150428_research_context_fields` — adds `opportunities.context_version`
  (INT NOT NULL DEFAULT 1), `opportunities.objective` (TEXT), and
  `products.category` (VARCHAR(120)); applied to the dev DB and replayed on both
  disposable test DBs. Rollback: drop the three columns.

**Endpoints/contracts added or changed**

- `POST /products`, `POST /products/:productId/offers`, `POST /product-facts`,
  `POST /target-markets`, `POST /opportunities`,
  `POST /opportunities/:opportunityId/target-markets`,
  `GET /opportunities/:opportunityId/research-context` (all guarded by
  `x-internal-api-key`; `GET /health` and `GET /ready` public).
- `@ai-sdr/contracts`: `research_context_v1` + write-side schemas.

**Commands run and results**

- `nvm exec 24.20.0 pnpm --dir soft install --frozen-lockfile` → up to date.
- `nvm exec 24.20.0 pnpm --dir soft build` → passed (contracts, database, api,
  web).
- `nvm exec 24.20.0 pnpm --dir soft typecheck` → passed.
- `nvm exec 24.20.0 pnpm --dir soft lint` → passed.
- `nvm exec 24.20.0 pnpm --dir soft test` → passed:
  contracts 7/7, database 10/10, api 14/14 (31 tests).
- `nvm exec 24.20.0 pnpm --dir soft verify` → 60 passed, 0 failed.
- `git diff --check` → clean.

**Test and verification evidence**

- `business-api.spec.ts` (8 tests) proves: the internal key is required on every
  business route (401) and fails closed (503) when unconfigured; health/ready
  stay public; fact input rules and relation errors (400/404/409); target-market
  attachment and product/offer fact creation each bump the affected context
  version (and an offer fact does not bump unrelated opportunities); context
  returns CONFIRMED+OPERATIONAL values with source metadata, redacts
  PENDING/RESTRICTED, omits SUPERSEDED, and never leaks `DATABASE_URL` or
  `INTERNAL_API_KEY`. The database tests re-run the new migration against the
  disposable `ai_sdr_test`; the API integration tests use a separate disposable
  `ai_sdr_test_api`.

**Known limitations**

- The context is a **current assembled context**, not an immutable research-run
  snapshot; `research_contexts`, `POST/GET …/research-runs`, and `evidence`
  resolution are planned. `evidence` arrays are empty and fact `version` is 1
  until append-only fact versioning exists.
- Sections with no owning module yet are returned empty: `priorResearchRuns`,
  `existingCompanies`, `approvedKnowledge`, `humanDecisions`.
- `scope` is derived from the opportunity's attached target markets; Task-scope
  resolution arrives with the `control-plane` Task table.
- `product.category` and `opportunity.objective` were added solely to satisfy
  the canonical DTO; `offer` commercial terms remain deferred.

**Decisions or blockers created**

- Decisions recorded in `soft/docs/decisions.md`: internal API-key guard;
  transactional Opportunity context-version rule; v1 as a current assembled
  context; added `category`/`objective`. No blocker remains.

**Post-review documentation correction (2026-09-10, documentation only)**

- Canonical root `docs/system/` reconciled with the implemented slice:
  `project-state.md` (implemented endpoint group + internal-key boundary +
  updated not-implemented list and next slice), `research-context-contract.md`
  (current assembled context vs future frozen ResearchRun/snapshot; redaction and
  SUPERSEDED rules remain mandatory), `module-map.md` (implemented initial module
  status; key boundary; context semantics), and `decisions.md` (internal-key
  boundary; current-context semantics).
- No source code, dependencies, contracts, migrations, database contents,
  endpoint behaviour, remote configuration, or `legacy/**` changed.
  `nvm exec 24.20.0 pnpm --dir soft verify` → 60 passed, 0 failed;
  `git diff --check` → clean.

**Human review:** approved 2026-09-10; archived as
`soft/tasks/done/2026-09-10-catalogue-and-research-context-api.md`.
