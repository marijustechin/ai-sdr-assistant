# T-004 — Central PostgreSQL and Core Commercial Domain

**Status:** DONE (archived)
**Archived:** 2026-09-10
**Type:** foundation implementation
**Decision gate:** Human review completed — APPROVED; T-005 not started
**Scope:** `/soft`

## Objective

Create the single central PostgreSQL/Prisma foundation used by every future
assistant module. Implement the minimum commercial domain required to store a
product once, define a sellable variant, attach it to a commercial opportunity,
select target markets, and record that a market-research run occurred.

This is not an AI, lead-discovery, outreach, authentication, UI, or research
findings task.

## Architecture invariants

- `packages/database` is the sole owner of Prisma schema, generated client,
  and all database migrations.
- `apps/api` accesses the DB only through `@ai-sdr/database`; it must not own
  a second Prisma schema or client.
- A product description and confirmed product facts are canonical data,
  not prompt text or uploaded working files.
- `Opportunity` is the commercial work unit.
- Future workers receive IDs and fetch context from the central system; they
  must not need the product description pasted into a prompt.
- No generic "agent framework", arbitrary JSON state store, or per-module DB.

## Implementation plan (recorded before writing code)

1. **Local DB** — root `docker-compose.yml` (Postgres 17, project-scoped
   service/container/volume names + non-colliding host port `54329`); root
   `.env.example` (POSTGRES_* + `DATABASE_URL`). No real `.env` committed.
2. **DB package** — `packages/database` (`@ai-sdr/database`) with Prisma 7
   (`prisma-client` generator, `prisma.config.ts`, driver adapter
   `@prisma/adapter-pg`, `dotenv` for CLI env), `PrismaService`,
   `RepositoryBase`, `index.ts` boundary. Generated client output to
   `packages/database/src/generated/` (git-ignored), never into `apps/api/src`.
3. **Schema** — `Product`, `Offer`, `ProductFact`, `TargetMarket`,
   `Opportunity`, `OpportunityTargetMarket`, `ResearchRun`,
   `ResearchRunTargetMarket` + enums. UUID PKs, `@db.Timestamptz(6)` UTC
   timestamps, FK + indexes, `@map` names, `/// @owner` tags. XOR/at-least-one
   value constraints on `ProductFact` enforced via CHECK constraints added to
   the generated migration SQL (Prisma cannot express CHECK constraints).
4. **Migration** — initial migration via `prisma migrate dev --create-only`,
   hand-edit SQL to add CHECK constraints, apply with `prisma migrate deploy`.
   No `db push`.
5. **Tests** — `packages/database` integration tests against a disposable test
   DB (`ai_sdr_test`, created idempotently, migrated, truncated between tests):
   CRUD + XOR + uniqueness constraints. `apps/api` `/health` (no DB) and
   `/ready` (real Postgres, 200) + `/ready` 503 when DB unreachable.
6. **API** — `DatabaseModule` (provides `PrismaService`), `ReadinessController`
   (`GET /ready` → `{status:"ready"}`; on failure 503 `{status:"not_ready"}`
   with no connection string/stack/db error). `GET /health` unchanged/liveness.
7. **Scripts/docs** — root DB lifecycle + Prisma scripts; update architecture,
   data-ownership, testing, security, decisions, README, verify.sh; add
   `docs/data-model.md`.

## Allowed scope

- Root: `docker-compose.yml`, `.env.example`, `package.json` scripts.
- `packages/database/**` (new workspace package).
- `apps/api`: `src/database/`, `src/health/readiness.controller.ts`,
  `src/app.module.ts`, `package.json` (dep `@ai-sdr/database`), tests.
- Docs: architecture, data-ownership, testing, security, decisions, README,
  new `docs/data-model.md`; `scripts/verify.sh`.

## Prohibited scope

- `apps/web` (no change), auth/users/roles, companies/contacts/leads/email.
- Queues, workers, LLMs, web research/scraping, actual Abachi seed data,
  research findings/source records.
- `../legacy/**`, deployment, commits, pushes.

## Architecture references

- docs/architecture.md
- docs/data-ownership.md
- docs/security.md
- docs/testing.md
- docs/decisions.md

## Files/modules expected to change

- `docker-compose.yml`, `.env.example` (new)
- `package.json` (root scripts)
- `packages/database/package.json`, `prisma/schema.prisma`,
  `prisma.config.ts`, `src/index.ts`, `src/prisma.service.ts`,
  `tsconfig.json`, `vitest.config.ts`,
  `eslint.config.mjs`, `.gitignore`, `prisma/migrations/**`, `test/**`
- `apps/api/src/database/database.module.ts` (new),
  `apps/api/src/health/readiness.controller.ts` (new),
  `apps/api/src/config/load-env.ts` (new, post-review),
  `apps/api/src/app.module.ts`, `apps/api/package.json`,
  `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`,
  `apps/api/vitest.config.ts`, `apps/api/test/ready.spec.ts` (new),
  `apps/api/test/load-env.spec.ts` (new, post-review)
- `scripts/verify.sh`, docs listed above, `docs/data-model.md` (new)

## Schema/migration impact

- One initial migration in `packages/database/prisma/migrations` creating the
  commercial domain tables, enums, indexes, FK + CHECK constraints.
- Rollback note: `prisma migrate resolve --rolled-back <migration>` or drop the
  dev/test database and re-apply; no destructive down-migration authored.

## Endpoint/contract impact

- Added `GET /ready` (readiness, safe `SELECT 1`): `200 {"status":"ready"}` or
  non-sensitive `503 {"status":"not_ready"}`.
- `GET /health` unchanged (liveness, no DB).

## Acceptance criteria

- [x] Root Docker Compose (Postgres 17) with project-scoped names/port.
- [x] `.env.example` with safe dev vars + `DATABASE_URL`; no real `.env`.
- [x] Root scripts for DB lifecycle + Prisma migration/status (pnpm only).
- [x] `packages/database` = `@ai-sdr/database`; schema + client + boundary +
      migration scripts + tests; no Prisma output in `apps/api/src`.
- [x] Initial migration applied (no `db push`); `prisma migrate status` clean.
- [x] Product/Offer/ProductFact/TargetMarket/Opportunity/
      OpportunityTargetMarket/ResearchRun/ResearchRunTargetMarket with enums,
      UUIDs, UTC, FK, indexes; ProductFact XOR + value CHECK constraints.
- [x] Database-package tests pass against disposable Postgres (no leak).
- [x] `GET /health` works without DB; `GET /ready` 200 against Postgres;
      `/ready` non-sensitive 503 when DB unavailable (real client, not mocked).
- [x] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck`,
      `pnpm lint`, `pnpm test`, `pnpm verify`, `bash scripts/verify.sh` pass.
- [x] Set status to `READY_FOR_HUMAN_REVIEW`; do not archive; do not start T-005.

## Verification commands

- `docker compose up -d` / `docker compose ps`
- `pnpm --filter @ai-sdr/database run migrate`
- `pnpm --filter @ai-sdr/database run migrate:status`
- `pnpm install --frozen-lockfile`
- `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
- `pnpm verify`, `bash scripts/verify.sh`

## Rollback/blocked conditions

- DB unavailable (Docker not running) blocks migration/tests — record blocker,
  do not archive.
- Prisma 7 driver-adapter/generate incompatibility blocks — record, do not
  archive.

## Completion record

### Actual implementation summary

Established the single central PostgreSQL/Prisma foundation and the minimum
commercial domain. Added a project-scoped Postgres 17 Docker Compose stack
(service/container/volume `ai-sdr-assistant-*`, host port `54329`), a root
`.env.example`, and root pnpm scripts for DB lifecycle + Prisma. Created the
`@ai-sdr/database` workspace package on Prisma 7 (ESM `prisma-client` generator,
`@prisma/adapter-pg` driver adapter, `prisma.config.ts` + dotenv), with
`PrismaService` and an `index.ts` client boundary. Defined
the commercial domain (`Product`, `Offer`, `ProductFact`, `TargetMarket`,
`Opportunity`, `OpportunityTargetMarket`, `ResearchRun`,
`ResearchRunTargetMarket`) with UUID PKs, UTC `timestamptz(6)`, enums, FKs,
indexes, `@map` names, `@owner` tags, and hand-authored CHECK constraints for
the ProductFact subject/value rules. Generated + applied the initial migration
(no `db push`). Wired `apps/api` with a `DatabaseModule`, a `GET /ready`
readiness endpoint (lazy `SELECT 1`), and kept `GET /health` DB-free. Added
integration tests (database package against an isolated `ai_sdr_test` DB, and
API `/ready` success/503). Updated canonical docs + `verify.sh` and added
`docs/data-model.md`.

### Files changed

Created (root):
- `docker-compose.yml`, `.env.example`
- `package.json` (DB + Prisma scripts)

Created (`packages/database`):
- `package.json`, `tsconfig.json`, `tsconfig.build.json`,
  `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `prisma.config.ts`
- `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`,
  `prisma/migrations/20260910112935_init/migration.sql` (incl. CHECK constraints)
- `src/index.ts`, `src/prisma.service.ts`
- `test/global-setup.ts`, `test/helpers/database.ts`, `test/schema.spec.ts`

Created (`apps/api`):
- `src/database/database.module.ts`, `src/health/readiness.controller.ts`,
  `src/config/load-env.ts`
- `test/ready.spec.ts`, `test/load-env.spec.ts`

Changed:
- `apps/api/src/app.module.ts`, `apps/api/package.json`
  (`@ai-sdr/database` dependency)
- `pnpm-workspace.yaml` (allowBuilds for `prisma`, `@prisma/engines`)
- `scripts/verify.sh`
- `docs/architecture.md`, `docs/data-ownership.md`, `docs/testing.md`,
  `docs/security.md`, `docs/decisions.md`, `README.md`
- `docs/data-model.md` (new)

Preserved (untouched): `apps/web/**`, `../legacy/**`.

### Migration applied

Yes — one initial migration `20260910112935_init` applied to the dev database
(`ai_sdr`) and the test database (`ai_sdr_test`) via `prisma migrate deploy`.
`prisma migrate status` → "Database schema is up to date!". No `db push`.
Rollback: `prisma migrate resolve --rolled-back 20260910112935_init`, or drop
the dev/test database and re-apply.

### Endpoints/contracts added or changed

- Added `GET /ready`: `200 {"status":"ready"}` on success; non-sensitive
  `503 {"status":"not_ready"}` on failure (no connection string, stack, or DB
  error). Uses the real Prisma client + driver adapter (not mocked).
- `GET /health` unchanged (liveness, no DB dependency).

### Commands run and results

- `pnpm install` → lockfile updated; `pnpm approve-builds` for prisma engines
  (recorded in `pnpm-workspace.yaml` `allowBuilds`).
- `pnpm install --frozen-lockfile` → exit 0.
- `docker compose up -d` → Postgres 17 healthy; `docker compose ps` healthy.
- `pnpm --filter @ai-sdr/database run generate` → client generated to `src/generated`.
- `pnpm --filter @ai-sdr/database exec prisma migrate dev --name init --create-only`
  → migration authored; SQL hand-edited to add 2 CHECK constraints.
- `pnpm --filter @ai-sdr/database run migrate` → applied.
- `pnpm --filter @ai-sdr/database run migrate:status` → "up to date!".
- `pnpm build` → exit 0 (api tsc + database tsc + web next build).
- `pnpm typecheck` → exit 0.
- `pnpm lint` → exit 0.
- `pnpm test` → exit 0 (database 10 tests + api 3 tests).
- `pnpm verify` and `bash scripts/verify.sh` → `53 passed, 0 failed`, exit 0.
- Smoke test (running `dist/main.js`): `/health` 200, `/ready` 200 with DB up;
  with DB stopped, `/health` 200 and `/ready` 503 `{"status":"not_ready"}`.

### Test and verification evidence

- `packages/database` vitest: 10/10 pass against `ai_sdr_test` (isolated,
  migrated in globalSetup, truncated between tests) — CRUD, XOR/value CHECK
  constraints, and unique constraints all enforced.
- `apps/api` vitest: 3/3 pass — `/health` (no DB), `/ready` 200 (real
  Postgres), `/ready` 503 (unreachable DB, non-sensitive body).
- `verify.sh`: 53 passed / 0 failed.

### Known limitations

- DI constructor injection must use explicit `@Inject(Token)` (esbuild-based
  runners — vitest/tsx — do not emit `emitDecoratorMetadata`); recorded as a
  decision.
- The API loads the root `.env` at runtime via the Node built-in
  `process.loadEnvFile` (no third-party dotenv dependency); a missing `.env` is
  a safe no-op and real environment variables take precedence.
- `apps/api` type-checks and tests against the `packages/database` source (via
  a TypeScript `paths` mapping and a vitest alias); the emitted build resolves
  the package's compiled `dist`. No build is required before typecheck/test.
- Fact append-only versioning, per-opportunity commercial terms
  (`opportunity_offers`), research findings/sources, and the `research_contexts`
  snapshot are deferred to later tasks.

### Post-review correction (2026-09-10)

Three narrow corrections were applied after review; T-004 remains
READY_FOR_HUMAN_REVIEW.

1. **Typecheck independent of build.** `apps/api/tsconfig.json` maps
   `@ai-sdr/database` to `../../packages/database/src/index.ts`; the emit config
   `apps/api/tsconfig.build.json` clears the mapping (`paths: {}`) and resolves
   the package `dist`. `apps/api/vitest.config.ts` aliases the package to source
   so tests also need no prior build. A root `postinstall`
   (`pnpm --filter @ai-sdr/database run generate`) generates the Prisma client
   on install. Proof (no `packages/database/dist` and no `apps/api/dist`):
   root `pnpm typecheck` and `pnpm lint` exit 0; `load-env`/health/ready and the
   database tests pass; `pnpm build` still emits clean api-only `dist`.
2. **Explicit, reliable API env loading.** `apps/api/src/config/load-env.ts`
   loads the workspace root `.env` with `process.loadEnvFile` (existence-guarded,
   existing env wins, `main.ts` calls it at startup). Proof: with
   `DATABASE_URL` unset in the shell, both `node apps/api/dist/main.js` and
   `npx tsx src/main.ts` answered `/health` 200 and `/ready` 200 (DB from
   `.env` only); with an exported *bad* `DATABASE_URL`, `/ready` returned 503
   (exported env wins over `.env`); application logs contained no connection
   string. Focused tests: `apps/api/test/load-env.spec.ts` (3 tests).
3. **Removed speculative abstraction.** Deleted
   `packages/database/src/repository.base.ts` and its `index.ts` export; the
   package now exposes only the schema, generated client, and `PrismaService`
   (direct Prisma boundary). Updated `docs/architecture.md` and
   `tasks/backlog.md`; recorded in `docs/decisions.md`.

Correction verification: `pnpm install --frozen-lockfile` (exit 0, lockfile
unchanged), clean-root `pnpm typecheck`/`pnpm lint` (exit 0, no `dist`),
`pnpm --filter @ai-sdr/database run migrate:status` ("up to date"),
`pnpm build`/`pnpm test`/`pnpm verify`/`bash scripts/verify.sh` (exit 0;
verify 53 passed / 0 failed; tests: database 10, api 6).

### Decisions or blockers created

- Decisions recorded in `docs/decisions.md`: Prisma 7 + driver adapters;
  `Offer` as sellable product form; CHECK constraints; `RESTRICTED` as a
  visibility dimension; lazy client + `SELECT 1` readiness; isolated
  `ai_sdr_test` DB; explicit `@Inject()` tokens; typecheck-on-source /
  build-on-dist boundary; no generic `RepositoryBase`; API runtime root `.env`
  loading with env precedence.
- Blockers: none. T-005 is not created, per the human gate.
