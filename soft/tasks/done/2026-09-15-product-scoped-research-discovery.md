# Task: Product-scoped research discovery read + enforce non-empty run scope

**Status:** DONE (archived 2026-09-15)

## Objective

Add the smallest **schema-neutral** API read path that lets an agent discover,
from a `productId` alone: the product's offers, the opportunities attached to
those offers, and each opportunity's attached target markets. Also enforce the
canonical Research Context requirement that a market-research run's scope
(`targetMarketIds`) is **non-empty** when a run is started.

The goal is that an agent can resolve product → offer → opportunity → target
markets (and its IDs) through the API, instead of the human hand-managing
internal IDs. `GET /opportunities/:id` alone does not solve this.

## Allowed scope

- `soft/apps/api/src/modules/products-and-offers/**`
- `soft/apps/api/src/modules/opportunities/**`
- `soft/apps/api/src/modules/market-researcher/**` (scope guard only)
- `soft/apps/api/test/**` (new/updated API integration tests)

## Prohibited scope

- No Prisma schema change and no migration (read-only, schema-neutral).
- No change to `soft/packages/contracts`, `soft/packages/database`, or the web
  dashboard.
- No new commercial prerequisite (e.g. product lifecycle, offer status) on
  starting a run — only the existing non-empty target-market scope.
- No research execution, searches, business-record writes, commit, or push.
- Do not modify `../legacy/**`.

## Architecture references

- `soft/AGENTS.md` (task loop, toolchain, invariants)
- `soft/docs/architecture.md`, `soft/docs/module-boundaries.md`,
  `soft/docs/data-ownership.md`, `soft/docs/contracts/research-context.v1.md`
- root `../docs/system/research-context-contract.md` §2 (non-empty
  `scope.targetMarketIds`; current-assembled context)
- root `../docs/system/research-harness/AGENTS.md` and
  `../docs/system/research-harness/persistence-boundary.md` (researcher must
  resolve scope from the context; no invented values)

## Files/modules expected to change

- `products-and-offers/infrastructure/products.repository.ts` — `listOffersForProduct`.
- `products-and-offers/application/products-and-offers.service.ts` — read methods.
- `products-and-offers/presentation/products.controller.ts` — two GET routes.
- `opportunities/domain/types.ts` — discovery read-model type.
- `opportunities/infrastructure/opportunities.repository.ts` — `listOpportunitiesForOffers`.
- `opportunities/application/opportunities.service.ts` — read method.
- `market-researcher/application/research-runs.service.ts` — empty-scope guard.
- `apps/api/test/products-api.spec.ts`, `apps/api/test/research-api.spec.ts`.

## Schema/migration impact

None. Read-only reuse of the existing `offer`, `opportunity`, and
`opportunity_target_markets` tables. No migration.

## Endpoint/contract impact

New (both `x-internal-api-key`-guarded, product-scoped discovery):

- `GET /products/:productId/offers` → `OfferRecord[]`; `404 product_not_found`
  for an unknown product; `[]` when the product has no offers.
- `GET /products/:productId/opportunities` → opportunities for the product's
  offers, each with its attached target markets; same 404/empty behaviour.

Changed: `POST /opportunities/:id/research-runs` now rejects an opportunity with
no attached target markets with `409 { "error": "research_scope_empty" }`.

No shared-contract (Zod) change.

## Acceptance criteria

- [x] `GET /products/:productId/offers` lists the product's offers.
- [x] `GET /products/:productId/opportunities` resolves product → offers →
      opportunities and includes each opportunity's attached target markets.
- [x] Both return `[]` for a product with no offers/opportunities and
      `404 { error: 'product_not_found' }` for an unknown product.
- [x] All new/changed routes require the internal key (401 without it).
- [x] Starting a run on an opportunity with no target markets is rejected with
      `409 { error: 'research_scope_empty' }` and persists no run.
- [x] Product/offer DRAFT state does not block discovery; no new commercial
      prerequisite is added.
- [x] No schema/migration and no shared-contract change.
- [x] `typecheck`, `lint`, and API tests pass; existing tests stay green.

## Verification commands

- `pnpm --filter @ai-sdr/api run typecheck`
- `pnpm --filter @ai-sdr/api run lint`
- `pnpm --filter @ai-sdr/api run test`
- `pnpm typecheck` / `pnpm test` (workspace, if the environment allows)

## Rollback/blocked conditions

- Rollback: revert the touched files; no migration to undo.
- Blocked: do not archive if the API does not boot or existing tests fail;
  record the blocker here.

## Completion record

**Completed:** 2026-09-15 · **Status:** DONE (archived). Migration not needed;
no schema or shared-contract change.

### Actual implementation summary

- **Product-scoped discovery read** added without new tables, contracts, or
  modules:
  - `ProductsRepository.listOffersForProduct(productId)` — offers ordered by
    `createdAt asc, id asc`.
  - `OpportunitiesRepository.listOpportunitiesForOffers(offerIds)` — opportunities
    filtered by `offerId in offerIds`, each including its attached target
    markets (`opportunity_target_markets → target_market`); returns `[]` for an
    empty `offerIds` without a query.
  - `OpportunitiesService.listOpportunitiesForOffers(...)` maps to a new
    `OpportunityDiscoveryRecord` (opportunity fields + `targetMarkets`).
  - `ProductsAndOffersService.listOffersForProduct(...)` and
    `listOpportunitiesForProduct(...)` verify the product exists (404
    `product_not_found`), then read the product's offers and delegate the
    opportunity read to `OpportunitiesService` (owner). No cross-module table
    write; `products-and-offers` already depends on `OpportunitiesService`.
  - `ProductsController` routes: `GET /products/:productId/offers`,
    `GET /products/:productId/opportunities`, both behind `InternalApiKeyGuard`
    and `ParseUUIDPipe`.
- **Non-empty scope guard**: `MarketResearcherService.createRun` now rejects an
  opportunity with no attached target markets with
  `409 { error: 'research_scope_empty' }`, consistent with the canonical
  Research Context rule (`research-context-contract.md` §2). The opportunity
  existence check (404) still runs first; no run row is created on rejection.
- Ownership respected: offers are read by `products-and-offers`; opportunities
  and their target markets are read by `opportunities` through its own
  repository; `products-and-offers` reaches opportunities only via the injected
  `OpportunitiesService`.

### Files changed

- `apps/api/src/modules/products-and-offers/infrastructure/products.repository.ts`
- `apps/api/src/modules/products-and-offers/application/products-and-offers.service.ts`
- `apps/api/src/modules/products-and-offers/presentation/products.controller.ts`
- `apps/api/src/modules/opportunities/domain/types.ts`
- `apps/api/src/modules/opportunities/infrastructure/opportunities.repository.ts`
- `apps/api/src/modules/opportunities/application/opportunities.service.ts`
- `apps/api/src/modules/market-researcher/application/research-runs.service.ts`
- `apps/api/test/products-api.spec.ts`
- `apps/api/test/research-api.spec.ts`
- `tasks/current.md` (task), `tasks/done/2026-09-15-product-scoped-research-discovery.md` (archive)

### Migration applied

**Not needed.** No Prisma schema change; read-only reuse of existing tables.

### Endpoints/contracts added or changed

- Added `GET /products/:productId/offers` (internal-key guarded).
- Added `GET /products/:productId/opportunities` (internal-key guarded).
- Changed `POST /opportunities/:id/research-runs`: `409 research_scope_empty`
  when the opportunity has no attached target markets.
- No change to `packages/contracts` (responses are typed domain records, matching
  the research-API convention of typed reads without new Zod response schemas).

### Commands run and results

- `pnpm --filter @ai-sdr/api run typecheck` → exit 0.
- `pnpm --filter @ai-sdr/api run lint` → exit 0.
- `pnpm --filter @ai-sdr/api run test` → 6 files, **31 passed** (products-api 9,
  research-api 8, business-api 8, ready 2, health 1, load-env 3).
- `pnpm -r run typecheck` (workspace) → exit 0 (database, contracts, api, web).
- `pnpm -r run test` (workspace) → exit 0 (contracts 15, database 15, api 31,
  web 38 = **99 passed**).
- `bash scripts/verify.sh` under staged Node **v24.20.0** → **60 passed, 0
  failed**, exit 0.
- `bash scripts/verify.sh` on host Node **v24.19.0** → 59 passed, **1 failed**
  (only the Node-version gate).
- A host-engine `WARN Unsupported engine: wanted >=24.20.0 <25 (current
  v24.19.0)` is emitted by pnpm but does not fail the commands above.

### Test and verification evidence

- New API tests in `products-api.spec.ts`:
  - discovery from a real-shaped seed: product → offer → target market →
    opportunity → attach; asserts `GET .../offers` returns the offer
    `{ id, productId, name, commercialStatus }` and
    `GET .../opportunities` returns the opportunity with `contextVersion: 2`
    and the attached target market (`id`, `country`, `segment`,
    `lifecycleStatus`);
  - empty result: a product with no offers returns `[]` for both routes;
  - unknown product: both routes return `404 { error: 'product_not_found' }`;
  - the existing internal-key test now also covers both discovery routes (401
    without the key).
- New API test in `research-api.spec.ts`: a product/offer/opportunity **without**
  a target market is rejected with `409 { error: 'research_scope_empty' }`, and a
  follow-up `GET .../research-runs` returns `[]` (no run persisted).
- All test data is isolated in `ai_sdr_test_api` (truncated between tests).

### Known limitations

- The discovery read is product-scoped only; there is still no
  `GET /opportunities/:id` standalone lookup (deliberately out of scope — the
  product-scoped path is the missing-ID solution requested).
- Responses are not described by new `@ai-sdr/contracts` Zod schemas; they are
  typed domain records, consistent with the existing research read endpoints.
- `soft/apps/web/docs/MISSING_API.md` still lists product↔target-market linkage
  as pending; it was not updated to avoid disturbing the in-flight dashboard
  work. A future docs/UI task may reflect the new read routes.
- Host Node remains v24.19.0 (see below).

### Decisions or blockers created

- Decision: the product → offer → opportunity → target-market discovery is a
  read model exposed by `products-and-offers` (product-scoped entry) that reads
  its own `offers` and delegates opportunity/target-market reads to
  `OpportunitiesService`; no schema, contract, or module-boundary change.
- Decision: an empty research scope is a `409` state conflict
  (`research_scope_empty`), not a `400`; no new commercial prerequisite was
  introduced.
- Blocker (environment, pre-existing, not caused by this task): the host Node
  runtime is **v24.19.0**, below the workspace engines range `>=24.20.0 <25`, so
  `scripts/verify.sh` fails its Node gate on the host default. It passes
  (60/0) when run under an official Node v24.20.0 runtime. This remains the
  single known runtime/verification gap.
