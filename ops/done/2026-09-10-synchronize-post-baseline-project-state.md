# O-003 — Synchronize Post-Baseline Project State

**Status:** APPROVED — ARCHIVED (2026-09-10)
**Type:** project-state
**Scope:** repository-root documentation (`README.md`, `docs/system/project-state.md`)
and operating instructions (`AGENTS.md`, `soft/AGENTS.md`)

## Objective

Reconcile the stale repository-status statements in `README.md` and
`docs/system/project-state.md` with the confirmed post-baseline reality: the
root repository exists, `main` tracks `origin/main`, baseline commit
`0c6a10103519b9065654ad4ba8e51a6aa3d2058d` exists and was pushed, the working
tree was clean immediately after the baseline push, and the next planned
functional slice remains the Catalogue + Research Context API.

Post-review correction: document the runtime-activation rule (activate the Node
version declared by `soft/.nvmrc`, currently 24.20.0, before any root-started
`soft/` command) in both operating contracts, and re-run verification under that
Node version so the earlier Node 26 environment failure is resolved.

## Inputs / references

- `AGENTS.md` (§2 workspace/toolchain, §3 live state vs Markdown, §7 hard
  prohibitions)
- `soft/AGENTS.md` (§2 workspace and toolchain)
- `soft/.nvmrc` → `24.20.0`
- `docs/system/project-state.md`, `README.md`
- `ops/task-template.md`, `ops/README.md`
- Human confirmation: `origin/main` points to
  `0c6a10103519b9065654ad4ba8e51a6aa3d2058d`; the complete project baseline was
  successfully pushed.
- Human review instruction: apply the runtime-activation rule to root and `soft`
  operating instructions and re-verify under Node 24.20.0.
- Prior record: `ops/done/2026-09-10-commit-push-complete-project-baseline.md`
  (O-002).

## Steps

1. Confirm baseline: `git rev-parse HEAD origin/main` and `git status`.
2. Rewrite the stale "no commit / no remote" statements in `README.md` and the
   stale "Blocked" entry in `docs/system/project-state.md`.
3. Post-review correction: document the runtime-activation rule in `AGENTS.md`
   and `soft/AGENTS.md`, including the safe pattern
   `nvm exec 24.20.0 pnpm --dir soft <command>`.
4. Run `git diff --check`.
5. Run `pnpm --dir soft verify` under Node 24.20.0 activated from `soft/.nvmrc`.
6. Record the completion and leave this task at `READY_FOR_HUMAN_REVIEW`
   (no archive, no commit, no push, no programming task).

## Deliverables

- `README.md` — corrected repository-status statement.
- `docs/system/project-state.md` — corrected repository-status statement.
- `AGENTS.md` — runtime-activation rule for `soft/` commands.
- `soft/AGENTS.md` — runtime-activation rule for `soft/` commands.
- `ops/current.md` — this task record (left at `READY_FOR_HUMAN_REVIEW`).

## Acceptance criteria

- [x] `README.md` no longer claims there is no commit and no remote.
- [x] `docs/system/project-state.md` no longer lists the baseline commit/push as
      blocked; it states the repository exists, `main` tracks `origin/main`, the
      baseline commit `0c6a10103519b9065654ad4ba8e51a6aa3d2058d` was pushed, and
      the working tree was clean immediately after the push.
- [x] Both files state that the next planned functional slice remains the
      Catalogue + Research Context API.
- [x] `AGENTS.md` and `soft/AGENTS.md` require activating the Node version
      declared by `soft/.nvmrc` (currently 24.20.0) before any root-started
      `soft/` pnpm/Prisma/test/build/lint/verification command, and document
      `nvm exec 24.20.0 pnpm --dir soft <command>`.
- [x] No architecture, business model, source code, dependency, schema,
      migration, database, remote, or `legacy/**` content was changed.
- [x] `git diff --check` is clean and `pnpm --dir soft verify` passes (53/53)
      under Node 24.20.0.

## Out of scope

- Application code, schema, migrations, database contents, Docker/DB state.
- Git configuration, remotes, commits, pushes.
- Canonical architecture/business design and `docs/system/decisions.md`.
- `docs/system/module-map.md`, `data-governance.md`,
  `research-context-contract.md`.
- All `soft/**` except the `soft/AGENTS.md` operating instructions.
- `legacy/**`, `docs/redesign/**`, `ops/backlog.md` (stale entries there are a
  known limitation, not part of this task's approved scope).
- Creating a `soft/tasks/current.md` programming task.

## Verification

- `git diff --check` → no whitespace/conflict errors.
- Node activated from `soft/.nvmrc`: `nvm exec 24.20.0 node --version` →
  `v24.20.0`; `nvm exec 24.20.0 pnpm --version` → `11.26.0`.
- `nvm exec 24.20.0 pnpm --dir soft verify` → `53 passed, 0 failed`.
- `git diff` inspection limited to `README.md`,
  `docs/system/project-state.md`, `AGENTS.md`, `soft/AGENTS.md`, and this
  `ops/current.md`.

## Rollback/blocked conditions

- Rollback: `git checkout -- AGENTS.md README.md docs/system/project-state.md
  soft/AGENTS.md` and reset `ops/current.md` to the empty template. No live
  state, schema, or remote is affected.
- Blocked if the baseline hash does not match `HEAD`/`origin/main`, if
  verification fails, or if any file outside the approved scope is touched —
  in that case do not archive; record the blocker here.

## Completion record

**Completed:** 2026-09-10
**Status:** APPROVED — archived as
`ops/done/2026-09-10-synchronize-post-baseline-project-state.md`

1. **Files created/changed:** `README.md`,
   `docs/system/project-state.md`, `AGENTS.md`, `soft/AGENTS.md`,
   `ops/current.md` (task record), and this archive.
2. **Migrations applied:** not needed (documentation-only).
3. **Endpoints/contracts added or changed:** none.
4. **Commands run and results:**
   - `git rev-parse HEAD origin/main` → both
     `0c6a10103519b9065654ad4ba8e51a6aa3d2058d`.
   - `git status --porcelain` → clean before edits.
   - `nvm exec 24.20.0 node --version` → `v24.20.0`.
   - `nvm exec 24.20.0 pnpm --version` → `11.26.0`.
   - `nvm exec 24.20.0 pnpm --dir soft verify` → exit 0:
     `verify.sh summary: 53 passed, 0 failed, 0 informational`.
   - `git diff --check` → exit 0, clean (no output).
5. **Test/verification evidence:** after activating Node 24.20.0 per
   `soft/.nvmrc`, `verify.sh` passes all 53 mandatory structural and safety
   checks, including `node version v24.20.0 (Node 24 LTS)`. The earlier Node
   26 failure is resolved by activating the declared Node version rather than
   relying on the host default. `git diff --check` is clean; `git diff --stat`
   shows only the five approved files changed.
6. **Known limitations:** `ops/backlog.md` still contains stale pre-baseline
   entries (e.g. "Confirm remote + baseline commit policy") that were outside
   this task's approved scope and should be reconciled in a follow-up manager
   task.
7. **Decisions made or blockers created:** none; no blocker remains. This task
   also records the standing runtime-activation rule for root-started `soft/`
   commands. O-002's completion was historically not reflected in
   `docs/system/project-state.md`, which this task corrects.

**Human review:** approved 2026-09-10; archived without commit or push.
