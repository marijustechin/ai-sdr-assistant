# Task: T-007 — Research persistence: runs, queries, sources, evidence, claims

**Status:** DONE (archived 2026-09-15)

## Objective

Implement the minimal persistent foundation for market-research results:
extend the existing `research_runs` record with pause/checkpoint lifecycle
fields, add a run-scoped `research_queries` store (owner `market-researcher`),
and add an `evidence`-owned source/evidence/claim store (`source_references`,
`evidence`, `claims`, `claim_evidence`). Expose a **minimal** run + evidence API
so a run can be started, asked a query, given a source → evidence → claim, and
paused/resumed in a fresh session. Do **not** add a generic `search_results`
table, a broad CRUD API, or any speculative domain model.

## Allowed scope

- `soft/packages/database/**` (schema, one migration, integration tests)
- `soft/packages/contracts/**` (Zod input contracts + tests)
- `soft/apps/api/src/modules/market-researcher/**` (new)
- `soft/apps/api/src/modules/evidence/**` (new)
- `soft/apps/api/src/app.module.ts`
- `soft/apps/api/test/**` (new integration spec + global-setup portability fix)
- `soft/packages/database/test/global-setup.ts` (portability fix)
- `soft/docs/data-model.md`, `soft/docs/data-ownership.md`, `soft/docs/decisions.md`
- `soft/harness/**` only if required by the task loop

## Prohibited scope

- No research execution, live search, scraping, paid calls, or provider integration.
- No `market-researcher` AI orchestration, jobs/worker, `research_contexts`
  snapshots, `research-records`/findings, suggestions, clarifications, reports, UI.
- No module writes another module's tables; no raw DB writes outside typed
  repositories.
- No edit to `../legacy/**`; no commit or push.

## Architecture references

- `../../docs/system/module-map.md` §§1, 5, 7; `../../docs/system/data-governance.md`
  §§2–3, 5–7; `../../docs/system/research-context-contract.md` §3, §8
- `../../docs/system/research-harness/AGENTS.md`,
  `persistence-boundary.md` §2–3, `evidence-and-outputs.md` §§1, 5
- `docs/architecture.md`, `docs/data-ownership.md`, `docs/data-model.md`,
  `docs/testing.md`, `docs/task-format.md`
- Human decision 2026-09-15: canonical `evidence` tables + `research_queries` +
  minimal run/evidence API.

## Files/modules expected to change

- `packages/database/prisma/schema.prisma` (+ one new migration)
- `packages/database/test/schema.spec.ts`, `test/helpers/database.ts`,
  `test/global-setup.ts`
- `packages/contracts/src/research.ts`, `src/index.ts`, `test/contracts.spec.ts`
- `apps/api/src/modules/market-researcher/**` (module, domain types, repository,
  service, controller)
- `apps/api/src/modules/evidence/**` (module, domain types, repository, service,
  controller)
- `apps/api/src/app.module.ts`
- `apps/api/test/research-api.spec.ts`, `test/helpers/database.ts`,
  `test/global-setup.ts`
- `docs/data-model.md`, `docs/data-ownership.md`, `docs/decisions.md`

## Schema/migration impact

One additive migration in `packages/database`:

- `ResearchRunStatus`: add `PAUSED`.
- `ResearchRun`: add `pauseReason` (enum `ResearchRunPauseReason`), `pauseNote`,
  `checkpoint` (Json), `checkpointAt`.
- New enum `ResearchRunPauseReason` `{ BUDGET_EXHAUSTED | ACCESS_BLOCKED |
  CONTEXT_CHANGED | DIMINISHING_RETURNS | NEEDS_HUMAN }`.
- New `research_queries` (owner `market-researcher`) with enum
  `ResearchQueryStatus` `{ PENDING | RUNNING | SUCCEEDED | FAILED }`.
- New `source_references` (owner `evidence`, URL unique), `evidence` (owner
  `evidence`, enum `EvidenceVerificationStatus` `{ VERIFIED | UNVERIFIED }`),
  `claims` (owner `evidence`, enums `ClaimType` `{ FACT | INFERENCE | UNKNOWN }`,
  `ClaimConfidence` `{ HIGH | MEDIUM | LOW }`), `claim_evidence` join (owner
  `evidence`, enum `ClaimEvidenceStance` `{ SUPPORTS | REFUTES | CONTEXT }`).
- Rollback: additive; `prisma migrate reset` on the disposable local DB.

Cross-row rules (e.g. a `FACT` claim requires ≥1 evidence link; a claim may only
link evidence from the same run) are enforced in the service layer and tested.

## Endpoint/contract impact

Minimal, all behind `x-internal-api-key`:

- `POST   /opportunities/:id/research-runs`
- `GET    /opportunities/:id/research-runs`
- `GET    /opportunities/:id/research-runs/:runId`
- `PATCH  /opportunities/:id/research-runs/:runId` (status/pause/checkpoint,
  `CONTEXT_CHANGED` guard)
- `POST   /opportunities/:id/research-runs/:runId/queries`
- `POST   /opportunities/:id/research-runs/:runId/sources`
- `POST   /opportunities/:id/research-runs/:runId/evidence`
- `POST   /opportunities/:id/research-runs/:runId/claims`
- `GET    /opportunities/:id/research-runs/:runId/sources|evidence|claims`

New `@ai-sdr/contracts` Zod schemas for every request body.

## Acceptance criteria

- [x] Migration applies cleanly to local PostgreSQL.
- [x] Research runs, run-scoped queries, sources, evidence, and claims persist.
- [x] Claims are structurally separate from evidence; a `FACT` claim without
      evidence is rejected; evidence carries source + retrieval + verification.
- [x] Run lifecycle keeps `PAUSED` + `pauseReason` distinct from `FAILED` +
      `errorCode`; resume clears the pause reason; a context change is blocked
      with `CONTEXT_CHANGED`.
- [x] Existing API modules and endpoints still work; `GET /health`/`GET /ready`
      unaffected.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass; `scripts/verify.sh` passes.

## Verification commands

- `pnpm db:migrate:status`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `bash scripts/verify.sh`

## Rollback/blocked conditions

- Rollback: reset the disposable local DB and revert the additive migration +
  new modules. If the API fails to boot, the migration does not apply, or
  existing tests fail, leave this task in place with the blocker recorded.

## Plan (step 2 of the task loop)

1. Schema + migration; update the test truncate helpers.
2. Contracts (`research.ts`) + contract tests.
3. `market-researcher` module (runs + queries); `evidence` module
   (sources/evidence/claims); wire `app.module.ts`.
4. Fix `execFileSync('pnpm')` for Windows test global-setup.
5. Database + API integration tests.
6. Typecheck/lint/test/verify; record; update docs; archive.

## Completion record

### Actual implementation summary

Added one additive Prisma migration and two minimal API modules so research
results can be persisted and resumed. Discovery, raw evidence, and conclusions
are structurally separate tables (owner `evidence`), and run lifecycle keeps
`PAUSED` + a separate `pauseReason` distinct from `FAILED` + `errorCode`. No
research execution, provider integration, or generic `search_results` table was
introduced.

### Files created/changed

- `packages/database/prisma/schema.prisma` — extended `ResearchRun`; added
  `ResearchQuery`, `SourceReference`, `Evidence`, `Claim`, `ClaimEvidence`; new
  enums (`ResearchRunPauseReason`, `ResearchQueryStatus`,
  `EvidenceVerificationStatus`, `ClaimType`, `ClaimConfidence`,
  `ClaimEvidenceStance`); `PAUSED` added to `ResearchRunStatus`.
- `packages/database/prisma/migrations/20260915075316_research_persistence/migration.sql` (new).
- `packages/database/test/helpers/database.ts`,
  `packages/database/test/research-persistence.spec.ts` (new),
  `packages/database/test/global-setup.ts` (Windows shell fix).
- `packages/contracts/src/research.ts` (new), `src/index.ts`,
  `test/contracts.spec.ts`.
- `apps/api/src/modules/market-researcher/**` (new: module, domain types,
  repository, service, controller).
- `apps/api/src/modules/evidence/**` (new: module, domain types, repository,
  service, controller).
- `apps/api/src/app.module.ts`.
- `apps/api/test/research-api.spec.ts` (new), `test/helpers/database.ts`,
  `test/global-setup.ts` (Windows shell fix).
- `docs/data-model.md`, `docs/data-ownership.md`, `docs/decisions.md`.

### Migration applied

`20260915075316_research_persistence` — applied to `ai_sdr` and to the isolated
`ai_sdr_test` / `ai_sdr_test_api` databases via the test global setup.
`prisma migrate status` reports the schema up to date (3 migrations).
Rollback note: additive; `prisma migrate reset` on the disposable local DB.

### Endpoints/contracts added or changed

New (all `x-internal-api-key`-guarded):
`POST/GET /opportunities/:id/research-runs`;
`GET/PATCH /opportunities/:id/research-runs/:runId`;
`POST/GET /opportunities/:id/research-runs/:runId/queries`;
`POST/GET .../:runId/sources`; `.../evidence`; `.../claims`.
New Zod contracts in `@ai-sdr/contracts` (`research.ts`), exported from the
package index.

### Commands run and results

- `pnpm db:migrate` / `prisma migrate dev --name research_persistence` — applied.
- `pnpm db:migrate:status` — 3 migrations, up to date (exit 0).
- `pnpm typecheck` — all 4 workspace projects passed.
- `pnpm lint` — all projects passed.
- `pnpm test` — contracts 11 passed, database 15 passed, API 20 passed.
- `pnpm --filter … build` (contracts/database/api) — passed.
- `bash scripts/verify.sh` (via Git Bash; a temporary LF copy was used because
  the checkout has CRLF) — 60 passed, 0 failed.
- Manual boot of `node apps/api/dist/main.js` on `PORT=3010` — `GET /health`
  `{"status":"ok"}`, `GET /ready` `200 {"status":"ready"}`, exact PID stopped.

### Test and verification evidence

- `packages/database/test/research-persistence.spec.ts`: run+query+deduped
  source+evidence+linked claim; `UNVERIFIED` distinguishable; `PAUSED` +
  `pauseReason` vs `FAILED` + `errorCode`; duplicate claim↔evidence rejected;
  cascade delete keeps the source.
- `packages/contracts/test/contracts.spec.ts`: run/update/query/source/evidence
  schemas and the FACT/INFERENCE-requires-evidence, UNKNOWN-forbids-evidence
  rules.
- `apps/api/test/research-api.spec.ts`: full minimum resumable scenario, auth,
  FACT-without-evidence rejection, cross-run evidence rejection, pause/resume,
  checkpoint round-trip, `CONTEXT_CHANGED` block + acknowledgement, 404s.

### Known limitations

- `research_contexts` frozen snapshots and `priorResearchRuns` wiring are not
  implemented; resume blocks on a context change rather than reading a frozen
  version.
- `research-records`/findings, target-market suggestions, clarification
  requests, and DB-backed report generation remain unimplemented.
- Cross-row claim rules are service-enforced, not DB CHECK constraints.
- The Windows spawn fix emits Node's `DEP0190` deprecation warning (static args).
- Host Node is 24.19.0, one patch below the `.nvmrc` 24.20.0 (no `nvm` present);
  pnpm prints an engine warning but all checks pass.

### Decisions or blockers created

- Decision recorded: a first-class `evidence` entity (with `claim_evidence`
  stance links) refines the previously planned `claim_sources` join; discovery,
  evidence, and conclusions stay separate. Recorded in
  `docs/system/decisions.md` and `soft/docs/decisions.md`.
- No blocker. Next (separate tasks): frozen `research_contexts` snapshots,
  `research-records`, suggestions/clarifications, and full `market-researcher`
  execution with jobs/worker.
- Not committed or pushed.

### Reconciliation addendum — 2026-09-15 (fresh-client acceptance coverage)

Added one API integration test (`research-api.spec.ts`: "reads and resumes a
paused, fully-persisted run from a fresh client") that boots a **second, fresh
Nest application** sharing only the isolated test database, then reads the run,
queries, evidence, and claims and resumes the run through that fresh client. It
demonstrates the persisted state lives in PostgreSQL rather than process memory.
No functional change to the implementation. Suite counts are now contracts 11,
database 15, API 21 (47 total); `pnpm typecheck`, `pnpm lint`, and
`scripts/verify.sh` (60 passed / 0 failed) remain green.
