# Task: Research results dashboard — read-only first version

**Status:** IN PROGRESS

## Objective

Add a read-only research-results dashboard to `soft/apps/web` so an operator can
navigate product → opportunities → research runs → run detail and understand the
persisted results without supplying UUIDs. Reuse the existing dashboard shell,
components, server-side API client, and conventions. This is presentation over
data already persisted by the existing API; it is read-only for business data.

## Allowed scope

- `soft/apps/web/**` (routes, components, `lib/research/**`, `lib/api/research.ts`,
  tests, `docs/MISSING_API.md`, `README.md`)
- `soft/docs/**` and root `docs/system/project-state.md` (documentation of the
  implemented dashboard behaviour)
- `soft/tasks/**`

## Prohibited scope

- No Prisma schema/migration change; no new API module or endpoint; no direct
  database access from the web app.
- No mutation of business data (no resume, search, claim correction, checkpoint
  change, or product edit beyond the existing admin behaviour).
- No inference of structured prices, geography, or application from free text;
  no new price calculations; unknown monetary cost is not rendered as `0`.
- No commit or push.

## Architecture references

- `../AGENTS.md` §3, §5–§7; `AGENTS.md`; `docs/architecture.md`,
  `docs/security.md`, `docs/contracts/research-context.v1.md`
- `../docs/system/research-harness/persistence-boundary.md`,
  `../docs/system/research-harness/coverage-and-stopping.md`,
  `../docs/system/research-harness/evidence-and-outputs.md`
- `soft/apps/web/docs/MISSING_API.md` (existing deferred items)

## Files/modules expected to change

- `apps/web/lib/api/research.ts` (server-only reads)
- `apps/web/lib/research/{types,checkpoint,coverage,claims,navigation}.ts` + tests
- `apps/web/lib/research/boundary.test.ts`
- `apps/web/components/research/*`
- `apps/web/components/products/product-section-nav.tsx`
- `apps/web/app/(dashboard)/products/[id]/research/page.tsx`
- `apps/web/app/(dashboard)/products/[id]/research/[opportunityId]/[runId]/page.tsx`
- `apps/web/docs/MISSING_API.md`, `apps/web/README.md`
- root `docs/system/project-state.md`

## Schema/migration impact

None. No endpoint change. Run scope (target markets) is resolved from the
existing product-scoped discovery read; no dedicated run-scope endpoint is added.

## Endpoint/contract impact

None. Reads only: `GET /products/:id/opportunities`, `GET /opportunities/:id/
research-runs`, `GET .../:runId`, `GET .../:runId/evidence`, `GET .../:runId/
claims[?includeHistory=true]`.

## Acceptance criteria

- [ ] Product → research navigation with useful empty states (no opportunity /
      no run).
- [ ] Run overview: scope + status/pause/context + timestamps; recorded
      usage/limits; coverage by country × application (sauna vs facade distinct);
      gaps and pending follow-ups; `COVERED` explained as recorded coverage.
- [ ] CURRENT claims by default; FACT/INFERENCE/UNKNOWN distinguished; evidence
      stance/text/verification/retrieval date/source URL inspectable.
- [ ] Filters use only real API fields (type, confidence, evidence stance,
      lifecycle).
- [ ] Correction history explicit; historical claims excluded by default;
      replacement navigation works.
- [ ] Missing checkpoint fields render as unavailable; unknown cost not `0`.
- [ ] Internal key server-side only; no DB access; read-only.
- [ ] Tests cover navigation/empty states, current-vs-history separation,
      evidence display, missing checkpoint fields, and API failure mapping.
- [ ] Gates pass on compliant Node; real run unchanged after visual inspection.

## Verification commands

- `pnpm --filter web run build|typecheck|lint|test`
- `pnpm -r run typecheck|lint|test`, `bash scripts/verify.sh`
- read-only HTTP inspection of the dashboard against the live run + run re-read

## Rollback/blocked conditions

Revert the web changes. Blocked if a UI requirement needs a schema/API change;
record the gap in `docs/MISSING_API.md` instead.

## Completion record

**Completed:** 2026-09-15 · **Status:** DONE (ready for human review; not committed).

1. **Files created/changed**
   - `apps/web/lib/api/research.ts` (server-only reads).
   - `apps/web/lib/research/{types,checkpoint,coverage,claims,navigation}.ts`.
   - `apps/web/components/research/{badges,coverage-section,follow-ups-section,
     run-overview,claims-section,opportunity-runs}.tsx`.
   - `apps/web/components/products/product-section-nav.tsx` (Research now a link).
   - `apps/web/app/(dashboard)/products/[id]/page.tsx` (pass product id/active).
   - `apps/web/app/(dashboard)/products/[id]/research/page.tsx` and
     `.../research/[opportunityId]/[runId]/page.tsx` (new routes).
   - Tests: `lib/research/{checkpoint,coverage,claims,navigation}.test.ts`,
     `lib/api/client.test.ts`, updated `lib/api/boundary.test.ts`.
   - Docs: `apps/web/docs/MISSING_API.md`, `apps/web/README.md`, canonical
     `docs/system/project-state.md`.
2. **Migration:** not needed. **Endpoints/contracts:** none added — reads only.
3. **Commands / results:** `pnpm -r build` (4 projects incl. Next.js, both new
   routes emitted), `pnpm -r typecheck`, `pnpm -r lint` all pass;
   `pnpm -r test` **135 passed** (contracts 16, database 16, api 35, web 68);
   `bash scripts/verify.sh` **60/0**; `git diff --check` clean.
   (During verification the local Docker engine had stopped; Docker Desktop was
   restarted and the existing `ai-sdr-assistant-postgres` container resumed.)
4. **Read-only inspection (live run):** served the production build and fetched
   `/products/<real>/research` (200: opportunity + run shown) and
   `/products/<real>/research/<opportunityId>/<runId>` (200: Paused, Diminishing
   returns, coverage + COVERED explanation, Findings (current), pending
   follow-ups, usage/limits) and `?history=1` (200: "Correction history", "All
   claims including retracted and replaced records", back link). Only GETs were
   issued; re-reading the run after inspection showed it unchanged.
5. **Known limitations:** structured usage/limit fields are not persisted (notes
   shown verbatim); filters are limited to type/confidence/stance/lifecycle;
   prices are displayed verbatim, never parsed or normalised; there is no
   product-level research status (unchanged). Gaps recorded in
   `apps/web/docs/MISSING_API.md`.
6. **Decisions/blockers:** the existing `lib/api/boundary.test.ts` blanket
   `targetMarket` check was scoped to product-UI code only, because the research
   dashboard legitimately reads the API's opportunity target markets; the
   `researchStatus` prohibition remains global. The database container needed a
   Docker Desktop restart (environment, not code). No blocker.
