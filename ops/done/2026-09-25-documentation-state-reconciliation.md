# O-026 — Documentation-state reconciliation and drift prevention

**Task ID:** O-026
**Status:** ACCEPTED — committed
**Completed:** 2026-09-25
**Commit:** this reconciliation commit (`docs(ops): reconcile project state and
prevent documentation drift`; hash in git log — self-reference not recorded)
**Type:** coordination
**Scope:** repository root (`ops/`, `docs/system/`, README files) + root verification tooling

## Objective

Reconcile current documentation/state with committed implementation evidence,
define a single source-of-truth responsibility hierarchy and finalization
invariants, and add a deterministic documentation-consistency check so completed
work cannot routinely leave `ops/`, the canonical system docs, and the READMEs
in contradictory states.

## Deliverables

- Reconciled `ops/current.md`, `ops/backlog.md`, `ops/task-template.md`, `ops/README.md`.
- Reconciled `docs/system/{project-state,module-map,architecture,decisions}.md`.
- Concise root `README.md`; accurate `soft/README.md`; historical marker `soft/legacy/README.md`.
- New canonical `docs/system/source-of-truth.md`.
- New `scripts/verify-docs.mjs`, integrated into `soft/scripts/verify.sh`.
- Machine-readable manager-task metadata (`Task ID`, `Status`) and the
  archive-required boundary marker in `ops/backlog.md`.

## Acceptance criteria

- [x] No O-task is simultaneously Active and Completed; `ops/current.md` no longer describes a completed task as active.
- [x] `architecture.md` status vocabulary is `implemented | implemented-subset | planned` and matches `soft/apps/api/src/modules/`.
- [x] `project-state.md` `Last updated` is not older than its newest dated entry.
- [x] `scripts/verify-docs.mjs` runs deterministically and passes; integrated into the harness.
- [x] No application behaviour change; `git diff --check` clean.

## Completion record

### Reconciled inconsistencies

- `ops/current.md` was stuck describing a committed task as `ACCEPTED`; the
  research-result task is now `O-025` with an archive.
- Backlog Active/Completed were stale; O-021/O-023/O-024/O-025 added to
  Completed, O-024's commit (`2f7d479`) recorded.
- `project-state.md` `Last updated` moved 2026-09-17 → 2026-09-25.
- `architecture.md` module status corrected from "not implemented" to the fixed
  vocabulary; `research-result` added; contracts no longer "planned".
- `module-map.md`, `soft/README.md`, and root `README.md` de-duplicated to
  orientation + pointers.

### Source-of-truth rules

`docs/system/source-of-truth.md`: one owner per status statement (project-state,
module-map, architecture, decisions, ops/current, ops/backlog, ops/done,
soft/tasks, READMEs) + finalization invariants. Referenced from root `AGENTS.md`
§8, `docs/README.md`, `ops/README.md`, and `ops/task-template.md`.

### Automated drift check

`scripts/verify-docs.mjs` (deterministic, no AI/prose parsing): required docs;
`ops/current.md` markers and no terminal status; backlog Active/Completed
disjointness and match with `ops/current.md`; current task not completed/archived;
archive presence for completed tasks from the marker boundary; recorded commit
hashes exist in git (all-digit tokens < 40 chars skipped to avoid date false
positives); `project-state.md` date; architecture module table vs code tree;
`soft/README.md` web placeholder. Wired into `soft/scripts/verify.sh` §7.

### Review notes (finalization)

- Brittleness reviewed: the archive boundary is data-driven
  (`archive-required-from=O-024` marker in `ops/backlog.md`), not a hardcoded
  task number; checks target stable structural invariants, not task names.
- Historical `ops/done` records without `Task ID` markers produce a **non-blocking
  WARN** only.
- No historical task record was rewritten; O-024/O-025 archives are explicitly
  labelled reconstructed, and `soft/tasks/done/**` is unchanged.
- No application/runtime behaviour changed: only docs, `ops/`, `soft/README.md`,
  `soft/legacy/README.md`, and the verification harness scripts.

### Commands and results

- `node scripts/verify-docs.mjs` → passed (0 failed; 1 non-blocking historical WARN).
- `bash soft/scripts/verify.sh` → 61 passed, 0 failed.
- `git diff --check` → clean (exit 0).
- Negative test: setting `ops/current.md` to a terminal status correctly failed
  the checker (exit 1); file restored byte-for-byte.

### Known limitations / risks

- 21 historical `ops/done` records lack `Task ID` markers (WARN; not backfilled
  to avoid mis-assignment).
- `architecture.md` runtime prose can still drift; the checker enforces module
  status vs the code tree, not the narrative.
- `project-state.md` retains long historical prose that partly restates the
  capability table; trimmable later without rewriting history.
