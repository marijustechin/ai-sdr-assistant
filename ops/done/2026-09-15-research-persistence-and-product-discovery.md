# O-010 — Persist market-research runs, sources, evidence, and claims

**Status:** CLOSED / ARCHIVED 2026-09-15 (human-approved; see Closure below)
**Type:** delegation (direction → one bounded programmer task)
**Scope:** repository root coordination + `soft/packages/database`,
`soft/packages/contracts`, `soft/apps/api`, implementation docs, task loops.

## Objective

Prepare the API/database foundation for persistent market-research results as a
single bounded implementation slice: extend the existing `research_runs` record
with lifecycle/pause/checkpoint fields, and add run-scoped discovery queries plus
an `evidence`-owned source/evidence/claim store that keeps discovery, raw
evidence, and conclusions structurally separate — without introducing a generic
`search_results` table or a speculative domain model.

## Inputs / references

- root `AGENTS.md` §3, §5–§8; `soft/AGENTS.md`
- `docs/system/architecture.md`, `module-map.md`, `data-governance.md`,
  `research-context-contract.md`, `decisions.md`, `project-state.md`
- `docs/system/research-harness/AGENTS.md`, `persistence-boundary.md`,
  `evidence-and-outputs.md`
- `soft/packages/database/prisma/schema.prisma`; `soft/packages/contracts/src`;
  implemented API modules (`opportunities`, `products-and-offers`,
  `control-plane`)
- Human decision (2026-09-15): model research persistence as canonical
  `evidence`-module tables (`source_references`, `evidence`, `claims`,
  `claim_evidence`) plus a `market-researcher`-owned `research_queries` table and
  a **minimal run + evidence API**.

## Steps

1. Archive O-009 (completed, accepted as the basis for this slice) and record
   this task.
2. Delegate exactly one bounded programmer task to `soft/tasks/current.md`.
3. The programmer implements under `soft/AGENTS.md`: one Prisma migration,
   shared contracts, a minimal `market-researcher` and `evidence` API, and tests.
4. Verify the existing API still starts and existing checks stay green.
5. Record the outcome in `docs/system/project-state.md`, update the canonical
   model docs and `docs/system/decisions.md`, and reconcile the harness
   persistence boundary.

## Deliverables

- `ops/current.md` (this task); `ops/done/2026-09-15-market-researcher-operating-harness.md`
- `soft/tasks/current.md` → implemented → `soft/tasks/done/…`
- Prisma schema/migration, contracts, API modules, tests, implementation docs
- canonical doc updates: `data-governance.md`, `module-map.md`,
  `research-harness/persistence-boundary.md`, `project-state.md`, `decisions.md`

## Acceptance criteria

- [x] Existing API still starts cleanly; `GET /health`, `GET /ready`, and the
      catalogue/research-context endpoints still pass.
- [x] Existing checks/tests remain green.
- [x] Migration applies cleanly to the local PostgreSQL database.
- [x] Research runs, run-scoped queries, sources, evidence, and claims are
      persistable; claims are structurally separate from evidence.
- [x] No speculative large research-domain model is introduced.
- [x] Documentation explains the resulting model and key design decisions.

## Out of scope

- Any research execution, live search, scraping, or paid calls.
- `market-researcher` orchestration/AI, jobs/worker, `research_contexts`
  frozen snapshots, `research-records`/findings, suggestions, clarifications,
  report generation, UI.
- Commit or push (not authorized).

## Verification

- `pnpm db:migrate:status`, `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `bash scripts/verify.sh`; API health/readiness smoke check.

## Rollback/blocked conditions

- Rollback: `prisma migrate reset` on the disposable local DB + revert the
  delegation; the migration is additive and single-owner.
- Blocked: do not archive if the API fails to boot, the migration does not apply,
  or existing tests fail; record the blocker here.

## Completion record

**Completed:** 2026-09-15 · **Status:** READY_FOR_HUMAN_REVIEW at completion;
CLOSED/ARCHIVED 2026-09-15 after human approval (see Closure).

1. **Files created/changed** (manager + delegated implementation):
   - manager: `ops/current.md`, `ops/backlog.md`,
     `ops/done/2026-09-15-market-researcher-operating-harness.md` (O-009
     archived), root `docs/system/{data-governance,module-map,project-state,
     decisions,research-context-contract}.md`, `docs/system/research-harness/*`.
   - delegated (`soft/`): one migration + new `market-researcher` and `evidence`
     modules + contracts + tests + implementation docs; task archived to
     `soft/tasks/done/2026-09-15-research-persistence.md` and
     `soft/tasks/current.md` reset. Full list in the programmer completion
     record.
2. **Migrations applied:** `20260915075316_research_persistence` (applied to
   `ai_sdr` and to both isolated test databases; `prisma migrate status` clean).
3. **Endpoints/contracts:** new internal-key-guarded run + evidence API (see the
   programmer record); new `@ai-sdr/contracts` research schemas.
4. **Commands run and results:** `pnpm db:migrate:status` (clean),
   `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm test` (46 tests pass:
   contracts 11, database 15, API 20), targeted `build` (pass),
   `bash scripts/verify.sh` (60 pass / 0 fail), manual built-API boot
   (`/health`, `/ready` ok).
5. **Test/verification evidence:** database integration tests, contract tests,
   and API integration tests cover the run/query/source/evidence/claim model,
   the minimum resumable scenario, the `CONTEXT_CHANGED` block, and the
   FACT-without-evidence rejection.
6. **Known limitations:** frozen `research_contexts` snapshots and
   `priorResearchRuns` are not wired; `research-records`, suggestions,
   clarifications, and DB-backed reports remain unimplemented; cross-row claim
   rules are service-enforced; host Node is 24.19.0 vs `.nvmrc` 24.20.0 (no
   `nvm` available).
7. **Decisions/blockers created:** decision recorded that a first-class
   `evidence` entity refines the planned `claim_sources` join
   (`docs/system/decisions.md` 2026-09-15). No blocker. Not committed or pushed
   at completion.

### Reconciliation note — 2026-09-15 (pre-approval, sole agent)

A bounded reconciliation of the actual workspace (no new features, no archive,
no commit) confirmed: O-009's archive preserves its original work, refinement,
and coordination notes, with corrected metadata (**not** an approval — O-009 was
still at READY_FOR_HUMAN_REVIEW when O-010 began and was archived by the manager
as superseded); O-010 is the only active manager task. Stale "no persistence
API"/ON HOLD text was removed from the live harness docs and the
source→evidence→claim model was aligned across all harness files, including
`evidence-and-outputs.md`. One API test was added to prove the full scenario
through a fresh client; suite counts became 47 (contracts 11, database 15, API
21) with `verify.sh` at 60/0. Remaining limitation: host Node is 24.19.0 against
an engines requirement of `>=24.20.0`, which is not full compliance.

### Environment corrections — 2026-09-15 (pre-approval, sole agent)

Bounded environment fixes requested before final review; no features, no archive,
no commit:

- **Node runtime.** The host Node is a winget-managed machine-wide MSI
  (`OpenJS.NodeJS`, currently **v24.19.0**); no version manager is installed and
  the shell is not elevated. winget's Node LTS manifests top out at 24.19.0, so
  `.nvmrc`'s **v24.20.0** must come from the official installer. The verification
  suite was rerun under an official **Node v24.20.0** Windows x64 distribution
  staged session-scoped under
  `%LOCALAPPDATA%\Temp\opencode\node-v24.20.0-win-x64` (not a version manager,
  not added to the machine PATH). The machine-wide runtime remains v24.19.0
  pending one human step. Package engines were not changed.
- **`verify.sh` Node gate.** Now parses `package.json` `engines.node`
  (`>=24.20.0 <25`) and enforces both the minimum and the upper bound; the
  previous check only matched `v24.*`. On the machine runtime it correctly
  **fails** (`FAIL node version v24.19.0`); under v24.20.0 it passes.
- **Direct checkout verification.** `.gitattributes` gained a narrow
  `soft/scripts/*.sh text eol=lf` rule (the `legacy/**` whitespace exception is
  unchanged); `soft/scripts/verify.sh` was normalized to LF. `verify.sh` now runs
  **directly from the real checkout via Git Bash** (no temporary modified copy).
- **`migration_lock.toml`.** The reported diff was a stat-cache false positive
  (`git diff --quiet` = 0; index and HEAD blobs identical); cleared with a stat
  refresh. No content change, so no churn was removed or introduced.
- **Claim-enum spelling.** Live docs corrected from `INFERRED` to `INFERENCE`
  (`docs/system/research-harness/evidence-and-outputs.md`,
  `soft/docs/module-boundaries.md`); the implemented enum
  (`ClaimType.INFERENCE`) was not renamed.

### Product-scoped discovery delegation — 2026-09-15 (under O-010)

The manager delegated one further bounded programmer task so an agent can resolve
product → offer → opportunity → target markets without human ID management, and
enforced the canonical non-empty research scope. Programmer record:
`soft/tasks/done/2026-09-15-product-scoped-research-discovery.md`.

- Added internal-key-guarded `GET /products/:productId/offers` and
  `GET /products/:productId/opportunities` (opportunities include attached target
  markets). Schema-neutral: no migration, no `packages/contracts` change.
- `POST /opportunities/:id/research-runs` now rejects an opportunity with no
  attached target markets with `409 { error: 'research_scope_empty' }`; no run is
  persisted.
- Checks: API tests **31 passed**; workspace tests **99 passed** (contracts 15,
  database 15, api 31, web 38); `verify.sh` **60/0** under Node v24.20.0
  (host Node v24.19.0 fails only its Node gate). Ownership respected: no
  cross-module table writes.

### Harness scope clarifications — 2026-09-15 (under O-010)

Canonical harness corrected to keep sauna/bathhouse a core segment and prevent
category conflation:

- `evidence-and-outputs.md` §3 — added separations: sauna/bathhouse vs
  exterior/facade application (both core); cladding vs bench/slat; thermally
  modified vs untreated Abachi; application investigation vs our-product
  suitability. Adjacent categories reveal suppliers but are not exact matches.
- `coverage-and-stopping.md` §1/§4 — coverage matrix slices each market by
  application segment; diminishing returns is assessed **per coverage area**, not
  globally.
- `operating-manual.md` §4 — planning keeps both segments distinct, with
  country-adaptive priority and segment importance as an evidenced finding.

### Closure — human approval (2026-09-15)

The human **approved** the reconciled research-persistence work (this O-010 /
T-007), the product-scoped research discovery task, and the harness scope
clarifications above. This approval covers **only** those items. It does **not**
approve the unrelated dashboard (`soft/apps/web/**`) changes, which remain
unapproved and were not part of the approved work. O-010 is closed and archived.
No commit or push was performed.
