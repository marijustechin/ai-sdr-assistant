# T-003 — Clean Node/pnpm Workspace and API Host

**Status:** DONE (archived)
**Archived:** 2026-09-09
**Type:** Foundation implementation
**Decision gate:** Human review completed — APPROVED
**Scope:** `/soft` only

## Implementation plan (recorded before writing code)

1. Toolchain: Node 24.20.0 (nvm) + pnpm 11.26.0 installed (done). Note the
   shell does not persist across commands; each command exports the Node 24
   path explicitly.
2. Archive old `apps/api` source/config to `legacy/api-scaffold-2026-09-09/`
   (excluding node_modules, dist, src/generated, .env). Remove obsolete targets.
3. Rewrite root `package.json` for pnpm; add `pnpm-workspace.yaml`, `.nvmrc`;
   set `packageManager` + `engines`.
4. Create fresh `apps/api` (`@ai-sdr/api`): NestJS 11 + Fastify, native ESM,
   strict TS, `GET /health` → `{status:"ok"}`, env validation (NODE_ENV, PORT),
   pino structured logging, vitest test via `app.inject()` (no DB/port binding).
5. Root scripts via `pnpm --filter`/`pnpm -r` (no `bun --cwd`).
6. Update AGENTS.md, README.md, architecture.md, testing.md, security.md,
   decisions.md, harness.md, verify.sh.
7. Run `pnpm install` (generate lockfile) → `pnpm install --frozen-lockfile` →
   `pnpm build`, `typecheck`, `lint`, `test`, `bash scripts/verify.sh`.

## Approved decisions

- Runtime: Node.js `24.20.0` LTS.
- Package manager: pnpm `11.26.0` only.
- Current `apps/api` is replaced with a clean API host.
- `apps/web` is retained as the future administration/reporting UI.
- No database, Prisma, business module, AI, queue or UI work in this task.

## Objective

Create a clean, runnable Node + pnpm monorepo foundation with:

- `apps/api` as a fresh NestJS + Fastify API host;
- `apps/web` preserved as the existing Next.js starter;
- coherent root workspace scripts;
- a tested health endpoint;
- no remaining Bun workspace/runtime artifacts.

## Explicit cleanup targets

Before replacing active code, archive the old API scaffold source/configuration to:

`legacy/api-scaffold-2026-09-09/`

Do not archive or retain generated artifacts there.

Remove only these obsolete/generated targets:

- root `bun.lock`;
- root and workspace `node_modules/`;
- old `apps/api/dist/`;
- old generated Prisma client output;
- `apps/web/.next/`;
- root `index.ts` Bun placeholder;
- the active old `apps/api` directory after its source/configuration has been
  archived.

Preserve `apps/web` source, package manifest and configuration.

## Required implementation

1. Finalise and archive accepted T-002 as:

   `tasks/done/2026-09-09-architecture-alignment.md`

2. Configure the workspace for pnpm:
   - create `pnpm-workspace.yaml`;
   - set root `packageManager` to `pnpm@11.26.0`;
   - declare Node `24.20.0` through `.nvmrc`;
   - set `engines` to Node 24 LTS and pnpm 11;
   - generate `pnpm-lock.yaml`;
   - remove Bun-specific scripts and documentation.

3. Create a fresh `apps/api`:
   - NestJS 11 with Fastify;
   - strict TypeScript and native ESM;
   - `@ai-sdr/api` package name;
   - only a minimal health feature:
     `GET /health` → `{ "status": "ok" }`;
   - environment validation for only `NODE_ENV` and `PORT`;
   - structured application logging;
   - no Prisma, database dependency, domain module, authentication,
     business endpoint or external integration.

4. Configure root scripts that actually work:
   - `dev:api`
   - `dev:web`
   - `build`
   - `typecheck`
   - `test`
   - `lint`
   - `verify`

   Do not use `bun --cwd`.

5. Add tests for the API health endpoint using the selected test setup.
   The test must boot the Nest/Fastify app in memory; it must not require a
   database, port binding or external service.

6. Update only runtime/workspace-related canonical documentation:
   `AGENTS.md`, `README.md`, `docs/architecture.md`,
   `docs/testing.md`, `docs/security.md`, `docs/decisions.md`,
   `docs/harness.md` and `scripts/verify.sh`.

## Prohibited scope

- No `packages/database`, Prisma schema or migration.
- No Product, Opportunity, Evidence, Research Context or other business module.
- No Docker Compose, PostgreSQL, Redis, BullMQ or worker.
- No `apps/web` implementation change.
- No package upgrade beyond dependencies genuinely required for the clean API
  host and its test/lint/typecheck tooling.
- No commit or push.

## Acceptance criteria

- [x] `node --version` resolves to `v24.20.0`.
- [x] `pnpm --version` resolves to `11.26.x`.
- [x] `bun.lock` is absent and `pnpm-lock.yaml` exists.
- [x] `pnpm install --frozen-lockfile` succeeds after the lockfile is created.
- [x] `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and
      `bash scripts/verify.sh` pass.
- [x] API health-endpoint test passes without a database.
- [x] `apps/web` still builds successfully but has no new UI implementation.
- [x] The old API scaffold is archived outside active `apps/api`.
- [x] No database, Prisma or business-domain file exists.
- [x] Record all commands/results and set this task to
      `READY_FOR_HUMAN_REVIEW`.
- [x] Do not archive T-003 or start T-004.

## Completion record

### Actual implementation summary

Established a clean, runnable Node + pnpm monorepo foundation. Replaced the
legacy `apps/api` Bun scaffold with a fresh NestJS 11 + Fastify host
(`@ai-sdr/api`) exposing only `GET /health`, with strict TypeScript, native
ESM, pino structured logging, and env validation for `NODE_ENV`/`PORT`. Added
a vitest health-endpoint test that boots the app in memory via
`app.inject()` (no DB, no port binding). Converted the workspace from Bun to
pnpm (pnpm-workspace.yaml, `.nvmrc`, engines, pnpm-lock.yaml). Rewrote root
scripts to use `pnpm --filter`/`pnpm -r`. Archived the old scaffold to
`legacy/api-scaffold-2026-09-09/` and removed obsolete Bun artifacts. Updated
the runtime/workspace-related canonical docs and `scripts/verify.sh`.

### Files changed

Archived (new, non-live):
- `legacy/api-scaffold-2026-09-09/**` — old `apps/api` source/config only
  (no node_modules, dist, src/generated, .env).

Removed:
- `bun.lock`, root `index.ts`, root `tsconfig.json` (Bun template),
  root/workspace `node_modules/`, `apps/web/.next/`, and the old `apps/api/`
  directory (source/config archived first).

Created (workspace):
- `pnpm-workspace.yaml` (incl. `allowBuilds` for esbuild/sharp/unrs-resolver)
- `.nvmrc` (24.20.0)

Created (apps/api):
- `apps/api/package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`
- `apps/api/src/main.ts`, `src/app.module.ts`, `src/config/env.ts`,
  `src/logging/logger.ts`, `src/health/health.controller.ts`
- `apps/api/test/health.spec.ts`

Changed:
- `package.json` (pnpm: packageManager, engines, scripts, devDeps)
- `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/testing.md`,
  `docs/security.md`, `docs/decisions.md`, `docs/harness.md`
- `scripts/verify.sh`

Preserved (untouched): `apps/web/**` (source, dependencies, scripts, and
configuration). Only the stray `packageManager: bun@1.3.14` field was removed
from `apps/web/package.json` during post-review correction.

### Migration applied

Not needed (no database, no Prisma schema or migration in this task).

### Endpoints/contracts added or changed

Added: `GET /health` → `200 { "status": "ok" }` (only runtime endpoint).
No shared contract or business endpoint added.

### Commands run and results

- `nvm install 24.20.0` → installed; `node --version` → `v24.20.0`
- `npm install -g pnpm@11.26.0` → `pnpm --version` → `11.26.0`
- `pnpm install` → lockfile generated; build scripts approved via
  `pnpm approve-builds --all` (esbuild, unrs-resolver)
- `pnpm install --frozen-lockfile` → exit 0
- `pnpm build` → exit 0 (api tsc + web next build)
- `pnpm typecheck` → exit 0
- `pnpm lint` → exit 0 (api eslint + web eslint)
- `pnpm test` → exit 0 (1 passed: `test/health.spec.ts`)
- `bash scripts/verify.sh` → `43 passed, 0 failed`, exit 0
- smoke test: `node dist/main.js` + `curl /health` → `{"status":"ok"}`,
  HTTP 200, structured pino JSON logs observed

### Test and verification evidence

- `apps/api` vitest health test passes without a database or port binding.
- `pnpm build/typecheck/lint/test` and `bash scripts/verify.sh` all exit 0.
- `apps/web` still builds (`next build`, 4 static routes).
- Old scaffold archived at `legacy/api-scaffold-2026-09-09/`; no
  `packages/database`, Prisma schema, migrations, or business-domain file
  exists under active code (confirmed by verify.sh).

### Known limitations

- The machine's default `node` (outside nvm) is v26.8.1; Node 24.20.0 is used
  via nvm (`.nvmrc` present). Commands were run with the nvm Node 24 path
  exported explicitly.
- The `allowBuilds` key is auto-generated by `pnpm approve-builds` (pnpm 11's
  spelling for the former `onlyBuiltDependencies`).

### Post-review correction

- Removed `"packageManager": "bun@1.3.14"` from `apps/web/package.json`; the
  root `package.json` is now the sole package-manager authority. No other
  `apps/web` source, dependency, script, or configuration was changed.

### Decisions or blockers created

- Decision: Node 24 LTS + pnpm 11 replace Bun; recorded in `docs/decisions.md`.
- Decision: T-003 scope = clean API host only (no DB/business); recorded.
- Blocker (next task): none blocking. T-004 is not created, per the human gate.
