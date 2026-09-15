# O-012 — Finalize and commit the first research-wave milestone

**Status:** IN PROGRESS
**Type:** coordination (project-state) + decision (commit/push authorization)
**Scope:** root docs/`ops/`, database backup (outside the repository), and a
reviewed commit/push of the completed `soft/**` milestone. No new feature code.

## Objective

Accept and close O-011, verify the milestone, back up the real development
database, and commit/push the reviewed completed work. Leave the research run
`PAUSED` / `DIMINISHING_RETURNS` (`contextVersion 7`) with its checkpoint,
counters, follow-ups and claim lifecycle unchanged.

## Inputs / references

- `AGENTS.md` §3, §5–§9; `soft/AGENTS.md`
- `docs/system/project-state.md`, `docs/system/decisions.md`, `docs/system/module-map.md`
- `ops/done/2026-09-15-first-research-wave-lt-fi-gb.md` (closed O-011)
- `soft/tasks/done/2026-09-15-{research-persistence,product-scoped-research-discovery,claim-corrections}.md`
- Human authorization (2026-09-15): finalize, backup, commit, and push.

## Steps

1. Close O-011 (archive; record the first wave as accepted; not "Europe complete").
2. Review all staged/unstaged changes and task records; exclude unfinished or
   unrelated work; check docs reflect implemented behaviour.
3. Back up the real development database (custom-format `pg_dump`, outside the
   repository, persistent user folder); restore-verify into a disposable database.
4. Run the milestone verification gates on the compliant Node runtime, including
   the web application; run `git diff --check`.
5. Inspect the staged paths for secrets/dumps/generated/irrelevant files.
6. Commit the reviewed paths and push `main` to the existing origin.

## Deliverables

- `ops/done/2026-09-15-first-research-wave-lt-fi-gb.md` (O-011 archived)
- `ops/done/2026-09-15-finalize-first-milestone.md` (this task, archived)
- reset `ops/current.md`; updated `ops/backlog.md`; updated `docs/system/project-state.md`
- a local database backup outside the repository (not committed)
- one or more coherent commits pushed to `origin/main`

## Acceptance criteria

- [ ] O-011 archived and `ops/current.md` reset; first wave recorded as accepted.
- [ ] Database run still `PAUSED` / `DIMINISHING_RETURNS`, `contextVersion 7`.
- [ ] Backup exists outside the repo; restore verification matches the run counts
      (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`, 31 claims).
- [ ] Build/typecheck/lint/test/verify gates pass on compliant Node, incl. web.
- [ ] `git diff --check` clean; no secrets/dumps/generated files staged.
- [ ] `origin` is `github.com/marijustechin/ai-sdr-assistant`; push succeeds;
      no force-push or history rewrite.

## Out of scope

- New dashboard research functionality, searches, outreach, billing changes.
- Declaring European market research complete.
- Changing the run state or its checkpoint content.

## Verification

- API reads of the run + claims; `pg_restore` count checks.
- `pnpm -r build|typecheck|lint|test`, `bash scripts/verify.sh`, `git diff --check`.

## Rollback/blocked conditions

- Do not archive if any gate fails; record the blocker. Backup is additive; the
  disposable verification database is dropped after use.

## Completion record

**Completed:** 2026-09-15 · **Status:** DONE (committed/pushed by the
finalization commit; hashes in the final report).

1. **O-011 closed.** Archived the O-011 manager task (with its closure/acceptance
   record) to `ops/done/2026-09-15-first-research-wave-lt-fi-gb.md`. Recorded the
   first bounded research wave (LT / FI / GB) as **accepted**, and explicitly
   that European market research is **not** complete. Updated `ops/backlog.md`
   and reset `ops/current.md`.
2. **Database run unchanged.** `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1` remains
   `PAUSED` / `DIMINISHING_RETURNS`, `contextVersion 7`; checkpoint 19 cells /
   8 follow-ups; usage counters discovery 23/30, retrieval 35/50; claims 31
   (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`). This task changed no run state or
   checkpoint content.
3. **Backup.** Custom-format `pg_dump -Fc` of the real `ai_sdr` database from the
   `ai-sdr-assistant-postgres` service (PostgreSQL 17.11):
   `C:\Users\msmig\db-backups\ai-sdr\ai_sdr-20260915-162204.dump` — **62 782
   bytes**, SHA-256
   `7CAB30A39BE1CD740683B0572FCECDEE90C6CAFBC64E808E7A35E66FD6DB02ED`. Outside
   the repository; **not** committed or uploaded.
4. **Restore verification.** Restored into uniquely named disposable databases
   (`ai_sdr_restore_verify_*`), never over `ai_sdr`. Verified: product present;
   run `PAUSED` / `DIMINISHING_RETURNS` / v7; checkpoint 19/8; 31 claims
   (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`); 6 replaced-with-link; 3
   retracted-without-link; 9 corrected with reason+timestamp; 60 claim↔evidence
   links; 29 evidence rows; 28 sources for the run. The disposable databases were
   dropped after verification (only `ai_sdr`, `ai_sdr_test`, `ai_sdr_test_api`
   remain).
5. **Gates (compliant Node v24.20.0).** `build` (4 projects incl. the Next.js
   web app), `typecheck`, `lint`, `test` (**105 passed**: contracts 16, database
   16, api 35, web 38), and `verify.sh` (**60 passed / 0 failed**);
   `git diff --check` and `git diff --cached --check` clean.
6. **Review / exclusions.** Every working-tree change is part of this milestone
   (research persistence + operating harness + claim corrections + product-scoped
   discovery + admin product-management UI + canonical/implementation docs).
   Nothing unfinished or unrelated was included; **no exclusions**. No secrets,
   database dumps, or generated files were staged.
7. **Commit/push.** Reviewed paths committed to `main` and pushed to the existing
   `origin` (`github.com/marijustechin/ai-sdr-assistant`); no remote change,
   force-push, or history rewrite.
