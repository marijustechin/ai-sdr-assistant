# Project State (Canonical)

**Status:** Canonical, live snapshot. Last updated 2026-09-17 (**O-017
accepted** — product-independent market research request flow, verified end to
end with a real queued run, plus explicit cost/tool permissions; and **O-016
accepted** — research-text encoding repaired data-only, researcher UTF-8
write/read helper fixed and verified end to end). Prior 2026-09-15: **O-011
accepted**
— the first bounded research wave (LT / FI / GB), its fresh-session recovery, the
bounded claim-correction lifecycle (six replacements + three retractions
applied), the product-scoped discovery API, and the admin product-management UI
are committed, and **O-013 (read-only Research results dashboard) is accepted**
(companies/offerings-led view, evidence-linked `research_offerings` read model,
correction-consistent review flags, preserved filters, collapsed run details);
the database run remains `PAUSED` / `DIMINISHING_RETURNS` and
European market research is **not** complete. Prior 2026-09-15: O-010/T-007
research-result persistence implemented; O-009 harness archived. Earlier
2026-09-14 (O-007 closed; O-008 verified research toolchain); 2026-09-10
(O-005/T-006 documentation reconciliation).
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
| Migrations | `20260910112935_init`, `20260910150428_research_context_fields`, `20260915075316_research_persistence`, `20260915120000_claim_corrections`, and `20260915140000_research_offerings` applied; `prisma migrate status` clean | `soft/packages/database/prisma/migrations` |
| Core commercial schema | `Product`, `Offer`, `ProductFact` (CHECK-constrained), `TargetMarket`, `Opportunity` (with `contextVersion`/`objective`), `OpportunityTargetMarket`, `ResearchRun`, `ResearchRunTargetMarket`; `Product.category` | `soft/packages/database/prisma/schema.prisma` |
| Research persistence schema | `ResearchRun` (lifecycle `PAUSED` + separate `pauseReason`, JSONB `checkpoint`), `ResearchQuery` (run-scoped discovery log), `SourceReference` (deduplicated by URL), `Evidence` (`VERIFIED`/`UNVERIFIED`), `Claim` (`FACT`/`INFERENCE`/`UNKNOWN` + confidence), `ClaimEvidence` (stance-aware link) (T-007); claim correction lifecycle `ClaimLifecycleStatus` (`CURRENT`/`RETRACTED`/`REPLACED`) with `correctionReason`/`correctedAt` and a `replacedByClaimId` self-reference | `soft/packages/database/prisma/schema.prisma` |
| Shared contracts | `@ai-sdr/contracts` (Zod 4 + TypeScript) implements the canonical `research_context_v1` and the write-side input schemas, including the research contracts (`research.ts`) | `soft/packages/contracts` |
| Initial feature modules | `products-and-offers` (Product/Offer/ProductFact writes), `opportunities` (TargetMarket/Opportunity + join + context-version increments), a minimal `control-plane` (`ResearchContextService` assembly with redaction), and the T-007 `market-researcher` (run envelope + queries) and `evidence` (sources/evidence/claims) modules | `soft/apps/api/src/modules` |
| Catalogue + Research Context API | `POST /products`, `POST /products/:productId/offers`, `POST /product-facts`, `POST /target-markets`, `POST /opportunities`, `POST /opportunities/:opportunityId/target-markets`, `GET /opportunities/:opportunityId/research-context` | `soft/apps/api/src/modules` |
| Product admin + discovery API | `GET /products`, `GET /products/:productId`, `PATCH /products/:productId` (list/read/update), and product-scoped discovery `GET /products/:productId/offers`, `GET /products/:productId/opportunities` (offers → opportunities → attached target markets); shared `ProductResponseSchema`/`UpdateProductSchema` | `soft/apps/api/src/modules/products-and-offers` |
| Admin product-management UI | Next.js 16 admin app (`soft/apps/web`) implemented for product list → create → open → edit → change lifecycle, talking to the internal API server-side only (`INTERNAL_API_KEY` never exposed to the browser); deferred items documented in `soft/apps/web/docs/MISSING_API.md` | `soft/apps/web` |
| Research results dashboard (read-only) | Product → opportunities → research runs → run detail in the admin web app, leading with **companies and offerings** (structured, evidence-linked; filterable by market served, application and match class `EXACT_MATCH`/`ADJACENT`/`SUBSTITUTE`), CURRENT findings shown beside the offering they support, other current findings kept accessible, an explicit `includeHistory` correction view, coverage that explains investigated vs missing, and usage/limits/notes/discovery log behind a collapsed "Research details" control. Reads the API only; no prose parsing; no write actions. Backed by the evidence-owned `research_offerings` read model (migration `20260915140000_research_offerings`) | `soft/apps/web`, `soft/apps/api/src/modules/evidence` |
| Research persistence API | `POST/GET /opportunities/:id/research-runs`, `GET/PATCH .../:runId`, `POST/GET .../:runId/queries`, and `POST/GET .../:runId/sources|evidence|claims`; `POST .../claims/:claimId/corrections` with `GET .../claims?includeHistory=true`; `PATCH` pause/resume with the `CONTEXT_CHANGED` guard (T-007 + claim-correction lifecycle) | `soft/apps/api/src/modules/{market-researcher,evidence}` |
| Internal-key boundary | Every business route requires `x-internal-api-key`; constant-time check, fail-closed non-sensitive `503` when `INTERNAL_API_KEY` is unconfigured, non-sensitive `401` otherwise; key never logged or returned. `GET /health`/`GET /ready` stay public | `soft/apps/api/src/security` |
| Product-independent research request flow | Product → **Market research** → **New market research** form (countries/regions, goals, optional segments with "identify during research", questions/constraints, one bounded standard scope with expandable technical limits, review summary) → `POST /research-requests` persists validated parameters on a `QUEUED` run and shows **"Queued — waiting for researcher"**; researcher discovery/intake `GET /research-requests?status=QUEUED` / `GET /research-requests/:runId`; one-time `QUEUED → RUNNING` claim; explicit cost/tool permissions (`FREE_ONLY` default, or `METERED_APPROVED` with finite per-provider call limits) persisted with the request and enforced by a pure `checkProviderCall` helper, with resume counters in `checkpoint.providerUsage`. Reuses `Offer`/`Opportunity`/`TargetMarket`/`ResearchRun`; no parallel task framework. Migration `20260917130000_research_requests` (`request_parameters` JSONB + unique `request_key`) | `soft/apps/web`, `soft/apps/api/src/modules/control-plane`, `soft/apps/api/src/modules/market-researcher` |
| Tests | Database integration tests (isolated `ai_sdr_test`), contract tests, and API integration tests including the catalogue/research-context slice and the claim-correction lifecycle (isolated `ai_sdr_test_api`); API health/readiness/env tests still pass | `soft/packages/database/test`, `soft/packages/contracts/test`, `soft/apps/api/test` |
| Root manager workspace | Root `AGENTS.md`, `ops/` task loop, `docs/system/` canonical docs, root `.gitignore` | this repository root |
| Market researcher operating harness | Canonical instructions (entry point + lifecycle, evidence/price rules, coverage/stopping rules, persistence boundary, synthetic verification). **Instructions only** — not the `market-researcher` module and not a data store | `docs/system/research-harness/` |

The **Catalogue + Research Context API** vertical slice (O-005/T-006) is
implemented and awaiting human review: an operator enters canonical product,
offer, product-fact, target-market, and opportunity data once, and `GET
/opportunities/:id/research-context` returns the current assembled
`research_context_v1` (CONFIRMED+OPERATIONAL values, PENDING/RESTRICTED redacted,
SUPERSEDED omitted).

`soft/apps/web` is the **admin product-management UI** (product list → create →
open → edit → change lifecycle) over the internal API. It is deliberately
narrow: a specifications editor, product research status, product↔target-market
association, and `DELETE`/search/pagination are **not** implemented; the deferred
items and open questions are recorded in `soft/apps/web/docs/MISSING_API.md`.

---

## Not implemented

- Business feature modules not yet implemented: `knowledge`, `research-records`,
  `lead-discoverer`, `lead-evaluator`, `company-intelligence`,
  `contact-discovery`, `outreach-drafter`, `approvals`, `jobs`. The
  `market-researcher` and `evidence` modules are implemented as **minimal
  subsets** (T-007: run envelope + `research_queries`; source/evidence/claim
  persistence).
- Control-plane task routing, executions, activities, approval routing, and Task
  scope. Only the `ResearchContextService` read-model assembler exists today;
  ResearchContext `scope` is derived from the Opportunity's attached target
  markets until the Task table lands.
- Immutable Research Context snapshots (`research_contexts`): the run endpoints
  exist (T-007), but `POST .../research-runs` records the opportunity's current
  `contextVersion` **without freezing** a snapshot; `GET .../research-context`
  returns a **current assembled** context.
- `research-records` records/findings, `target_market_suggestions`,
  `clarification_requests`, and DB-backed report generation — none exist.
- `market-researcher` AI execution/orchestration and BullMQ `jobs`.
- Worker process (`soft/apps/worker`).
- Full UI surface beyond admin product management (see the implemented
  `soft/apps/web` scope above).
- Per-opportunity commercial terms (`opportunity_offers`) and fact append-only
  versioning.
- `evidence` resolution into the Research Context, so asserted facts carry
  `sourceLabel` and an empty `evidence` array; knowledge/companies/
  human-decision context sections are empty.

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

## Immediate priority (manager, O-011 accepted 2026-09-15)

Research capability and coverage are the immediate priority; product onboarding
is postponed. O-007 is **closed/archived**
(`ops/done/2026-09-14-equip-validate-research-toolchain.md`), with the manager
toolchain documented in `research-toolchain.md`; O-008 finalized that
documentation and committed it to `origin/main`.

**O-009 — the market researcher operating harness — is complete and archived**
(`ops/done/2026-09-15-market-researcher-operating-harness.md`); it created the
canonical harness under `docs/system/research-harness/`.

**O-010/T-007 — research-result persistence — is complete and committed.** It
added the `market-researcher` / `evidence` modules and the migration
`20260915075316_research_persistence`, so the harness's minimum resumable
scenario works over the API (run + queries + source/evidence/claim + checkpoint
+ pause/resume with a `CONTEXT_CHANGED` guard). The harness behavior is
reconciled with the actual schema/API in
`docs/system/research-harness/persistence-boundary.md` §4.

**O-011 — the first real resumable European research wave (LT / FI / GB) — is
accepted/closed** (`ops/done/2026-09-15-first-research-wave-lt-fi-gb.md`). It
executed the wave through the verified manager toolchain, persisted records
incrementally, demonstrated fresh-session recovery from the API alone, and added
the bounded claim-correction lifecycle (six replacements + three retractions
applied; migration `20260915120000_claim_corrections`). The database run
`ba1fcdd0-…` remains **`PAUSED` / `DIMINISHING_RETURNS`** (`contextVersion 7`)
with its checkpoint, usage counters and follow-ups unchanged. **European market
research is not complete** (FI facade dedicated product and GB sauna GB-based
cladding remain gaps; our product facts remain `UNKNOWN`). No paid call was
made; no billing change.

**O-013 — the read-only research results dashboard — is accepted**
(`ops/done/2026-09-15-research-results-dashboard.md`). It adds the evidence-owned
`research_offerings` model (migration `20260915140000_research_offerings`) with
mandatory provenance and idempotent fingerprint dedup, an offerings-led
sales-manager view with market/application/match filters and correction-consistent
review flags, and the harness requirement that future runs persist offerings via
the API. The run and its records are unchanged. **Recorded follow-up:** four
historical `research_queries` rows remain double-encoded (recoverable) and are
queued for a future bounded repair with explicit approval.

**O-016 — the research-text encoding repair — is accepted** (human-approved
2026-09-17; archived `ops/done/2026-09-17-research-text-encoding.md`). Under
explicit human authorization it repaired the damaged records, data-only: the four
double-encoded `research_queries.query_text` rows (lossless CP1252↔UTF-8 round
trip) and six `U+FFFD` fields (`source_references.title`/`publisher`,
`evidence.evidence_text` → `ė`), then the 12 high-confidence, source-verified
silent best-fit-stripped prose/quote records (4 source titles, 1 claim, 7
evidence), through the bounded, idempotent, compare-and-swap maintenance script
in the single schema owner
(`soft/packages/database/scripts/repair-research-encoding.mjs`). Exact
before/after undo data and pre-mutation dumps are kept **outside Git**
(`C:\Users\msmig\db-backups\ai-sdr\`). The 9 search queries were left ASCII (may
be intentional). No other column changed; the run remains `PAUSED` /
`DIMINISHING_RETURNS`, `contextVersion 7`, checkpoint 19 cells / 8 follow-ups,
23 queries, 29 evidence, 31 claims (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`),
18 offerings. **Prevention and researcher write path:** research writes now go
through the canonical helper `scripts/research/ResearchApi.psm1`
(`Write-ResearchJson`, UTF-8 **bytes** + `charset=utf-8`), with **UTF-8 input
loading required** (correct byte-sending cannot repair an already-corrupted input
string); it is verified end to end (PowerShell input → request → API → database →
API read) for Lithuanian and Finnish against an isolated database by
`scripts/research/Test-ResearchWriteEncoding.ps1`. A non-ASCII round-trip
regression test guards the persistence layer (`research-toolchain.md` §8).

**O-017 — the product-independent market research request flow — is accepted**
(archived `ops/done/2026-09-17-market-research-request-flow.md`), including a real
request → queue → researcher → persisted-results run and explicit cost/tool
permissions (`FREE_ONLY` default; `METERED_APPROVED` with finite provider call
limits). **Known limitation:** provider call limits are agent-enforced through the
harness, not by an execution engine (see below). An operator can configure a market research request
for **any** product in the dashboard and submit it; the request is persisted in
PostgreSQL as a `QUEUED` research run (validated parameters in
`research_runs.request_parameters`, idempotency `request_key`) and shown as
"Queued — waiting for researcher". The researcher discovers queued requests and
reads the persisted parameters + assembled context through the API without any
human-supplied ids, and claims a run exactly once. It reuses the existing
`Offer`/`Opportunity`/`TargetMarket`/`ResearchRun` domain (no parallel task
framework; the derived opportunity name is the product name plus a research
suffix; segments default to the explicit `UNSPECIFIED` marker when the operator
chooses "identify during research"). Abachi and Cacao beans run the same flow with
no code changes; the existing paused LT/FI/GB run and its scope are unchanged.
No background worker, scheduler, or automatic execution exists — the operator
hands the agent the prompt in `research-harness/operating-manual.md` §9. Migration
`20260917130000_research_requests`.

**Verified operating toolchain (2026-09-14):**

- **Exa** (`websearch`) — discovery;
- **Gemini Google Search** (`gemini_gemini_chat`, grounding on) — native
  in-session grounded discovery;
- **webfetch / Firecrawl** (`firecrawl_search` / `firecrawl_scrape` /
  `firecrawl_parse`) — source retrieval and verification.

Toolchain readiness does **not** mean the European market research is complete.
The dated, non-canonical benchmark
(`docs/benchmarks/2026-09-14-research-coverage-capability-test.md`) keeps the
remaining coverage gaps visible: Germany thinly verified, France partly Belgian,
many candidates `NOT_EVALUATED`, and Exa/Gemini usage and cost not observable.
DeepSeek server-side web search was **not observed** in the tested
account/model/endpoint configuration and is **not accepted as a verified research
tool**. This is manager-environment tooling only: it does not implement
`market-researcher` and creates no business records.

---

## Next planned functional slice

**Knowledge + Approvals (human gate)** — the next functional slice after the
accepted Catalogue + Research Context API and the accepted first research wave:

- `knowledge` versioned entities (customer profiles, buyer personas, value
  propositions);
- `approvals` request/decision tables and the human gate that a fact moves
  `PENDING → CONFIRMED` through.

Ref: `module-map.md` §§4, 14; `research-context-contract.md` §10.

---

## Sequencing after the first slice (planned)

The first slice (Catalogue + Research Context API), the research-result
persistence slice (O-010/T-007), the first bounded research wave (O-011), the
claim-correction lifecycle, the product-scoped discovery API, and the admin
product-management UI are implemented and accepted. Remaining sequence:

1. Frozen `research_contexts` snapshots (so resume can read the run's frozen
   context) and wiring `priorResearchRuns` into the Research Context.
2. Knowledge + Approvals (human gate).
3. Research-records + full Market Researcher execution (+ jobs/worker).
4. Discovery & intelligence (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
5. Outreach + inbox (post-MVP).
