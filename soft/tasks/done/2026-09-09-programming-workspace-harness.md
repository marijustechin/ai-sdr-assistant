# Task: Establish the programming workspace and autonomous development harness

**Status:** DONE (archived)
**Archived:** 2026-09-09

## Objective

Establish the permanent programming workspace under `soft/` and the autonomous
development harness (AGENTS contract, self-contained architecture docs,
testing/security policy, task template + acceptance checklist, verify script,
and task record structure). No business modules, migrations, research logic, or
external integrations.

## Allowed scope

- `soft/AGENTS.md`, `soft/README.md`
- `soft/docs/**` (architecture, boundaries, data-ownership, task-execution,
  testing, security, decisions, harness, task-format, contracts/research-context.v1.md)
- `soft/harness/**`, `soft/scripts/verify.sh`
- `soft/tasks/backlog.md`, `soft/tasks/current.md`, `soft/tasks/done/**`
- `soft/packages/` directory placeholder

## Prohibited scope

- No business module implementation (no `modules/**` source).
- No database migrations or `packages/database` schema.
- No research logic or external integrations.
- No modification of `../legacy/**` or `soft/apps/api/**` source.

## Architecture references

- docs/architecture.md
- docs/module-boundaries.md
- docs/data-ownership.md
- docs/task-execution.md
- docs/contracts/research-context.v1.md
- docs/security.md
- docs/testing.md

## Files/modules expected to change

- `AGENTS.md`, `README.md`
- `docs/*.md`, `docs/contracts/research-context.v1.md`
- `harness/task-template.md`, `harness/acceptance-checklist.md`
- `scripts/verify.sh`
- `tasks/backlog.md`, `tasks/current.md`
- `packages/.gitkeep`

## Schema/migration impact

- None. No Prisma schema or migration is created in this task.

## Endpoint/contract impact

- None (no runtime endpoints). The `research_context_v1` contract is
  documented only, not implemented.

## Acceptance criteria

- [x] Required workspace structure exists under `soft/`.
- [x] `AGENTS.md` defines the instruction hierarchy, toolchain, invariants,
      prohibitions, task loop, scope discipline, and completion-report rules.
- [x] Architecture docs are self-contained and cover: central Postgres state,
      bounded modules, thin control-plane, Task/Execution/Activity/Approval
      separation, evidence/claim provenance, `research_context_v1`, typed
      product facts, human approval gates, BullMQ direction (no worker).
- [x] `research-context.v1.md` states: researcher receives only `taskId` +
      `opportunityId`; product data loaded from central system; `schemaVersion`
      + frozen revision; only CONFIRMED assertable; pending/restricted redacted;
      superseded absent; Task stores scope (`targetMarketIds`, optional
      country/industry).
- [x] `testing.md` defines test levels, mandatory checks, fixtures, prohibitions,
      and DONE evidence.
- [x] `security.md` defines secrets, minimisation/provenance, log/commit hygiene,
      human-approved outreach, restricted-fact access, retention/deletion.
- [x] `harness.md` + `task-format.md` define one active task and archive format.
- [x] `scripts/verify.sh` runs available checks and fails fast.
- [x] Bootstrap task archived to `tasks/done/2026-09-09-programming-workspace-harness.md`.

## Verification commands

- `bash scripts/verify.sh` → 31 passed, 0 failed, 2 informational (exit 0)
- `bun --version` → 1.3.14

## Rollback/blocked conditions

- No rollback needed (docs only). Blocked if a required doc cannot be written
  or `verify.sh` fails on a mandatory structural check.

---

## Completion record

### Actual implementation summary

Established the `soft/` workspace as the permanent programming workspace and
autonomous development harness. Wrote the binding `AGENTS.md` contract; a
self-contained architecture suite under `soft/docs/` (ported from the
`docs/redesign/` design already present at the repo root, adapted to be
self-contained and to reference `../legacy/` as non-live historical input);
testing and security policies; the dev harness and task-format docs; the task
template and acceptance checklist; a fail-fast `verify.sh`; and the task
record structure (backlog, active task, done/ archive).

### Files changed

Created:
- `AGENTS.md` (rewrote the placeholder)
- `README.md` (was empty)
- `docs/architecture.md` (was empty)
- `docs/module-boundaries.md`
- `docs/data-ownership.md`
- `docs/task-execution.md`
- `docs/testing.md` (replaced unrelated Electron/IMAP template content)
- `docs/security.md`
- `docs/decisions.md` (was empty)
- `docs/harness.md`
- `docs/task-format.md`
- `docs/contracts/research-context.v1.md`
- `harness/task-template.md`
- `harness/acceptance-checklist.md`
- `scripts/verify.sh` (chmod +x)
- `tasks/backlog.md`
- `tasks/current.md` (bootstrap task)
- `tasks/done/2026-09-09-programming-workspace-harness.md` (this file)
- `packages/.gitkeep` (placeholder; `packages/` directory established)

Unchanged (left as pre-existing historical/legacy input):
- `apps/api/**` source (broken scaffold, documented as to-be-replaced)
- `../legacy/**` (not modified)
- `index.ts`, `tsconfig.json`, `package.json`, `bun.lock`, `.gitignore`

### Migration applied

Not needed. No schema or migration created in this task.

### Endpoints/contracts added or changed

None at runtime. `docs/contracts/research-context.v1.md` documents the
`research_context_v1` contract (schema version + typed fact states) but no
endpoint or code was implemented.

### Commands run and results

- `bash scripts/verify.sh` → `31 passed, 0 failed, 2 informational`, exit 0.
- `bun --version` → `1.3.14`.
- Structural/link/path inspection via `find`, `grep`, and `git status`.
- `apps/api` build was **not** treated as a required check: it fails on the
  pre-existing broken scaffold (`nest build`) and is out of scope for this
  docs-only task; reported as informational.

### Test and verification evidence

- `scripts/verify.sh` (structural + safety checks) passes with exit 0.
- No business modules (`modules/` absent), no `packages/database` schema, no
  migration directories — confirmed by the script.
- Secret scan clean (false positives from generated Prisma output and the stock
  NestJS README badge were excluded with justification).
- Referenced `../legacy/**` paths verified to exist.

### Known limitations

- No runtime tests exist yet (no business code). Testing policy is documented
  but unexercised.
- `apps/api` is a broken legacy scaffold (build fails); replacement is a
  future task, not part of this one.
- `verify.sh` build/test checks are informational only, by design, until real
  business code and a `packages/database` schema exist.

### Decisions or blockers created

- Decision: `docs/testing.md` previously contained unrelated Electron/IMAP
  template content; it was replaced with the NestJS/Prisma testing policy.
- Blocker (for next task): none. The next task is the `packages/database`
  foundation (see `tasks/backlog.md`), which is intentionally **not** started
  here per the harness rule "no automatic start of the next task".
