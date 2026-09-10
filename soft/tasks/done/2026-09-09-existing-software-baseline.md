# T-001 — Existing Software Baseline Audit

**Status:** DONE (archived)
**Archived:** 2026-09-09
**Decision gate:** Human review completed — ACCEPTED

## Objective

Establish the factual implementation baseline of the existing software.

Determine what is actually present, runnable, broken, obsolete or missing in
the current `/soft` workspace, and compare it with the accepted architecture
documents.

This task produces evidence and proposed next steps only. It does not repair,
replace, delete or scaffold application code.

## Allowed changes

- Create `docs/audits/2026-09-09-existing-software-baseline.md`.
- Update this task's progress/completion sections.
- Run read-only inspection and safe existing verification commands.

## Prohibited changes

- No source-code edits under `apps/**` or `packages/**`.
- No package installation, upgrade or removal.
- No Prisma schema edit, migration, generation, seeding or database mutation.
- No configuration/secret changes.
- No formatting, lint autofix, code generation, scaffold regeneration,
  destructive cleanup, commit or push.
- Do not modify canonical architecture, contract, testing, security or
  decision documents. Propose changes in the audit report instead.

## Required inspection

Inspect and report:

1. **Workspace and tooling** — Bun workspaces, package manifests, lockfile,
   TypeScript configuration; available scripts; dependencies and roles;
   Docker/Compose and environment files (no secret values exposed).
2. **Existing application code** — complete `apps/api` inventory; NestJS
   bootstrap/modules/controllers/services/repositories; API routes;
   validation/logging/error handling/tests; implemented vs scaffold code.
3. **Database state** — Prisma schema/generator/datasource/migrations; actual
   models/relations/constraints/indexes; mismatch against modular
   architecture; no DB connection/migration.
4. **Runnable-state evidence** — run existing build/typecheck/test commands;
   capture exact failing command + error + source location; no repair.
5. **Architecture gap analysis** — compare code vs architecture,
   module-boundaries, data-ownership, task-execution, research-context.v1;
   classify each item.

## Required deliverable

`docs/audits/2026-09-09-existing-software-baseline.md` (see report for full
contents: executive summary, technology inventory, source-tree inventory,
runnable-state results, database/Prisma assessment, mismatch table, keep /
replace / remove / defer recommendations, proposed doc changes, proposed next
task scope, assumptions/unknowns/blockers).

## Files/modules expected to change

- `docs/audits/2026-09-09-existing-software-baseline.md` (created)
- `tasks/current.md` (status update)

## Schema/migration impact

- None. No schema or migration created or modified.

## Endpoint/contract impact

- None changed. Existing scaffold routes recorded (`GET /product/all`,
  `GET /product/id/:id`, `POST /product/create`).

## Acceptance criteria

- [x] Report distinguishes facts from recommendations.
- [x] Every claimed build/test failure includes exact command + error summary.
- [x] No production source, migration, dependency, configuration, canonical
      doc, or legacy file modified.
- [x] Report gives enough information to decide salvage vs replace per area.

## Verification commands

- `bash scripts/verify.sh` → 31 passed, 0 failed, 2 informational (exit 0)
- `bun --version` → 1.3.14
- `bun run build` (root) → FAIL (api TS6133; web OK)
- `bun run build` (`apps/web`) → PASS
- `bun run build` (`apps/api`) → FAIL (TS6133 product.controller.ts:20:31)
- `bun run test` (`apps/api`) → FAIL ("No tests found")
- `bun --cwd apps/api run build` → FAIL (`--cwd` unsupported by Bun 1.3.14)

## Rollback/blocked conditions

- Read-only task; no rollback needed. Blocked on human decision between
  salvage and replace (resolved — see decision below).

---

## Completion record

### Actual implementation summary

Performed a read-only baseline audit of `/soft`. Produced
`docs/audits/2026-09-09-existing-software-baseline.md` covering: executive
summary, factual technology inventory, source-tree inventory, runnable-state
results, database/Prisma assessment, architecture mismatch table, keep /
replace / remove / defer recommendations per area, proposed (unapplied) doc
changes, proposed next-task scope, and assumptions/unknowns/blockers.

Key findings:

- Docs/process harness is complete and internally consistent; `verify.sh`
  passes clean.
- `modules/`, `workers/`, `packages/database`, `packages/contracts` are all
  absent; `packages/` contains only `.gitkeep`.
- `apps/api` is a NestJS 11 + Fastify + Prisma 7 scaffold that does not
  compile (TS6133) and has zero tests; its Prisma schema is in the wrong
  location (`apps/api/prisma/`), models only `Product`/`ProductCategory`, and
  has no `@owner` tags or migrations.
- `apps/web` is an unmodified Next.js 16 starter that builds successfully but
  is not part of the accepted architecture.
- Root `dev:api`/`dev:web` scripts are broken (`bun --cwd` unsupported).

### Files changed

Created:
- `docs/audits/2026-09-09-existing-software-baseline.md`
- `docs/audits/` directory

Changed:
- `tasks/current.md` (status → `READY_FOR_HUMAN_REVIEW`)

No source, dependency, migration, configuration, canonical doc, or legacy
file was modified.

### Migration applied

Not needed.

### Endpoints/contracts added or changed

None.

### Commands run and results

See "Verification commands" above. All results captured in the audit report
Appendix A.

### Test and verification evidence

- `bash scripts/verify.sh` → `31 passed, 0 failed, 2 informational`, exit 0.
- No runtime tests exist (no business code); `apps/api` jest run returns
  "No tests found".

### Known limitations

- Database was never connected/migrated; `apps/api/.env` contents not read.
- `test:e2e` not run (requires DB; references non-existent `AppController`).
- `apps/api/.env` presence confirmed but secret values not inspected.

### Decisions or blockers created

- **Human decision (ACCEPTED):** Replace, do not salvage, the current
  `apps/api` scaffold.
- **Human decision:** Do not remove or modify `apps/web` yet; it is deferred,
  not active.
- **Human decision:** Do not use root-level `modules/*` Bun workspaces.
  NestJS bounded feature modules live in `apps/api/src/modules/<module>/`.
- **Human decision (architecture correction):** Root `packages/*` contains
  only genuinely shared packages — `packages/database`, `packages/contracts`,
  and later `packages/testkit`.
- **Human decision:** A future queue worker is `apps/worker`; do not create it
  yet.
- **Blocker (resolved):** salvage vs replace decision — resolved to "replace".
- **Blocker (for next task):** none blocking; T-002 (documentation alignment)
  follows, then T-003 (first code task) is not created yet.
