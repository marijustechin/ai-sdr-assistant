# AI SDR Assistant — Programming Workspace

This is the **permanent programming workspace** and autonomous development
harness for the AI SDR Assistant rebuild.

Canonical system/business documentation lives at the repository root in
[`../docs/system/`](../docs/system/); this workspace's `docs/` is the
implementation/testing/security companion that links to the root canonical set.

The workspace holds source code, schema, contracts, implementation docs, and
task records — **not** live business state. Live business state lives in
PostgreSQL (owned by `packages/database`). Historical planning material is kept
outside this folder (in `../legacy/`) and is treated as **non-live historical
input**.

## Structure

```text
soft/
├── AGENTS.md                  # binding operating contract for the coding agent
├── apps/                      # runtimes (api = NestJS + Fastify host; web = planned UI, retained/deferred; worker future)
├── packages/                  # shared packages (database, contracts, later testkit)
├── docs/                      # self-contained architecture, security, testing, contracts, data model
├── harness/                   # task template + acceptance checklist
├── scripts/                   # verify.sh (fail-fast structural + available checks)
├── tasks/                     # backlog.md, current.md, done/
├── docker-compose.yml         # local PostgreSQL 17 (project-scoped service/volume/port)
└── .env.example               # safe dev env template (DATABASE_URL, POSTGRES_*)
```

Bounded feature modules are NestJS modules under
`apps/api/src/modules/<module>/` — they are **not** a separate root-level
`modules/*` workspace.

## Toolchain

- Node.js 24 LTS (see `.nvmrc`) and pnpm 11 (`packageManager` + `pnpm-workspace.yaml`)
- TypeScript, NestJS + Fastify, PostgreSQL + Prisma (v7), Zod, Docker Compose

## Database (local development)

```bash
cp .env.example .env        # once — local dev credentials only
pnpm db:up                  # start PostgreSQL 17 (project-scoped, host port 54329)
pnpm db:migrate             # apply migrations (prisma migrate deploy)
pnpm db:migrate:status      # confirm the schema is up to date
pnpm db:generate            # regenerate the Prisma client (also runs on install + build)
pnpm db:studio              # browse the data in Prisma Studio
pnpm db:down                # stop the database (pnpm db:reset also drops the volume)
```

The single Prisma schema + migration chain lives in `packages/database`
(`@ai-sdr/database`); `apps/api` accesses the DB only through that package. The
`GET /ready` endpoint performs a safe `SELECT 1` against PostgreSQL; `GET /health`
remains a DB-free liveness check.

For local development/runtime the API loads the workspace root `.env` at startup
(`process.loadEnvFile`), so copying `.env.example` to `.env` is enough — no shell
export of `DATABASE_URL` is required. Real environment variables take precedence
over `.env`, and no loaded value is logged. Root `pnpm typecheck` resolves the
database package source, so it passes without a prior `pnpm build`.

## Quick reference

- Operating contract: [`AGENTS.md`](AGENTS.md)
- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Module boundaries: [`docs/module-boundaries.md`](docs/module-boundaries.md)
- Data ownership: [`docs/data-ownership.md`](docs/data-ownership.md)
- Data model: [`docs/data-model.md`](docs/data-model.md)
- Task/execution model: [`docs/task-execution.md`](docs/task-execution.md)
- Research context contract: [`docs/contracts/research-context.v1.md`](docs/contracts/research-context.v1.md)
- Security: [`docs/security.md`](docs/security.md)
- Testing: [`docs/testing.md`](docs/testing.md)
- Decisions: [`docs/decisions.md`](docs/decisions.md)
- Dev harness: [`docs/harness.md`](docs/harness.md)
- Task format: [`docs/task-format.md`](docs/task-format.md)

## Status

- Workspace + harness: **established** (bootstrap task archived).
- API host: **established** — clean NestJS + Fastify host with tested
  `GET /health` and `GET /ready` endpoints (Node 24 + pnpm 11).
- Central database + core commercial domain: **established** — single Prisma
  schema/migration chain in `packages/database` (`Product`, `Offer`,
  `ProductFact`, `TargetMarket`, `Opportunity`, `OpportunityTargetMarket`,
  `ResearchRun`, `ResearchRunTargetMarket`), local PostgreSQL 17 via Docker
  Compose, and integration tests against an isolated `ai_sdr_test` database.
- `apps/web`: **planned UI** (retained, implementation deferred).
- Business modules (products-and-offers, opportunities, market-researcher, …),
  research logic, external integrations: **not yet implemented** — planned.

## Historical input (non-live)

The prior opportunity-centred plan, Phase 0 research, and market-research
harness live in `../legacy/`. They inform terminology and design but are never
live system state and must not be modified from this workspace.
