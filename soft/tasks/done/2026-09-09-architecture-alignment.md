# T-002 — Architecture Alignment After Baseline Audit

**Status:** DONE (archived)
**Archived:** 2026-09-09
**Type:** Documentation alignment only

## Objective

Update canonical `/soft` documentation so it accurately reflects:
- the accepted replacement decision for `apps/api`;
- feature modules under `apps/api/src/modules`;
- shared packages only under `packages/*`;
- `apps/web` as the retained planned future UI (`PLANNED_UI`, implementation
  deferred) for administration, review/approval queues, operational reporting,
  and dashboards — not legacy, not to be removed;
- future `apps/worker`, not a root `workers/*` directory.

## Allowed changes

- `README.md`
- `docs/architecture.md`
- `docs/module-boundaries.md`
- `docs/data-ownership.md`
- `docs/task-execution.md`
- `docs/decisions.md`
- `docs/harness.md`
- `tasks/current.md`
- the dated completed-task record

## Prohibited changes

- No source-code changes.
- No package/dependency changes.
- No Prisma schema, migration, configuration or Docker changes.
- No deleting/moving `apps/api` or `apps/web`.
- No new implementation task.

## Required decisions to record

1. Current `apps/api` is a legacy scaffold to be replaced.
2. Feature modules are NestJS modules under `apps/api/src/modules`.
3. `packages/database` is the only Prisma schema/migration owner.
4. `packages/contracts` owns shared Zod/TypeScript contracts.
5. `apps/web` is the planned future UI (`PLANNED_UI — retained,
   implementation deferred`) for administration, review and approval queues,
   operational reporting, and dashboards; not legacy, not removed, code
   untouched in this task.
6. `apps/worker` is deferred until long-running jobs genuinely require it.
7. T-003 will be the first code task: clean API/database foundation and the
   minimal central business spine. Its exact scope is not created yet.

## Architecture references

- docs/architecture.md
- docs/module-boundaries.md
- docs/data-ownership.md
- docs/task-execution.md
- docs/decisions.md
- docs/harness.md
- docs/audits/2026-09-09-existing-software-baseline.md

## Files/modules expected to change

- `README.md`
- `docs/architecture.md`
- `docs/module-boundaries.md`
- `docs/data-ownership.md`
- `docs/task-execution.md`
- `docs/decisions.md`
- `docs/harness.md`
- `tasks/current.md`
- `tasks/done/2026-09-09-existing-software-baseline.md`

## Schema/migration impact

- None (documentation only).

## Endpoint/contract impact

- None (no runtime endpoints or contracts change).

## Acceptance criteria

- [x] No remaining document instructs the agent to create `modules/*` or
      `workers/*` at repository root.
- [x] Folder trees and package-manager workspace declarations describe the
      same target layout.
- [x] The replacement decision and audit reference are recorded in
      `decisions.md`.
- [x] Documentation checks pass.
- [x] Set task status to READY_FOR_HUMAN_REVIEW.
- [x] Do not archive T-002 or start T-003.

## Verification commands

- `bash scripts/verify.sh`

## Rollback/blocked conditions

- Documentation only; revert the edited files to restore prior text. Blocked
  if a canonical doc cannot be updated consistently.

---

## Completion record

### Actual implementation summary

Documentation alignment only. Updated the canonical `/soft` docs so the
workspace layout reflects the accepted T-001 decisions: feature modules under
`apps/api/src/modules/<module>/`, shared packages only under `packages/*`
(database, contracts, later testkit), `apps/web` as the retained planned
future UI (`PLANNED_UI`, implementation deferred), and future `apps/worker`
(no root `workers/*`). Recorded the replacement decision and architecture
corrections in `decisions.md`.

### Files changed

- `AGENTS.md` — monorepo workspaces line: removed `modules/*`, documented
  feature-module location under `apps/api/src/modules/<module>/`.
- `README.md` — structure tree + toolchain: `apps/*`/`packages/*` workspaces;
  removed root `modules/`; noted feature modules under `apps/api/src/modules`;
  `apps/web` entry as planned future UI.
- `docs/architecture.md` — §4 layering path, §6 folder tree (modules nested
  under `apps/api/src/modules`, `apps/worker`/`apps/web` under `apps/*`,
  `packages/testkit`, removed `packages/config` and root `workers/*`), §7
  worker process, §9 historical-input row.
- `docs/task-execution.md` — worker process path `workers/*` → `apps/worker`.
- `docs/decisions.md` — added six decisions (replace scaffold; feature modules
  location; packages/* shared only; apps/web = planned future UI retained and
  deferred; apps/worker; T-003 first code task) referencing the audit.
- `tasks/backlog.md` — worker process path `workers/*` → `apps/worker`.
- `tasks/current.md` — this task (T-002) created and marked READY_FOR_HUMAN_REVIEW.

Unchanged (per prohibited scope): all source under `apps/**`, `packages/**`
(schema/migrations), Docker/config, `docs/audits/**`, `docs/contracts/**`,
`docs/module-boundaries.md`, `docs/data-ownership.md`, `docs/harness.md`
(no layout references needed changing), `../legacy/**`.

### Migration applied

Not needed.

### Endpoints/contracts added or changed

None (documentation only).

### Commands run and results

- `bash scripts/verify.sh` → `31 passed, 0 failed, 2 informational`, exit 0.
- `rg` scans to confirm no remaining root `modules/*` / `workers/*`
  instructions in canonical docs (only negations and historical records remain).

### Test and verification evidence

- `scripts/verify.sh` passes clean (structural + safety checks).
- Acceptance criteria all satisfied; no source/dependency/schema/config change.

### Known limitations

- `docs/audits/2026-09-09-existing-software-baseline.md` and the archived
  `tasks/done/*` records are historical and intentionally still reference the
  old `modules/*`/`workers/*` plan (factual record of the audit).
- `apps/web` is the planned future UI (`PLANNED_UI`), retained and untouched;
  its implementation is deferred. It is not legacy and not a component to
  remove.
- `apps/api` scaffold is unchanged and still does not compile; its replacement
  is deferred to T-003.

### Decisions or blockers created

- None blocking. T-003 (first code task) is intentionally **not** created,
  per the human decision gate.
