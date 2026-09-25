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
    ├── apps/              # api (NestJS + Fastify) + web (Next.js admin UI; implemented)
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

See [`docs/system/project-state.md`](docs/system/project-state.md) for the single
authoritative capability snapshot; do not maintain a status list here. In short:

- **Foundation:** clean API host, liveness/readiness endpoints, PostgreSQL with
  Prisma migrations, the core commercial schema, and shared Zod contracts.
- **Catalogue + research:** Catalogue + Research Context API, product-independent
  research-request flow with explicit cost/tool permissions, research-run
  persistence (sources/evidence/claims/offerings), the read-only research results
  dashboard, and run-result finalization with pending-quote follow-up scheduling.
- **Pipeline slices (bounded):** evidence-backed buyer shortlist with agent
  qualification, source-backed contacts, reusable sender profiles, email accounts
  (SMTP/IMAP with encrypted secrets), outreach drafts, price-inquiry (RFQ)
  drafts, and a human-gated supplier quote-collection loop. **No sending of
  buyer outreach** and no commercial commitments.
- **Admin UI:** Next.js product/research/leads/settings/dashboard surfaces.

**Not implemented:** a worker/jobs platform (`soft/apps/worker`, BullMQ),
autonomous research execution inside the platform, `knowledge`,
`research-records`, `lead-evaluator`, `company-intelligence`, `approvals`, and
the frozen `research_contexts` snapshot. Today the **market-research harness is
executed by the OpenCode agent**, not by a platform runner.

The immediate priority is **research capability and coverage**; product
onboarding is postponed. The manager research toolchain (Exa `websearch`,
`webfetch`, the official Firecrawl MCP, and a Google Search-grounding Gemini MCP)
is documented in [`docs/system/research-toolchain.md`](docs/system/research-toolchain.md),
and the researcher's operating contract in
[`docs/system/research-harness/`](docs/system/research-harness/).

Documentation/state responsibilities and the finalization invariants are defined
in [`docs/system/source-of-truth.md`](docs/system/source-of-truth.md).

The root repository exists and `main` tracks `origin/main`; baseline commit
`0c6a10103519b9065654ad4ba8e51a6aa3d2058d` and the Catalogue + Research Context
slice (`0eb3f5c`) are on `main`.
