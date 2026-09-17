# Task: Research results dashboard — sales-manager view (O-013 round 2)

**Status:** IN PROGRESS

## Objective

Revise the read-only research dashboard so a sales manager can see **who sells
what, where, at what price, and what remains uncertain**: companies and their
product offerings become the primary browsing view, CURRENT findings sit beside
the offering/market they belong to, coverage explains what was investigated and
what is missing, and low-level usage/discovery detail moves behind a collapsed
control. No new searches or paid model calls.

## Allowed scope

- `soft/packages/database` (one additive migration + schema/test)
- `soft/packages/contracts` (offering contracts + test)
- `soft/apps/api/src/modules/evidence/**` (offering model, API, tests)
- `soft/apps/web/**` (offerings-first UI, presentation changes, tests, docs)
- `soft/docs/**` and root `docs/system/**` (project state, decisions, harness docs)
- `soft/tasks/**`, `ops/**`

## Prohibited scope

- No new searches, scraping, paid model calls, or outreach.
- No browser-side prose parsing presented as stored facts; no CRM/extraction
  framework; no unrelated modules.
- Do not resume/complete the run, alter the checkpoint, or correct claims.
- Preserve all existing claims, evidence, corrections and the run checkpoint.
- Keep the internal API key server-side; the web uses the API, not the database.
- No commit or push.

## Architecture references

- `../AGENTS.md` §3, §5–§7; `AGENTS.md`; `docs/data-ownership.md`,
  `docs/data-model.md`, `docs/module-boundaries.md`, `docs/testing.md`
- `../docs/system/research-harness/{persistence-boundary,coverage-and-stopping,
  evidence-and-outputs}.md`, `../docs/system/research-context-contract.md`
- `apps/web/docs/MISSING_API.md`

## Data boundary (manifested)

Structured today: run lifecycle/checkpoint, target markets (country+segment),
claims (type/confidence/lifecycle), evidence (verification/retrieval), sources
(URL). **Not structured:** company, offering, location/market served,
application/treatment/dimensions, price/currency/unit/VAT, sample-vs-full,
match class. Smallest bounded fix: a new evidence-owned `research_offerings`
table + `POST/GET .../:runId/offerings` with mandatory provenance
(`sourceReferenceId`, `evidenceId`; optional `claimId`) and an idempotent
per-run fingerprint.

## Files/modules expected to change

- `packages/database/prisma/schema.prisma` + additive migration
- `packages/contracts/src/research.ts` (+ test)
- `apps/api/src/modules/evidence/{domain,infrastructure,application,presentation}`
- `apps/api/test/offerings-api.spec.ts` (+ non-ASCII round-trip)
- `apps/web/lib/research/*`, `apps/web/lib/api/research.ts`,
  `apps/web/components/research/*`, research routes
- docs

## Schema/migration impact

Additive `research_offerings` (enums `OfferingVatStatus`, `OfferingPriceBasis`,
`OfferingSampleKind`, `OfferingMatchType`; unique `fingerprint`). Rollback: drop
the table + enums.

## Endpoint/contract impact

`POST /opportunities/:id/research-runs/:runId/offerings`,
`GET .../offerings`; new Zod contracts. Internal-key guarded.

## Acceptance criteria

- [ ] Offerings are the primary view: company/product, recorded location vs
      market served (distinct), application/treatment/dimensions where known,
      original price text + currency + unit + VAT, sample vs full product,
      source link + retrieval date + uncertainty.
- [ ] Exact matches, adjacent products and substitutes visibly separate;
      sauna/bathhouse vs exterior/facade distinct; country/application filters;
      "Showing X of Y"; "Clear filters"; historical claims excluded.
- [ ] Offering-linked CURRENT findings shown with the offering; general/unassigned
      findings remain accessible; coverage explains investigated vs missing;
      checkpoint summaries never override corrected CURRENT claims.
- [ ] Run overview unchanged; usage/limits/notes/discovery logs behind a
      collapsed "Research details"; discovery totals shown without the full
      query table by default; accessible "Back to top" (reduced-motion aware).
- [ ] Non-ASCII round-trips through the API; the responsible historical write
      path is fixed/documented; affected stored rows reported, not rewritten.
- [ ] Runs, checkpoint, counters and existing records unchanged.

## Verification commands

- `pnpm --filter @ai-sdr/database run migrate` / `generate`
- `pnpm -r build|typecheck|lint|test`, `bash scripts/verify.sh`
- API read-only checks on the real run; browser inspection desktop + narrow.

## Rollback/blocked conditions

Drop the new table/enums and revert web changes. Blocked if a requirement needs
an unbounded extraction framework; record the gap instead.

## Completion record

**Completed:** 2026-09-15 · **Status:** DONE (ready for human review; not committed).

1. **Files created/changed**
   - Database: `prisma/schema.prisma` (new `research_offerings` + 4 offering
     enums) and migration `20260915140000_research_offerings`; test truncation
     helper.
   - Contracts: `packages/contracts/src/research.ts` (offering enums +
     `CreateOfferingSchema`) + test.
   - API (`evidence`): `domain/types.ts`, `infrastructure/evidence.repository.ts`
     (idempotent `createOffering` + `listOfferingsForRun`), `application/
     evidence.service.ts`, `presentation/evidence.controller.ts`; new
     `test/offerings-api.spec.ts`.
   - Web: `lib/research/{types,offerings,claims}.ts`, `lib/api/research.ts`,
     `components/research/{offerings-view,offering-card,research-details,
     back-to-top}.tsx`, run page rewrite, `run-overview.tsx` (facts only),
     `coverage-section.tsx`/`claims-section.tsx` updates; new `offerings.test.ts`.
   - Docs: `packages/contracts`? no; `soft/docs/{data-model,data-ownership,
     decisions}.md`; root `docs/system/{data-governance,module-map,decisions,
     project-state}.md`; harness `persistence-boundary.md`,
     `evidence-and-outputs.md`; `research-toolchain.md` §8; web README +
     MISSING_API; `ops/backlog.md`.
2. **Migration:** `20260915140000_research_offerings` (additive) applied;
   `migrate status` clean (5 migrations).
3. **Endpoints/contracts:** `POST/GET /opportunities/:id/research-runs/:runId/
   offerings` (internal-key guarded); `CreateOfferingSchema` + offering enums.
4. **Business data added:** **18 offerings** created for the real run through the
   API, each linked to an existing `evidenceId` + `sourceReferenceId` (and a
   CURRENT `claimId` where applicable), preserving original price wording.
   Idempotent by fingerprint. **No** claims, evidence, corrections or checkpoint
   were modified (run unchanged).
5. **Commands / results:** `db:migrate` + `db:generate` clean; `pnpm -r build|
   typecheck|lint` pass; `pnpm -r test` **148 passed** (contracts 17, database 16,
   api 40 incl. 5 offering + non-ASCII round-trip tests, web 75); `verify.sh`
   **60/0**; `git diff --check` clean.
6. **Real-browser verification:** production build served and rendered with
   headless Chrome at desktop (1440) and narrow (420) widths; verified
   offerings-first layout, filter chips, "Showing 18 of 18", match-class
   separation, collapsed "Research details", and correct non-ASCII rendering
   (`dailylentė`, `Pirtelė`, `rūšis`).
7. **Encoding defect:** traced to the **manager PowerShell write path**
   (BOM-less scripts read as CP1252 + string-body encoding); the API/web path is
   correct and covered by a non-ASCII round-trip integration test. The manager
   pattern is fixed/documented (`research-toolchain.md` §8). Two historically
   double-encoded `research_queries` rows are reported, not rewritten.
8. **Known limitations:** offering population is a curated, provenance-linked
   submission (no automatic extraction); filters use distinct recorded values
   (market-served values are free text); offering/claim filter links reset the
   other filter namespace; the run's usage counters remain free-text in the
   checkpoint. Documented in `apps/web/docs/MISSING_API.md`.
9. **Decisions/blockers:** new evidence-owned read model (not a CRM); scoped the
   existing `targetMarket` boundary check to product-UI code (research legitimately
   reads opportunity target markets). Docker engine had stopped and was restarted
   (environment only). No blocker.
