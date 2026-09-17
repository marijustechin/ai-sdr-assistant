# AI SDR Assistant

A modular system for B2B sales research and prospecting. The repository is
organised into **two workspaces and two task loops**:

- the **root manager workspace** (this level) owns direction, canonical system
  documentation, human decisions, intake, delegation, and project state;
- the **`soft/` implementation workspace** owns all application source, the
  single PostgreSQL/Prisma schema, migrations, tests, and the programmer task
  loop.

**PostgreSQL is the single source of live business state.** Markdown in this
repository is instructions, decisions, historical evidence, or generated
reports — never a competing store for products, research runs, or leads.

---

## Layout

```text
ai-sdr-assistant/
├── AGENTS.md              # root manager operating contract (binding)
├── ops/                   # root manager task loop (one active task)
├── docs/
│   ├── README.md          # documentation hierarchy + boundaries
│   ├── system/            # CANONICAL system/business docs + decisions
│   └── redesign/          # HISTORICAL, SUPERSEDED proposal material
├── legacy/                # historical, non-live input (never modified)
└── soft/                  # software implementation workspace
    ├── AGENTS.md          # implementation operating contract
    ├── apps/              # api (NestJS + Fastify); web (planned UI)
    ├── packages/          # database (single Prisma owner); contracts (implemented)
    ├── docs/              # implementation, testing, security, harness docs
    ├── harness/  scripts/ # programmer task template + verify.sh
    └── tasks/             # programmer task loop
```

## Documentation

| Set | Role |
|---|---|
| [`docs/system/`](docs/system/) | **Canonical** system/business architecture, module map, data governance, research-context contract, decisions, project state |
| [`docs/system/research-harness/`](docs/system/research-harness/) | **Canonical** market researcher operating harness (entry point + operating rules + persistence boundary) |
| [`docs/redesign/`](docs/redesign/) | **Historical, superseded** proposal material — not current architecture |
| [`soft/docs/`](soft/docs/) | Software implementation, testing, security, and coding-harness details; links to the canonical root docs |
| [`legacy/`](legacy/) | Historical, non-live evidence; importable, never authoritative |

Start with [`docs/README.md`](docs/README.md) for the documentation hierarchy,
[`docs/system/architecture.md`](docs/system/architecture.md) for the canonical
architecture, and [`docs/system/project-state.md`](docs/system/project-state.md)
for what is implemented, not implemented, and blocked.

## Task loops

- **Root manager loop:** `ops/current.md` → `ops/done/` (template:
  `ops/task-template.md`). Direction, coordination, decisions, intake,
  delegation, project state.
- **Programmer loop:** `soft/tasks/current.md` → `soft/tasks/done/` (template:
  `soft/harness/task-template.md`). Implementation only.

Exactly one task is active per loop. Work that changes `soft/` is delegated by
the manager into a single `soft/tasks/current.md` task.

## Toolchain (implementation workspace)

Node.js 24 LTS and pnpm 11; TypeScript; NestJS + Fastify; PostgreSQL + Prisma;
Docker Compose for the local database. See [`soft/README.md`](soft/README.md).

## Current state

See [`docs/system/project-state.md`](docs/system/project-state.md). In short: a
clean API host, liveness/readiness endpoints, PostgreSQL with Prisma migrations,
the core commercial schema, shared contracts, the first vertical slice — the
**Catalogue + Research Context API** — a minimal **research persistence** slice
(run + queries + sources/evidence/claims, O-010/T-007), the admin product UI, and
a **product-independent market research request flow** (O-017: configure/submit a
request per product, researcher discovery + intake + one-time claim) are
implemented. The remaining modules (`knowledge`, `research-records`, discovery,
`approvals`, `jobs`), full `market-researcher` execution (there is no background
worker, scheduler, or automatic execution), and the outreach UI are not.

The immediate priority is **research capability and coverage**; product
onboarding is postponed. The manager research toolchain (Exa `websearch`,
`webfetch`, the official Firecrawl MCP, and a Google Search-grounding Gemini MCP)
is documented in [`docs/system/research-toolchain.md`](docs/system/research-toolchain.md).
The market researcher's operating harness — lifecycle, evidence/price rules,
coverage/stopping rules, and the persistence boundary — is in
[`docs/system/research-harness/`](docs/system/research-harness/) (O-009; the
minimum resumable-run persistence it mapped is implemented under O-010/T-007,
which is awaiting human review).

The root repository exists and `main` tracks `origin/main`; baseline commit
`0c6a10103519b9065654ad4ba8e51a6aa3d2058d` and the Catalogue + Research Context
slice (`0eb3f5c`) are on `main`.
