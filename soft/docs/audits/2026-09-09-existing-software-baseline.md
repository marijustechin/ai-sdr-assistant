# Existing Software Baseline Audit

**Date:** 2026-09-09
**Task:** T-001 — Existing Software Baseline Audit
**Type:** Read-only audit (no remediation performed)
**Scope:** `/soft` only
**Status:** READY_FOR_HUMAN_REVIEW

This report distinguishes **facts** (observed state, command output) from
**recommendations** (proposed next steps). No source, dependency, migration,
configuration, canonical documentation, or legacy file was modified.

---

## 1. Executive Summary

The `soft/` workspace currently contains a **documentation and process harness
that is complete and internally consistent**, but **almost no application
code**. What application code exists is a **small, pre-existing scaffold that
is incompatible with the accepted architecture** and partially non-functional.

Key facts:

- The architecture/docs layer (11 canonical docs + `research_context_v1`
  contract + AGENTS.md + harness) is complete and consistent. `scripts/verify.sh`
  passes: **31 passed, 0 failed, 2 informational**.
- The planned monorepo shape (`apps/*`, `packages/*`, `modules/*`) is **not
  fully realised**: `modules/` is absent, `workers/` is absent, and
  `packages/` contains only a `.gitkeep` (no `packages/database`, no
  `packages/contracts`, no `packages/config`).
- `apps/api` is a NestJS 11 + Fastify + Prisma 7 scaffold. It **does not
  compile** (1 TypeScript error) and its tests **do not exist**. Its Prisma
  schema lives in `apps/api/prisma/schema.prisma` — the **wrong location**
  (architecture mandates `packages/database` as the single owner) — and models
  only two unrelated entities (`Product`, `ProductCategory`).
- `apps/web` is an unmodified Next.js 16 starter. It **builds successfully**
  but contains no business function and is **not part of the accepted
  architecture** (which defines only `apps/api` as a runtime today).
- No database schema, migrations, or live data exist anywhere under
  `packages/`; no database was connected to, modified, or migrated.

Conclusion: the **documentation/process assets are salvageable in full**; the
**application scaffold is not reusable** and should be replaced, with
`packages/database` established first as the single schema/migration owner.

---

## 2. Factual Technology Inventory

### 2.1 Workspace and toolchain

| Item | Value |
|---|---|
| Workspace root | `soft/` (repo root is `../ai-sdr-assistant`) |
| Package manager | Bun `1.3.14` (`packageManager` field + installed binary) |
| Node | v26.8.1 (present on host; Bun is the runtime) |
| Git | repo `main` has **no commits yet**; all files currently untracked |
| Lockfile | `bun.lock` (271 KB) present |
| Root `package.json` name | `ai-sdr-assistant` |

Root `package.json` facts:

- `workspaces: ["apps/*", "packages/*"]` — **`modules/*` is missing** from the
  workspaces array (README/AGENTS.md describe `apps/*, packages/*, modules/*`).
- `scripts`: `dev:api` = `bun --cwd apps/api run start:dev`, `dev:web` =
  `bun --cwd apps/web run dev`, `build` = `bun run --filter '*' build`,
  `test` = `bun run --filter '*' test`.
- `devDependencies`: `@types/bun` (latest); `peerDependencies`: `typescript ^5`.
- Root `tsconfig.json`: strict, `noEmit`, `moduleResolution: bundler`,
  `jsx: react-jsx`, `types: ["bun"]`, `allowImportingTsExtensions`.

### 2.2 Direct dependencies and apparent roles

`apps/api/package.json` dependencies:

| Dependency | Role (apparent) |
|---|---|
| `@nestjs/common`, `@nestjs/core` | NestJS DI/framework |
| `@nestjs/platform-fastify` | HTTP adapter (Fastify) |
| `@nestjs/config` | Config module + validation |
| `@prisma/client`, `@prisma/adapter-pg`, `pg` | Prisma ORM + PG driver |
| `class-transformer`, `class-validator` | DTO validation (NOTE: not Zod) |
| `joi` | env-schema validation |
| `dotenv` | env loading |
| `reflect-metadata`, `rxjs` | NestJS runtime deps |

`apps/api` devDependencies: `@nestjs/cli`, `@nestjs/schematics`,
`@nestjs/testing`, `prisma` (CLI), `jest` + `ts-jest`, `supertest`,
`eslint`/`prettier`, `typescript 5.7`.

`apps/web/package.json`: `next 16.3.4`, `react`/`react-dom 19.2.8`,
`tailwindcss 4` (+ PostCSS), `eslint`, `typescript 5`. No `test` script.

### 2.3 Declared-stack vs actual-stack mismatches

| Declared (AGENTS.md/architecture) | Actual |
|---|---|
| Zod for shared contracts (`packages/contracts`) | **Zod not installed anywhere**; `apps/api` uses class-validator + joi; no `packages/contracts` |
| `packages/database` = single Prisma schema owner | Schema lives in `apps/api/prisma/schema.prisma`; no `packages/database` |
| `modules/*` workspace | `modules/` absent and not in root workspaces array |
| BullMQ for long-running work | BullMQ not installed (documented as future-only) |
| Docker Compose for local DB | `apps/api/docker-compose.yml` exists (postgres:18, port 5434); no root compose |

---

## 3. Source-Tree Inventory

### 3.1 Top level (`soft/`)

```
AGENTS.md, README.md, index.ts, package.json, tsconfig.json,
bun.lock, .gitignore, node_modules/
apps/            (api, web)
packages/        (.gitkeep only)
docs/            (11 md files + contracts/research-context.v1.md)
harness/         (task-template.md, acceptance-checklist.md)
scripts/         (verify.sh)
tasks/           (backlog.md, current.md, done/)
```

### 3.2 `apps/api` — module/file inventory

```
apps/api/
├── package.json, tsconfig.json, tsconfig.build.json, nest-cli.json
├── eslint.config.mjs, .prettierrc, .gitignore, README.md, .env (gitignored)
├── prisma.config.ts
├── docker-compose.yml
├── prisma/schema.prisma          (NO prisma/migrations/)
├── src/
│   ├── main.ts                   (Fastify bootstrap; port from config, default 3003)
│   ├── app.module.ts             (ConfigModule + PrismaModule + ProductModule)
│   ├── config/configuration.ts   (env, port, db{url,user,pass,name})
│   ├── config/envValidationSchema.ts (joi schema)
│   ├── common/utils/trim-if-string.ts
│   ├── generated/prisma/**       (Prisma client output — gitignored)
│   └── modules/
│       ├── prisma/               (PrismaModule, PrismaService extends PrismaClient + PrismaPg)
│       └── product/
│           ├── product.module.ts
│           ├── product.controller.ts
│           ├── product.service.ts
│           └── dtos/product.dto.ts
├── test/app.e2e-spec.ts, test/jest-e2e.json
└── dist/**                       (stale compiled output — gitignored)
```

Implemented application code (non-scaffold): only the `product` and `prisma`
modules. Everything else is NestJS starter boilerplate.

### 3.3 `apps/web` — inventory

```
apps/web/
├── package.json, tsconfig.json, next.config.ts, next-env.d.ts
├── eslint.config.mjs, postcss.config.mjs, .gitignore, README.md
├── AGENTS.md, CLAUDE.md            (Next.js 16 agent-rules markers)
├── app/ (page.tsx, layout.tsx, globals.css, favicon.ico)
├── public/ (stock SVG assets)
├── node_modules/, .next/           (gitignored)
```

All content is the default `create-next-app` starter. No business code.

### 3.4 `packages/` and `modules/`

- `packages/.gitkeep` only. No `packages/database`, `packages/contracts`,
  `packages/config`.
- `modules/` does not exist. `workers/` does not exist.

---

## 4. Current Runnable-State Results

All commands were run read-only from the repo (build/test may write only to
gitignored `dist/`/`.next/`; nothing tracked was modified).

| # | Command (exact) | Outcome |
|---|---|---|
| 1 | `bash scripts/verify.sh` | **PASS** — `31 passed, 0 failed, 2 informational`, exit 0 |
| 2 | `bun --version` | `1.3.14` |
| 3 | `bun run build` (root → `bun run --filter '*' build`) | **FAIL (exit 1)** — web builds OK; api build fails (see #5) |
| 4 | `bun run build` in `apps/web` (`next build`) | **PASS (exit 0)** — 4 static routes generated |
| 5 | `bun run build` in `apps/api` (`nest build`) | **FAIL (exit 1)** — `src/modules/product/product.controller.ts:20:31 — TS6133: 'dto' is declared but its value is never read` (enforced by `noUnusedParameters: true`) |
| 6 | `bun run test` in `apps/api` (`jest`) | **FAIL (exit 1)** — `No tests found, exiting with code 1` (no `*.spec.ts` files; 21 files checked, 0 matches) |
| 7 | `bun --cwd apps/api run build` | **FAIL** — `bun 1.3.14` does not recognise `--cwd`; prints `bun run` usage/help (the flag is not in its flag list) |

Additional runnable-state observations (not executed as commands):

- Root `dev:api` and `dev:web` scripts are **broken**: they rely on
  `bun --cwd <dir>` (see #7), which this Bun version rejects. They were not
  executed further.
- `apps/api` has no `start`/`start:dev` run attempted (requires a live
  PostgreSQL at `DATABASE_URL`, which was deliberately **not** touched).
- `test/app.e2e-spec.ts` references an `AppController` / `GET /` → `Hello
  World!`, but **no `AppController` exists** in `src/`, so `test:e2e` would
  also fail if run (not executed; requires a DB connection through `AppModule`).
- `apps/api/src/main.ts`, `app.module.ts`, and `prisma.service.ts` import paths
  use `.js` extensions (`./app.module.js`), consistent with `module: NodeNext`.

---

## 5. Database / Prisma Assessment

Facts (no database was connected to, modified, or migrated):

- **Schema location (mismatch):** the only schema is
  `apps/api/prisma/schema.prisma`. The architecture and `data-ownership.md` §5
  mandate `packages/database/prisma/schema.prisma` as the single owner. This is
  the **most material incompatibility** in the codebase.
- **Models present:** `Product` (`products`) and `ProductCategory`
  (`product_categories`) only — 2 models. The canonical table list in
  `data-ownership.md` §2 defines ~40 tables across 15 modules. **None** of the
  canonical tables (tasks, executions, opportunities, target_markets, facts,
  claims, sources, approvals, …) exist.
- **Ownership tags absent:** no `/// @owner <module>` comments (required by
  `data-ownership.md` §5.3).
- **Generator:** `provider = "prisma-client"`, `output = "../src/prisma"`.
  The actual generated client on disk is under `src/generated/prisma/` (and is
  gitignored via `apps/api/.gitignore`). The schema's `output` path and the
  import path used in code (`../../generated/prisma/client.js`) **disagree**;
  a fresh `prisma generate` would emit to `src/prisma/` and break the import.
- **Datasource:** `provider = "postgresql"` with **no `url`** (Prisma 7
  config-driven; `prisma.config.ts` supplies `env('DATABASE_URL')`).
- **Migrations:** `prisma/migrations/` does not exist. `prisma.config.ts`
  declares `migrations.path = 'prisma/migrations'` but nothing has been
  generated or applied. No migration chain exists.
- **Env:** `apps/api/.env` exists (gitignored; contents not read). `verify.sh`
  secret scan is clean.
- **`apps/api/dist/**`** contains stale compiled Prisma client output
  (`src/generated/prisma/**`), confirming the scaffold was built/regenerated
  at some earlier point under a different generator output path.

---

## 6. Architecture Mismatch Table

Classification legend:
**OK** = implemented and compatible · **INC** = implemented but incompatible ·
**SCAFFOLD** = incomplete scaffold/copy · **ABSENT** = absent but required
later · **LEGACY** = legacy/not reusable.

| # | Area (from architecture docs) | Actual state | Class |
|---|---|---|---|
| 1 | Docs + AGENTS.md + harness + verify.sh | Complete and consistent | OK |
| 2 | Root `package.json` workspaces `apps/*, packages/*, modules/*` | Only `apps/*, packages/*`; `modules/*` missing | INC |
| 3 | Root `dev:api`/`dev:web` scripts | Broken (`bun --cwd` unsupported) | INC |
| 4 | `packages/database` (single schema/migration owner) | Absent; schema lives in `apps/api/prisma` | INC |
| 5 | `packages/contracts` (Zod) | Absent; Zod not installed anywhere | ABSENT |
| 6 | `packages/config` (optional) | Absent | ABSENT |
| 7 | `modules/*` (15 bounded modules) | Absent (expected: not implemented yet) | ABSENT |
| 8 | `workers/*` (BullMQ worker) | Absent (deferred by design) | ABSENT |
| 9 | `apps/api` NestJS + Fastify host | Present but scaffold: wrong Prisma location, 2 demo models, broken build, no validation pipe/Zod | INC |
| 10 | `apps/api` controllers/routes | Only `GET /product/all`, `GET /product/id/:id`, `POST /product/create` (empty); no canonical endpoints | SCAFFOLD |
| 11 | `apps/api` validation | class-validator + joi (not Zod); `ProductDto` uses copied email/password rules with wrong field names | INC |
| 12 | `apps/api` logging / error handling | Minimal (`console.log` in main/service); no global filters/interceptors | SCAFFOLD |
| 13 | `apps/api` tests | `jest` configured, zero specs; e2e references non-existent `AppController` | SCAFFOLD |
| 14 | `apps/api` Prisma schema (40 canonical tables + `@owner` tags) | 2 unrelated tables, no owner tags | INC |
| 15 | `apps/api` migration chain | None | ABSENT |
| 16 | `apps/web` Next.js 16 | Present, stock starter, not in accepted architecture | LEGACY |
| 17 | Docker Compose local DB | `apps/api/docker-compose.yml` (postgres:18, port 5434); no root compose | OK (partial) |
| 18 | `ResearchContextService` / `research_context_v1` implementation | None (documented only) | ABSENT |

---

## 7. Keep / Replace / Remove / Defer — per material area

| Area | Recommendation | Rationale |
|---|---|---|
| `docs/**`, `AGENTS.md`, `harness/**`, `scripts/verify.sh`, `tasks/**` | **Keep** (unchanged) | Complete, consistent, and the binding authority |
| Root `package.json` (workspaces + scripts) | **Replace** | Add `modules/*` to workspaces; fix `dev:api`/`dev:web` (`--cwd` unsupported); define `typecheck`/`build`/`test` that actually resolve |
| `apps/api` scaffold source | **Replace** | Does not compile; wrong Prisma location; demo-only models; missing validation pipeline; no tests |
| `apps/api/prisma/schema.prisma` + `prisma.config.ts` | **Replace / relocate** | Move to `packages/database`; rebuild models against canonical table list with `@owner` tags |
| `apps/api/docker-compose.yml` | **Keep (relocate later)** | Valid local-DB harness; should eventually live at repo root or `packages/database` once that package owns the DB |
| `apps/web` | **Remove / defer** | Stock Next.js starter, no business value, not in architecture; reintroduce only when a UI slice is scoped |
| `apps/api/dist/**`, `src/generated/prisma/**`, `node_modules/`, `.next/` | **Remove (not tracked)** | Regenerated artifacts; already gitignored |
| `index.ts` ("Hello via Bun!") | **Remove or repurpose** | Placeholder, no role |
| `bun.lock`, root `tsconfig.json`, `.gitignore` | **Keep** | Valid toolchain config (workspaces change will update lockfile on next install) |

---

## 8. Proposed Documentation Changes (proposed, NOT applied)

Per the task's prohibition on modifying canonical docs, these are recorded here
for a future task to apply only after human review:

1. `README.md` §"Structure" and §"Toolchain" — clarify that `modules/*` is not
   yet present in the root workspaces array and will be added by the
   `packages/database`-foundation task; correct the claim that `apps/*,
   packages/*, modules/*` are all active.
2. `docs/architecture.md` §6 — the folder tree is the target state; add a note
   that the current baseline is docs-only and `apps/api` is a to-be-replaced
   legacy scaffold (already partially noted in §9).
3. `docs/architecture.md` §9 "Historical Input" — the `apps/api` old scaffold
   row remains accurate; no change required beyond confirming the audit.

---

## 9. Proposed Scope for the Next Implementation Task

Recommended next task (matches `tasks/backlog.md` item 1, pending human
decision to salvage vs replace):

**`packages/database` foundation**
- Create `packages/database` as the single Prisma schema + migration owner.
- Add `modules/*` (and `packages/*`) to the root workspaces if a module is
  scaffolded; fix root `dev:api`/`dev:web` scripts.
- Establish `PrismaService`, a repository base, and typed-repository wrappers
  that disable raw SQL outside the database package.
- Migrate/rebuild the schema from the `apps/api/prisma/schema.prisma` demo
  models into the canonical table list (first slice), with `/// @owner` tags.
- Remove the legacy `apps/api` scaffold (or replace it) per the audit
  recommendation.

This is a **proposal only**; no implementation task is created here.

---

## 10. Assumptions, Unknowns, Blockers

### Assumptions

- The `apps/api` scaffold and `apps/web` starter are pre-existing artifacts
  from a prior scaffold attempt; they are not the product of the current
  harness (consistent with `docs/architecture.md` §9).
- `bun.lock`/`node_modules` reflect a working install at Bun 1.3.14 despite the
  root `dev:*` scripts being broken.
- `apps/api/.env` contains local-only dev credentials (not read during audit).

### Unknowns

- Whether a live PostgreSQL instance currently exists or has ever been migrated
  against the `apps/api` schema (not checked, by design — DB untouched).
- Whether the stale `apps/api/dist/**` output corresponds to the current
  `src/**` or an earlier version (generator output path disagrees with schema).
- Whether the intended runtime is Bun or Node for `apps/api` (NestJS scripts
  invoke `nest`/`node`; Bun is the workspace manager).

### Blockers (for the human decision)

- **Decision gate (required before any remediation/rebuild):** salvage vs
  replace the `apps/api` scaffold. Evidence strongly favours **replace** (build
  fails, no tests, wrong Prisma location, demo-only models, broken root dev
  scripts).
- No remediation was attempted in this audit; the codebase remains in its
  exact baseline state awaiting human direction.

---

## Appendix A — Commands Run (evidence)

```
bash scripts/verify.sh                       -> 31 passed, 0 failed, 2 info (exit 0)
bun --version                                -> 1.3.14
node --version                               -> v26.8.1
bun run build          (soft/)               -> FAIL exit 1 (api TS6133; web OK)
bun run build          (soft/apps/web)       -> PASS exit 0
bun run build          (soft/apps/api)       -> FAIL exit 1 (TS6133 product.controller.ts:20)
bun run test           (soft/apps/api)       -> FAIL exit 1 (No tests found)
bun --cwd apps/api run build                 -> FAIL (usage/help; --cwd unsupported)
git status                                    -> branch main, no commits, all untracked
```

No source, dependency, migration, configuration, canonical doc, or legacy file
was modified during this audit.
