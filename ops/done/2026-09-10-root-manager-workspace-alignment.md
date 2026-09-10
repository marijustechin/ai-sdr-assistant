# O-001 — Root Manager Workspace Alignment

**Status:** DONE (archived)
**Archived:** 2026-09-10
**Type:** direction + documentation alignment
**Scope:** repository root (`AGENTS.md`, `README.md`, `.gitignore`, `ops/`,
`docs/`); `soft/docs/` link reconciliation only

## Objective

Establish the root-level **Manager Workspace** and one clear documentation
hierarchy, reconcile the canonical system documentation with the implemented
reality of `soft/` through T-004, and provide root-level Git safety — without
touching application code, dependencies, schema, migrations, database contents,
`apps/web`, or `legacy/`.

## Inputs / references

- `soft/AGENTS.md`, `soft/tasks/current.md`
- `docs/redesign/*.md` (all six proposal documents)
- `soft/docs/*` (implementation docs)
- Human decision: do not continue the blocked T-005 commit/push; align the root
  workspace and documentation first.

## Steps

1. Archive the blocked T-005 task as superseded and reset `soft/tasks/current.md`.
2. Create the root manager workspace (root `AGENTS.md`, `README.md`,
   `.gitignore`, `ops/`).
3. Create the canonical `docs/system/` set; mark `docs/redesign/` historical.
4. Reconcile `soft/docs/` to link to the root canonical docs (no duplication).
5. Verify Git safety and leave this task at `READY_FOR_HUMAN_REVIEW`.

## Deliverables

Root (new):

- `AGENTS.md`, `README.md`, `.gitignore`
- `ops/README.md`, `ops/current.md`, `ops/backlog.md`, `ops/task-template.md`,
  `ops/done/.gitkeep`
- `docs/README.md`
- `docs/system/architecture.md`, `module-map.md`, `data-governance.md`,
  `research-context-contract.md`, `decisions.md`, `project-state.md`

`soft/` (docs/harness only):

- `soft/tasks/done/2026-09-10-commit-push-foundation-baseline-superseded.md`
  (archived T-005); `soft/tasks/current.md` reset to the empty template
- canonical-source banners in `soft/docs/architecture.md`,
  `module-boundaries.md`, `data-ownership.md`, `task-execution.md`,
  `decisions.md`, `data-model.md`
- `soft/docs/contracts/research-context.v1.md` reduced to an implementation
  companion that links to the canonical root contract
- root cross-references in `soft/AGENTS.md` and `soft/README.md`

## Acceptance criteria

- [x] Blocked T-005 archived with final status
      `SUPERSEDED — root workspace alignment required before any baseline commit`;
      evidence preserved; `soft/tasks/current.md` reset to the template.
- [x] Root `AGENTS.md` created; distinguishes root-manager vs.
      `soft/AGENTS.md` responsibilities, PostgreSQL live state vs. Markdown,
      and the `ops/` vs. `soft/tasks/` task loops.
- [x] Root manager workspace (`ops/`) created and documented.
- [x] Canonical `docs/system/` set created and reconciled with implemented
      reality (Node 24 + pnpm 11; modules in
      `soft/apps/api/src/modules/<module>`; worker `soft/apps/worker`; no root
      `modules/`; `soft/packages/database` single Prisma owner; no
      `RepositoryBase`; `soft/apps/web` planned UI; ResearchContext contract;
      thin control-plane; ProductFact status/visibility model).
- [x] `docs/redesign/` marked historical/superseded in `docs/README.md`.
- [x] `soft/docs/` links to root canonical docs; the research-context contract
      is not duplicated.
- [x] Root `.gitignore` created; protects generated/private artifacts while
      retaining `.env.example`, source, migrations, docs, task archives, and
      lockfiles.
- [x] `docs/system/project-state.md` gives the implemented / not-implemented /
      blocked / next-slice snapshot.
- [x] O-001 left at `READY_FOR_HUMAN_REVIEW`; no commit or push.

## Out of scope

- Application/business source, dependencies, schema/migrations, database
  contents, `soft/apps/web`, `legacy/`, remote configuration.
- Creating or starting the Catalogue + Research Context implementation task.
- Any commit or push.

## Verification

- `git status --short` from the repository root.
- `git check-ignore` on protected and intended paths.
- `git add -n .` dry-run scan for secrets/generated files (nothing staged).
- `diff -q soft/harness/task-template.md soft/tasks/current.md`.
- `pnpm verify` in `soft/` (implementation harness gate; docs-only change).

## Rollback/blocked conditions

- Documentation/harness only; roll back by deleting the new root files and
  reverting the soft docs/task changes. No live state, schema, or remote is
  affected.

## Completion record

### Files created/changed

- **Created (root):** `AGENTS.md`, `README.md`, `.gitignore`,
  `ops/README.md`, `ops/current.md`, `ops/backlog.md`, `ops/task-template.md`,
  `ops/done/.gitkeep`, `docs/README.md`, and `docs/system/{architecture,
  module-map,data-governance,research-context-contract,decisions,project-state}.md`.
- **Changed (`soft/`):** archived
  `soft/tasks/done/2026-09-10-commit-push-foundation-baseline-superseded.md`;
  reset `soft/tasks/current.md`; added canonical-source banners to
  `soft/docs/{architecture,module-boundaries,data-ownership,task-execution,
  decisions,data-model}.md`; rewrote
  `soft/docs/contracts/research-context.v1.md` as an implementation companion;
  added root cross-references to `soft/AGENTS.md` and `soft/README.md`.
- **Not touched:** application/business source, dependencies, `schema.prisma`,
  migrations, database contents, `soft/apps/web`, `legacy/`, remote config.

### Migration applied

Not needed (documentation only).

### Endpoints/contracts added or changed

None. The Research Context contract moved in authority to the canonical root
`docs/system/research-context-contract.md`; the `soft/` copy now links to it.

### Document boundaries

- **Canonical (live):** root `AGENTS.md`; `docs/system/` (architecture, module
  map, data governance, research-context contract, decisions, project state).
- **Implementation (live):** `soft/AGENTS.md`; `soft/docs/` (implementation,
  testing, security, harness, data model) — links to the canonical root.
- **Historical, superseded:** `docs/redesign/` (marked in `docs/README.md`).
- **Historical, non-live:** `legacy/` (never modified, never authoritative).
- **Task loops:** `ops/` = root manager; `soft/tasks/` = programmer. Each has
  exactly one active task; `ops/` delegates implementation work into
  `soft/tasks/current.md`. Details in root `AGENTS.md` §5–§6 and
  `ops/README.md`.

### Root console git status and `.gitignore` evidence

`git status --short` (repository root):

```text
?? .gitignore
?? AGENTS.md
?? README.md
?? docs/
?? legacy/
?? ops/
?? soft/
```

`git check-ignore` results:

- IGNORED: `soft/.env`, `soft/.env.local`, `soft/node_modules`,
  `soft/apps/api/dist`, `soft/apps/web/.next`,
  `soft/packages/database/dist`, `soft/packages/database/src/generated`,
  `soft/coverage`, `soft/apps/api/foo.log`, `secrets/server.pem`,
  `.idea/workspace.xml`.
- NOT ignored (retained): `soft/.env.example`, `soft/pnpm-lock.yaml`,
  `soft/packages/database/prisma/schema.prisma`,
  `soft/packages/database/prisma/migrations/migration_lock.toml`,
  `soft/package.json`, `soft/AGENTS.md`, task archives, `docs/system/*`,
  `ops/*`, `legacy/README.md`, `AGENTS.md`, `.gitignore`.

`git add -n .` (dry-run; nothing staged): 148 files; the only `.env` entry is
`soft/.env.example`; no `node_modules`, `dist`, `.next`, `generated`,
`coverage`, `*.log`, `*.pem`, or key material.

### Test and verification evidence

- `diff -q soft/harness/task-template.md soft/tasks/current.md` → identical.
- T-005 archive header status:
  `SUPERSEDED — root workspace alignment required before any baseline commit`.
- `pnpm verify` in `soft/` → passed (see command results below).
- Git checks above.

### Commands run and results

- `cp soft/tasks/current.md soft/tasks/done/2026-09-10-commit-push-foundation-baseline-superseded.md`
  → archived; header edited to the superseded status; supersession note added.
- `cp soft/harness/task-template.md soft/tasks/current.md` → reset; `diff -q`
  identical.
- `git status --short`, `git check-ignore ...`, `git add -n .` → evidence above.
- `pnpm verify` (in `soft/`) → exit 0.
- No `git commit` and no `git push` were run.

### No live business state in Markdown

Confirmed. The new canonical docs contain only architecture, ownership rules,
contracts, decisions, and status. No product, offer, fact, opportunity, market,
research run, finding, company, contact, or lead **values** were written to any
Markdown file. `docs/system/project-state.md` explicitly separates status from
live values; live values remain solely in PostgreSQL.

### Known limitations

- The repository still has **no remote and no commits**; this task does not
  change that (per scope).
- The canonical `docs/system/` module map and Research Context contract describe
  the planned module set; those modules are not implemented (see
  `docs/system/project-state.md`).

### Decisions or blockers created

- Decisions recorded in `docs/system/decisions.md`: root Manager Workspace and
  one documentation hierarchy; Markdown is never live business state;
  `docs/redesign/` superseded by `docs/system/`.
- Blocker carried forward (unchanged): no configured `origin` remote and no
  baseline commit; a human must configure/verify the remote and re-decide the
  commit scope against this hierarchy before resuming a baseline commit.
- No implementation (Catalogue + Research Context) task was created or started.
