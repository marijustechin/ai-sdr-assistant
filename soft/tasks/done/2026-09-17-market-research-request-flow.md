# Task: Product-independent market research request flow — DONE

**Status:** COMPLETE (implementation); manager task O-017 left
READY_FOR_HUMAN_REVIEW. No commit/push.

## Objective

Let an operator create any product, configure a market research request in the
dashboard, submit it, and see it waiting for the researcher; let the researcher
discover the queued request and retrieve its persisted parameters + product
context through the API without any human-supplied ids. Reuse the existing
`Offer`/`Opportunity`/`TargetMarket`/`ResearchRun` domain. Product-independent
(Abachi is data, not a specialization).

## Design (as built)

- A **research request is a `QUEUED` `ResearchRun`** — no parallel task
  framework. `research_runs` gains `request_parameters` (JSONB, validated) and
  `request_key` (unique, idempotency); owner stays `market-researcher`.
- Submission orchestration lives in `control-plane` and runs all related writes
  in one `PrismaService.$transaction`, calling owner-service methods that accept
  an optional transaction client; each owner writes only its own tables.
- Each submission creates a **new Opportunity** and target-market scope (never
  mutating an existing opportunity/run scope). Offer resolution: explicit
  operator name → unique match; exactly one offer → reuse; none → minimal
  research-association offer; several → `409 ambiguous_offer`. Segment policy
  `IDENTIFY_DURING_RESEARCH` stores the explicit non-commercial marker
  `UNSPECIFIED`.
- Claiming a queued run is a compare-and-swap; a second attempt is
  `409 run_not_claimable` / `run_already_running`.
- Researcher intake assembles the canonical context + persisted parameters.

## Files created/changed

- Schema/migration: `packages/database/prisma/schema.prisma`,
  `prisma/migrations/20260917130000_research_requests/migration.sql`.
- Contracts: `packages/contracts/src/research-requests.ts`,
  `src/index.ts`, `test/research-requests.spec.ts`.
- API owner services/repos: `opportunities` (+`ensureTargetMarket`,
  +`attachTargetMarketWithinTransaction`, +`getContextDataWithinTransaction`,
  tx-aware), `products-and-offers` (+tx-aware `createOffer`/`listOffersForProduct`,
  +`findOfferByNameForProduct`), `market-researcher`
  (+`createQueuedRun`, +`findRunByRequestKey`, +`listQueuedRuns`, +`claimQueuedRun`,
  claim CAS in `updateRun`, request fields on the run record).
- control-plane: `application/research-requests.service.ts`,
  `domain/research-request.types.ts`,
  `presentation/research-requests.controller.ts`, `control-plane.module.ts`.
- Web: `lib/api/research-requests.ts`, `lib/research-requests/{types,schema}.ts`,
  `lib/research-requests/schema.test.ts`, `lib/api/actions.ts`
  (+`submitResearchRequestAction`), `components/research/new-request-form.tsx`,
  `components/research/research-requests-list.tsx`,
  `app/(dashboard)/products/[id]/research/new/page.tsx`,
  `app/(dashboard)/products/[id]/research/page.tsx`,
  `app/(dashboard)/products/[id]/research/[opportunityId]/[runId]/page.tsx`,
  `components/products/product-section-nav.tsx`, `docs/MISSING_API.md`.
- API tests: `apps/api/test/research-requests-api.spec.ts`.
- Docs: harness `operating-manual.md` §9 + `AGENTS.md` + `persistence-boundary.md`;
  `module-map.md`, `data-governance.md`, `project-state.md`, `decisions.md`,
  `README.md`; `soft/docs/data-model.md`, `data-ownership.md`.

## Schema/migration impact

- One additive migration `20260917130000_research_requests`:
  `research_runs.request_parameters JSONB NULL`,
  `research_runs.request_key VARCHAR(120) NULL UNIQUE`. Rollback: drop the two
  columns; existing rows unaffected.

## Endpoint/contract impact

- New: `POST /research-requests`, `GET /research-requests?status=QUEUED`,
  `GET /research-requests/:runId` (all internal-key protected).
- `research_runs` responses gain `requestParameters` (additive).
- `PATCH .../research-runs/:runId { status: 'RUNNING' }` is now a conditional
  claim from `QUEUED`.

## Completion record

1. **Commands and results.**
   - `pnpm -r build` pass (contracts, database, api, web incl. the new
     `/products/[id]/research/new` route).
   - `pnpm -r lint` pass. `pnpm -r typecheck` pass.
   - `pnpm -r test` pass: contracts **24**, database **17**, web **79**, api **47**
     (**167** total; 7 new API tests + 7 new contract tests + 3 new web tests).
   - `bash scripts/verify.sh` **60/0** (Git Bash); `git diff --check` clean.
2. **Isolated-DB verification (no real-run writes).** API integration tests on
   `ai_sdr_test_api` cover: internal-key enforcement; Abachi and **Cacao beans**
   through the same flow; saved parameters; `UNSPECIFIED` segment for
   "identify during research"; duplicate `requestKey` idempotency; server-side
   validation (geography/goals/segments/limits); transaction rollback (a
   simulated failure after partial writes leaves offer/opportunity/run/market at
   zero); queued discovery; one-time claim (sequential and concurrent); and an
   existing run/opportunity scope unchanged by a new request.
3. **Real-browser inspection.** With the web pointed at an isolated API on `:3004`
   (database `ai_sdr_test_api`) and a synthetic Cacao-beans product, a real
   Chromium browser (Edge headless) rendered: the new-request form (product
   identity, countries/regions, goals, standard scope, expandable technical
   limits, "Submit research request"), the research index showing "Queued —
   waiting for researcher" / "New market research", and the run page showing the
   queued state. The form contains no `sauna`/`facade`/`timber`/`dimensionsText`
   strings.
4. **Real state preserved.** Run `ba1fcdd0-…` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `cv7`, 23 queries / 29 evidence / 31 claims; services
   `:3003`/`:3000` healthy. No test products or requests were created in the real
   development database.
5. **Known limitations.** No background worker/scheduler/automatic execution
   (operator hands the agent the prompt in `operating-manual.md` §9). The derived
   opportunity name is the product name plus a fixed suffix (product names near
   the 255-char limit would be rejected by the DB). Discovered segments remain
   proposals; no automatic target-market mutation. `Product` still has no single
   aggregated research-status field.
6. **Decisions/blockers.** None blocking. Decision recorded in `decisions.md`
   (2026-09-17: a research request is a `QUEUED` run; control-plane orchestrates
   one transaction; unambiguous offer resolution; `UNSPECIFIED` segment).

## Rollback

- Revert the changes and drop the additive migration.
