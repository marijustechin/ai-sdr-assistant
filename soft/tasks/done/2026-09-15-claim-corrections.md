# Claim correction lifecycle (retraction/replacement)

**Status:** DONE

## Objective

Add a bounded, domain-specific claim-correction lifecycle to the `evidence`
module so a research claim can be explicitly **retracted** or **replaced**,
without deleting or mutating its original content. The lifecycle is separate
from `ClaimType` (FACT/INFERENCE/UNKNOWN) and from evidence verification status.
Current-claim retrieval excludes retracted/replaced claims by default; history
stays explicitly retrievable. Corrections are internal-key protected,
transactional, and validated against invalid replacement links and cycles.

## Allowed scope

- `soft/packages/database` (schema + one additive migration + integration test)
- `soft/packages/contracts` (Zod contract + test)
- `soft/apps/api/src/modules/evidence/**` (domain types, repository, service,
  controller)
- `soft/apps/api/test/**` (API integration test)
- `soft/docs/{data-model,module-boundaries,decisions}.md`
- root `docs/system/{data-governance,module-map,decisions,project-state}.md`
- `docs/system/research-harness/{persistence-boundary,operating-manual,evidence-and-outputs}.md`
- `soft/tasks/**`, `ops/current.md` (records only)

## Prohibited scope

- No modification of real research records (run `ba1fcdd0…` stays paused and
  untouched); no API writes to the real run.
- No generic versioning framework, no new source/evidence mutation, no change to
  `ClaimType` or `EvidenceVerificationStatus`.
- No new search/outreach/dashboard work; no commit or push.

## Architecture references

- `../AGENTS.md` §3, §5–§7; `AGENTS.md`
- `docs/architecture.md`, `docs/security.md`, `docs/contracts/research-context.v1.md`
- `docs/data-model.md`, `docs/data-ownership.md`, `docs/module-boundaries.md`
- root `docs/system/data-governance.md`, `docs/system/module-map.md`
- root `docs/system/research-harness/persistence-boundary.md`

## Files/modules expected to change

As implemented:

- `packages/database/prisma/schema.prisma` + `migrations/20260915120000_claim_corrections/migration.sql`
- `packages/database/test/research-persistence.spec.ts`
- `packages/contracts/src/research.ts` + `packages/contracts/test/contracts.spec.ts`
- `apps/api/src/modules/evidence/domain/types.ts`
- `apps/api/src/modules/evidence/infrastructure/evidence.repository.ts`
- `apps/api/src/modules/evidence/application/evidence.service.ts`
- `apps/api/src/modules/evidence/presentation/evidence.controller.ts`
- `apps/api/test/claim-corrections-api.spec.ts`
- docs + `ops/current.md`

## Schema/migration impact

One additive migration `20260915120000_claim_corrections`: enum
`ClaimLifecycleStatus` (`CURRENT | RETRACTED | REPLACED`) and four columns on
`claims` (`lifecycle_status` default `CURRENT`, `correction_reason`,
`corrected_at`, `replaced_by_claim_id` self-FK `ON DELETE SET NULL`) plus
`claims_lifecycle_status_idx`. Applied to `ai_sdr`; the isolated test databases
apply it via `prisma migrate deploy`. Rollback: drop the columns/enum + FK in a
down migration.

## Endpoint/contract impact

- `POST /opportunities/:opportunityId/research-runs/:runId/claims/:claimId/corrections`
  (body `{ kind: RETRACTION | REPLACEMENT, reason, replacementClaimId? }`).
- `GET .../claims` now excludes non-`CURRENT` claims; `?includeHistory=true`
  returns the full preserved history.
- New contracts: `ClaimLifecycleStatusSchema`, `ClaimCorrectionKindSchema`,
  `CorrectClaimSchema` (+ `CorrectClaimInput`).

## Acceptance criteria

- [x] Original claim and its evidence links are preserved (never deleted/edited).
- [x] Retraction sets `RETRACTED`; replacement sets `REPLACED` +
  `replacedByClaimId`; both record `correctionReason` + `correctedAt`.
- [x] Lifecycle is a separate dimension from claim type and evidence status.
- [x] Current list excludes retracted/replaced; `includeHistory=true` returns all.
- [x] Invalid replacement links (missing/self/other-run/not-current) rejected.
- [x] Cycles rejected; double-correction rejected (409).
- [x] Internal-key protection applies; correction write is transactional.
- [x] Tests prove current excludes corrected, replacement appears, history keeps
  the original.

## Verification commands

See the completion record.

## Rollback/blocked conditions

Single additive migration; revert the delegation and drop the new columns/enum.
No blocker.

## Completion record

**Completed:** 2026-09-15 · **Status:** READY_FOR_HUMAN_REVIEW.

1. **Files created/changed**
   - `packages/database/prisma/schema.prisma` — `ClaimLifecycleStatus` enum;
     `Claim` gains `lifecycleStatus`, `correctionReason`, `correctedAt`,
     `replacedByClaimId`, a `ClaimReplacement` self-relation, and an index.
   - `packages/database/prisma/migrations/20260915120000_claim_corrections/migration.sql`
     (new, additive).
   - `packages/database/test/research-persistence.spec.ts` — new lifecycle test.
   - `packages/contracts/src/research.ts` — `ClaimLifecycleStatusSchema`,
     `ClaimCorrectionKindSchema`, `CorrectClaimSchema` + types.
   - `packages/contracts/test/contracts.spec.ts` — correction contract test.
   - `apps/api/src/modules/evidence/domain/types.ts` — lifecycle types,
     extended `ClaimRecord`, `CorrectClaimData`, `ClaimCorrectionError`.
   - `apps/api/src/modules/evidence/infrastructure/evidence.repository.ts` —
     lifecycle mapping, current/history list, transactional `correctClaim`.
   - `apps/api/src/modules/evidence/application/evidence.service.ts` —
     `correctClaim` (error mapping) + `listClaims(includeHistory)`.
   - `apps/api/src/modules/evidence/presentation/evidence.controller.ts` —
     correction route + `includeHistory` query.
   - `apps/api/test/claim-corrections-api.spec.ts` (new).
   - Docs: `soft/docs/{data-model,module-boundaries,decisions}.md`;
     root `docs/system/{data-governance,module-map,decisions,project-state}.md`;
     harness `persistence-boundary.md`, `operating-manual.md`,
     `evidence-and-outputs.md`; `ops/current.md`.
2. **Migration applied:** `20260915120000_claim_corrections` (additive) to
   `ai_sdr`; `pnpm --dir soft db:migrate:status` → *Database schema is up to
   date* (4 migrations). Test databases applied it via `prisma migrate deploy`.
3. **Endpoints/contracts added:** correction endpoint + `includeHistory`; three
   new Zod contracts (above).
4. **Commands run / results:**
   - `pnpm --dir soft db:migrate` → migration applied; `db:migrate:status` clean.
   - `pnpm --dir soft db:generate` → Prisma client regenerated.
   - `pnpm --dir soft -r run typecheck` → pass (4 projects).
   - `pnpm --dir soft -r run lint` → pass (4 projects).
   - `pnpm --dir soft -r run test` → **105 passed** (contracts 16, database 16,
     api 35, web 38).
   - `bash scripts/verify.sh` (Git Bash, staged Node v24.20.0) → **60 passed,
     0 failed**.
5. **Test/verification evidence:** API integration tests prove (a) current
   retrieval excludes a replaced/retracted claim, (b) the replacement appears in
   current results, (c) the original remains in `?includeHistory=true` with its
   statement, type and evidence links intact, and (d) invalid corrections
   (shape, self, cross-run, non-current, double, unknown) are rejected with
   non-sensitive typed errors. A database integration test proves the default
   `CURRENT` and the `REPLACED`/`replacedByClaimId` write.
6. **Known limitations:** a claim can be corrected once (terminal; no re-open);
   the correction metadata lives on the claim row (no separate event table,
   deliberately avoiding a generic versioning framework); a replacement may be
   shared by more than one corrected claim (allowed, documented); the running
   dev API process must be restarted to expose the new route; the real run's
   correction mapping is proposed only and **not** applied.
7. **Decisions/blockers:** decision recorded in `soft/docs/decisions.md` and
   root `docs/system/decisions.md` (bounded lifecycle, not generic versioning).
   No blocker. Real research records were not modified; nothing committed or
   pushed.

## Applied corrections (human-approved) — 2026-09-15

The human approved the six replacements and three retractions from the batch-D
mapping (`ops/current.md`); they were applied to run
`ba1fcdd0-60c0-4478-a489-e0d5508b9ab1`.

1. **API process restart (compliant runtime).** The exact listener on `:3003`
   was identified as PID `26592` (`node … src/main.ts` under host Node 24.19.0)
   and stopped **by PID only** (no broad name/command-line filters). The same
   entrypoint was restarted under the staged **Node v24.20.0**
   (`…\Temp\opencode\node-v24.20.0-win-x64\node.exe`) as PID `11844`;
   `GET /health` → `200 {"status":"ok"}`, `GET /ready` → `200 {"status":"ready"}`.
2. **Preflight.** `GET .../claims?includeHistory=true` → **31** claims, default
   `GET .../claims` → 31 (all `CURRENT`); the 15 affected/replacement statements
   matched the recorded reasons exactly; no entry had changed, so none was left
   untouched and no discrepancy was found.
3. **Applied through the correction API** (all `201`):
   - REPLACEMENTS: `541dbb6a`→`4fb567ae`, `035cb1ed`→`14773f20`,
     `396492bd`→`8435a851`, `47498ee0`→`8efa09ee`, `0e67d2a0`→`2a50625c`,
     `8a47fa94`→`53e87136`.
   - RETRACTIONS: `bd8c6cab`, `403d9ebf`, `2a6813fd`.
4. **Verification (53 checks, 0 failures):** history `31`; current `22`;
   `REPLACED` `6`; `RETRACTED` `3`; current list equals the `CURRENT` subset;
   each replacement link, reason and `correctedAt` correct; originals'
   statement/type/evidence links preserved; replacement targets remain `CURRENT`,
   appear in current results, and were not modified (`updatedAt == createdAt`);
   retractions absent from current; run still `PAUSED` /
   `DIMINISHING_RETURNS`; `contextVersion` `7`; usage counters unchanged
   (discovery 23/30; retrieval 35/50).
   - Note: one non-ASCII character in claim `4fb567ae` differs only through a
     JSON round-trip in the verification tooling (encoding-only artifact); that
     row's `updatedAt == createdAt` proves it was not modified.
5. **Run state:** corrections were accepted while `PAUSED` (the correction path
   has no status gate), so no `RUNNING` transition was needed and the
   context-version guard was not triggered.
6. **Checkpoint:** the provisional append-only correction instructions in
   `checkpoint.notes` were replaced with the formal lifecycle results; coverage
   (19 cells) and pending follow-ups (8) were preserved unchanged.
7. **Scope:** no searches, no new findings, no outreach, no dashboard changes,
   no commit or push.
