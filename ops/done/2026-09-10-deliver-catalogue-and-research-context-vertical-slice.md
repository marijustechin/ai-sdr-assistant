# O-005 — Deliver Catalogue and Research Context Vertical Slice

**Status:** APPROVED — ARCHIVED (2026-09-10)
**Type:** delegation + project-state
**Scope:** root manager loop delegation; implementation delivered via `soft/tasks/current.md` (T-006)

## Objective

Deliver the first usable API vertical slice by delegating exactly one
implementation task (T-006) into `soft/tasks/current.md` and executing it: an
operator can enter canonical product, offer, product-fact, target-market, and
opportunity data once, and a future market researcher can retrieve the
appropriate context using only the Opportunity ID — with no product description
ever copied into a researcher prompt.

## Inputs / references

- root `AGENTS.md` (§5 two task loops, §6 delegation, §7 hard prohibitions)
- `docs/system/architecture.md`, `docs/system/module-map.md`,
  `docs/system/data-governance.md`,
  `docs/system/research-context-contract.md`, `docs/system/project-state.md`
- `soft/AGENTS.md`, `soft/docs/architecture.md`, `soft/docs/testing.md`,
  `soft/docs/security.md`, `soft/docs/contracts/research-context.v1.md`
- Human instruction: create and execute the first vertical slice; leave both
  tasks at READY_FOR_HUMAN_REVIEW; do not archive, commit, push, or start
  another task.

## Steps

1. Write T-006 into `soft/tasks/current.md` as the single delegation.
2. Execute T-006 inside `soft/` under `soft/AGENTS.md`.
3. Verify with Node 24.20.0 (`nvm exec 24.20.0 …`), migrations, and the full
   build/typecheck/lint/test/verify sequence.
4. Leave O-005 and T-006 at READY_FOR_HUMAN_REVIEW with completion records
   (no archive, no commit, no push, no next task).

## Deliverables

- `soft/packages/contracts` — Zod schemas + TypeScript contracts.
- `soft/apps/api/src/modules/{products-and-offers,opportunities,control-plane}`.
- One new database migration (Opportunity context version and the
  contract-required opportunity/product fields).
- Internal API-key guard, env validation, security docs, `.env.example`.
- Tests and verification evidence.

## Acceptance criteria

- [x] T-006 exists in `soft/tasks/current.md` as the single delegation.
- [x] Only the three named modules, `packages/contracts`, one migration, and
      supporting docs/tests changed.
- [x] All required endpoints implemented and guarded by the internal API key.
- [x] Research-context redaction rules implemented and tested.
- [x] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`,
      `pnpm lint`, `pnpm test`, `pnpm verify` all pass under Node 24.20.0.

## Out of scope

- ResearchRun/run endpoints, findings, sources/claims, queues, workers, LLM,
  scraping, lead/company/contact/outreach modules, real Abachi records.
- Changing canonical root `docs/system/**` architecture or contracts.
- Committing, pushing, archiving, or starting another task.

## Verification

- `nvm exec 24.20.0 pnpm --dir soft install --frozen-lockfile`
- `nvm exec 24.20.0 pnpm --dir soft build`
- `nvm exec 24.20.0 pnpm --dir soft typecheck`
- `nvm exec 24.20.0 pnpm --dir soft lint`
- `nvm exec 24.20.0 pnpm --dir soft test`
- `nvm exec 24.20.0 pnpm --dir soft verify`
- `git diff --check`

## Rollback/blocked conditions

- Rollback: `git checkout -- soft/` and reset `soft/tasks/current.md` and
  `ops/current.md` to their templates; drop the new migration if it was applied.
- Blocked if verification fails, if a file outside scope is touched, or if the
  same Node/DB prerequisites cannot be met — do not archive; record the blocker
  here.

## Completion record

**Completed:** 2026-09-10
**Status:** APPROVED — archived as
`ops/done/2026-09-10-deliver-catalogue-and-research-context-vertical-slice.md`

See the completion record in `soft/tasks/current.md` (T-006) for the full
implementation, command, and verification evidence. Summary:

1. Files created/changed: enumerated in T-006.
2. Migrations applied: one migration adding Opportunity `context_version` and
   `objective`, and Product `category`.
3. Endpoints/contracts: `packages/contracts` (`research_context_v1`) and the
   seven required routes.
4. Commands run and results: recorded in T-006 (all pass under Node 24.20.0).
5. Test/verification evidence: recorded in T-006.
6. Known limitations: recorded in T-006 (evidence/source tables, research runs,
   and knowledge/companies/human-decision sections remain empty/planned).
7. Decisions/blockers: the internal-key guard, the context-version bump rule,
   and the added objective/category fields are recorded in
   `soft/docs/decisions.md`. No blocker remains.

**Post-review documentation correction (2026-09-10, documentation only):**
root `docs/system/` is canonical and now describes the implemented slice —
`project-state.md` moved Catalogue + Research Context API into Implemented and
lists `packages/contracts`, the three modules, the endpoint group, and the
internal-key boundary while retaining what is not implemented;
`research-context-contract.md` states that `GET
/opportunities/:id/research-context` returns a **current assembled** context
(not an immutable/research-run snapshot), that freezing exact context is a
future ResearchRun/snapshot capability, and that redaction/SUPERSEDED rules
remain mandatory; `module-map.md` records the implemented initial module status,
the service-to-service key boundary, and current-vs-frozen context semantics;
`decisions.md` records the internal-key boundary and the current-context
semantics. No source code, dependencies, contracts, migrations, database
contents, endpoint behaviour, remote configuration, or legacy files were
changed. `nvm exec 24.20.0 pnpm --dir soft verify` → 60 passed, 0 failed;
`git diff --check` → clean.

**Human review:** approved 2026-09-10; archived without commit or push.
