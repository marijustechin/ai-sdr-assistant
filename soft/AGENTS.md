# AGENTS.md — Operating Contract for the Coding Agent

This file is the **binding** operating contract for the `soft/` implementation
workspace. It governs **implementation work only**. Manager-level work (system
direction, cross-module coordination, human decisions, product/research intake,
delegation, project state) is governed by the repository-root
[`../AGENTS.md`](../AGENTS.md).

Canonical system/business documentation lives at the repository root in
[`../docs/system/`](../docs/system/); this workspace's `docs/` is the
implementation/testing/security companion and links to the root canonical set.
Where implementation docs restate system design or contracts, the root canonical
documents win.

When instructions conflict, the higher-ranked source wins. The agent must not
override this file.

## 1. Instruction Hierarchy

1. **AGENTS.md** (this file)
2. `docs/architecture.md`, `docs/security.md`, `docs/contracts/*`
3. `docs/decisions.md`
4. `docs/testing.md`
5. `tasks/current.md`

`tasks/current.md` is the only active unit of work. It may *narrow* scope but
never broaden it beyond the higher layers.

## 2. Workspace and Toolchain

- **Monorepo:** pnpm workspaces only (`apps/*`, `packages/*`), declared in
  `pnpm-workspace.yaml`. NestJS bounded feature modules live under
  `apps/api/src/modules/<module>/` (no root `modules/*` workspace).
- **Runtime/package manager:** Node.js 24 LTS (see `.nvmrc`) and pnpm 11
  (`packageManager` field in root `package.json`). Bun is not used.
- **Stack:** TypeScript; NestJS + Fastify (`apps/api`); PostgreSQL + Prisma
  (`packages/database`); Zod for shared contracts; Docker Compose for local DB.
- Do not invent or assume package scripts. Only invoke scripts that actually
  exist in a `package.json` after reading it.
- Run commands from the workspace root (`soft/`) unless the script lives in a
  workspace package.
- **Node version activation.** When an agent is started from the repository root
  and runs any `soft/` pnpm, Prisma, test, build, lint, or verification command,
  it must first activate the Node version declared by `.nvmrc` (currently Node
  24.20.0). Do not rely on the host default Node version. A safe pattern for a
  root-started agent is `nvm exec 24.20.0 pnpm --dir soft <command>`; inside
  `soft/`, load `$NVM_DIR/nvm.sh` and run `nvm use` first.

## 3. Architecture Invariants

- Modules use **dependency injection** internally. A module must **never** call
  the app's own REST API over HTTP; it uses injected application services.
- **One Prisma schema and one migration chain** in `packages/database`. No other
  package or module may define a schema or run migrations.
- **No raw database writes** outside typed repositories/services provided by
  `packages/database` (or a module's own repository implementing a domain
  interface).
- **No module writes another module's tables.** Every table has exactly one
  write-owner (see `docs/data-ownership.md`). Cross-boundary changes go through
  the owning module's application service.

## 4. Hard Prohibitions (never do these)

- Do **not** confirm/assert an unverified product fact.
- Do **not** mutate target markets, companies, or contacts automatically.
- Do **not** send outreach of any kind.
- Do **not** make any commercial commitment.
- Do **not** invent data, sources, or claims.
- Do **not** expose restricted fact values.
- Do **not** store chain-of-thought or model reasoning.
- Do **not** modify `../legacy/**` (historical, non-live input).

## 5. Task Loop (every task, no exceptions)

```text
baseline → plan → implement → migration check → tests → verification → record
```

1. **baseline** — read `tasks/current.md`, then the referenced docs; inspect the
   files/schema/endpoints the task touches; confirm the repo state.
2. **plan** — state the approach in `tasks/current.md` (or a work note) before
   writing code; keep it inside the task scope.
3. **implement** — write only the files/modules the task allows.
4. **migration check** — if the schema changed: one migration in
   `packages/database`, repository/service tests, rollback note; if not needed,
   state "migration not needed" explicitly.
5. **tests** — run the mandatory checks for the task type
   (`docs/testing.md`); record commands and outcomes.
6. **verification** — run `scripts/verify.sh` and any task-specific checks.
7. **record** — archive the task to `tasks/done/YYYY-MM-DD-slug.md` with the
   completion record, then reset `tasks/current.md` to the empty template.

## 6. Scope Discipline

- Work only on the task described in `tasks/current.md`.
- Do **not** automatically start the next task after completing one.
- If a task is blocked or verification fails, do **not** archive it — leave
  `tasks/current.md` in place with the blocker recorded.

## 7. Completion Report Requirements

Every completed task must report:

1. files created/changed;
2. migration applied, or "not needed";
3. endpoints/contracts added or changed;
4. commands run and their results;
5. test and verification evidence;
6. known limitations;
7. decisions made or blockers created (for the next task).
