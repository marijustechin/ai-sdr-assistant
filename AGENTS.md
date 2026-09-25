# AGENTS.md — Root Manager Operating Contract

This file is the **binding operating contract for the main managing agent**
(orchestrating AI) that operates at the repository root. When instructions
conflict, the higher-ranked source wins.

This contract governs **manager-level work**: system direction, cross-module
coordination, human decisions, product/research intake, delegation, and project
state. It does **not** govern implementation work — that is delegated into the
`soft/` workspace under `soft/AGENTS.md`.

---

## 1. Two Levels of Authority

| Level | Owner | Contract | Scope |
|---|---|---|---|
| **Root manager** | the main managing agent | this file (`AGENTS.md`) | Direction, coordination, human decisions, intake, delegation, project state |
| **Programmer** | the implementation agent | `soft/AGENTS.md` | Implementation work only, inside `soft/` |

Rules:

- The root manager **does not write business/application code** in this file's
  name. Implementation changes happen only through a delegated `soft/` task.
- The programmer's `soft/AGENTS.md` is authoritative for implementation
  mechanics (workspace toolchain, architecture invariants, testing, schema).
- When a conflict arises between this file and `soft/AGENTS.md`, this file wins
  for **manager-level** decisions (scope, direction, what may be built); the
  `soft/AGENTS.md` wins for **implementation-level** decisions.
- Both contracts share the hard prohibitions in §7.

### Instruction hierarchy (root)

1. `AGENTS.md` (this file)
2. `docs/system/*` (canonical system architecture, module map, data governance,
   research-context contract, research toolchain, and the market researcher
   operating harness at `docs/system/research-harness/AGENTS.md`) and `legacy/`
   evidence read rules
3. `docs/system/decisions.md`
4. `soft/AGENTS.md` (implementation contract, for delegated work)
5. `ops/current.md` (the single active manager task)

`ops/current.md` is the only active manager unit of work. It may **narrow**
scope but never broaden it beyond the higher layers.

---

## 2. Workspace Map

```text
ai-sdr-assistant/                 # repository root (root manager workspace)
├── AGENTS.md                     # this file — manager operating contract
├── README.md                     # repository overview
├── .gitignore                    # repo-wide generated/private protection
├── ops/                          # ROOT MANAGER task loop
│   ├── README.md
│   ├── current.md                # one active manager task
│   ├── backlog.md
│   ├── task-template.md
│   └── done/                     # archived manager tasks
├── docs/
│   ├── README.md                 # documentation hierarchy + boundaries
│   ├── system/                   # CANONICAL system/business docs + decisions
│   │   └── research-harness/     # researcher instructions (entry: AGENTS.md)
│   └── redesign/                 # HISTORICAL, SUPERSEDED proposal material
├── scripts/
│   └── research/                 # manager-env research API write client + E2E check
├── legacy/                       # HISTORICAL, NON-LIVE input (never modified)
└── soft/                         # SOFTWARE IMPLEMENTATION workspace
    ├── AGENTS.md                 # binding contract for implementation
    ├── apps/  packages/  docs/   # code, single Prisma owner, implementation docs
    ├── harness/  scripts/  tasks/ # programmer task loop + verification
    └── ...
```

- `soft/` is the **only** place application/API/business source lives.
- `docs/system/` is the **canonical** system/business documentation set.
- `docs/redesign/` is **historical proposal material** — not current authority.
- `scripts/research/` holds **manager-environment operating tooling** (the
  canonical research API write client and its end-to-end verification). It is not
  application/business code and holds no live business state.
- `legacy/` is **historical, non-live** input; never authoritative, never edited.

### Runtime activation for `soft/` commands

When an agent is started from the repository root and runs any `soft/` pnpm,
Prisma, test, build, lint, or verification command, it must **first activate the
Node version declared by `soft/.nvmrc`** (currently Node 24.20.0). Do not rely
on the host default Node version. On Windows this is **nvm-windows** (not the
Linux `nvm`); select the version once, then run the command in the same shell.

```powershell
nvm use 24.20.0; pnpm --dir soft <command>
```

---

## 3. Live Business State vs. Markdown (Non-Negotiable)

> **PostgreSQL is the single source of live business state.** Markdown is never
> a competing store for business records.

- The central PostgreSQL database (owned by `soft/packages/database`, the sole
  Prisma schema + migration owner) holds **all live business state**: products,
  offers, product facts, opportunities, target markets, research runs, and —
  once built — companies, contacts, research records, findings, and claims.
- Markdown files serve exactly four purposes:
  1. **Instructions** — these contracts, task templates, harness rules.
  2. **Decisions** — recorded rationale (`docs/system/decisions.md`).
  3. **Historical evidence** — `legacy/**`, superseded proposals, audits.
  4. **Generated reports** — human-readable outputs produced *from* the database.
- Markdown must **never** become the live store for products, offers, product
  facts, research runs, findings, leads, companies, or contacts. A Markdown file
  that "is" the current product catalogue or the current lead list is a
  violation, not a design.
- Facts, inferences, and unknowns are separated; no chain-of-thought is stored
  anywhere. Sources and claims are persisted in the database, not in prose.

---

## 4. Root Manager Responsibilities

The main managing agent owns:

1. **System direction** — the canonical architecture, module map, data
   governance, and research-context contract in `docs/system/`; keeping them
   aligned with implemented reality.
2. **Cross-module coordination** — sequencing slices, resolving boundaries
   between modules, and ensuring single-writer/single-migration-owner rules.
3. **Human decisions** — surfacing decisions, recording them in
   `docs/system/decisions.md`, and never bypassing approval gates.
4. **Product/research intake** — receiving product data and research material
   as *input to be stored in PostgreSQL* (via implementation tasks), not as
   prompt text or Markdown live state.
5. **Delegation** — turning direction into exactly one delegated
   `soft/tasks/current.md` task at a time, with explicit scope.
6. **Project state** — maintaining a truthful `docs/system/project-state.md`
   (implemented / not implemented / blocked / next slice).

The manager **does not** own business tables and **does not** implement feature
modules. The thin `control-plane` module (implementation) owns routing/audit
tables only.

---

## 5. Two Task Loops (Do Not Conflate)

There are two independent task loops, each with exactly one active task:

| | Root manager loop | Programmer loop |
|---|---|---|
| Location | `ops/current.md` → `ops/done/` | `soft/tasks/current.md` → `soft/tasks/done/` |
| Template | `ops/task-template.md` | `soft/harness/task-template.md` |
| Owner | main managing agent | implementation agent (`soft/AGENTS.md`) |
| Content | direction, coordination, decisions, intake, delegation, project state | code, schema, migrations, tests, implementation docs |
| May touch | root docs, `ops/`, delegation records | `soft/**` implementation |

Rules:

- **One active task per loop.** Never more than one in `ops/current.md` and one
  in `soft/tasks/current.md`.
- The manager loop never contains implementation instructions to itself; work
  that changes `soft/` is **delegated** by writing a single
  `soft/tasks/current.md` task.
- The programmer may **narrow** a delegated task but never broaden it. It must
  not start the next task.
- Neither loop auto-starts the next task after completing one.
- A blocked task is **not archived**; it stays in place with the blocker
  recorded.

---

## 6. Delegation Protocol

When work requires changing the software workspace:

1. The manager writes the task into `soft/tasks/current.md` (using
   `soft/harness/task-template.md`), referencing the canonical `docs/system/`
   documents in its architecture references.
2. The implementation agent executes inside `soft/` under `soft/AGENTS.md`.
3. The implementation archives to `soft/tasks/done/` and resets
   `soft/tasks/current.md`.
4. The manager records the outcome in `docs/system/project-state.md` and, if the
   work created a consequential design choice, in `docs/system/decisions.md`.

Before delegating **research** work (any task that executes, structures, or
persists market research), the manager must read
`docs/system/research-harness/AGENTS.md` and cite it in the delegated task's
architecture references. That file does **not** auto-load because it lives under
`docs/system/`; it is loaded by explicit reference, so locating it is not the
same as reading it.

The manager does not paste product descriptions or facts into prompts; delegated
work obtains business context from PostgreSQL through the implementation's
services and the Research Context contract.

---

## 7. Hard Prohibitions (Shared, Never Do These)

- Do **not** treat Markdown as live business state, or create a competing store
  for products, research runs, findings, leads, companies, or contacts.
- Do **not** confirm/assert an unverified product fact.
- Do **not** mutate target markets, companies, or contacts automatically.
- Do **not** send outreach of any kind; outreach is human-approved.
- Do **not** make any commercial commitment.
- Do **not** invent data, sources, or claims.
- Do **not** expose restricted fact values.
- Do **not** store chain-of-thought or model reasoning.
- Do **not** modify `legacy/**` (historical, non-live input).
- Do **not** move live business state into Markdown.
- Do **not** commit or push without an explicit human instruction.

---

## 8. Completion Report Requirements

Every completed manager task must report:

1. files created/changed;
2. migrations applied, or "not needed";
3. endpoints/contracts added or changed;
4. commands run and their results;
5. test/verification evidence;
6. known limitations;
7. decisions made or blockers created (for the next task).

Manager tasks are archived to `ops/done/YYYY-MM-DD-slug.md`; the programmer
archives to `soft/tasks/done/`.

Closing a task also requires the finalization invariants in
`docs/system/source-of-truth.md`: relevant canonical docs updated, `ops/current.md`
no longer describing the task as active, `ops/backlog.md` status updated, a
completion record written, and the recorded commit/push state matching git. A
commit message alone does not close the lifecycle. The machine-checkable subset
is enforced by `scripts/verify-docs.mjs` (run through `soft/scripts/verify.sh`).

---

## 9. Diagnostic and Process-Safety Rules (Harness)

These rules bind the manager's use of its own tooling. They describe **observed
behavior for OpenCode 1.18.30 desktop on Windows 11**, not claims about all
OpenCode versions.

- **Never print full resolved configuration or environment objects.** Some
  endpoints return resolved values including secrets — for example the local
  OpenCode server's `GET /config` returns the interpolated `GEMINI_API_KEY`.
  Diagnostic output must be an **explicit allowlist of non-secret fields**
  (statuses, booleans, counts, lengths, model/provider names, sanitized errors),
  never a whole config/env dump.
- **Clean up only processes started by the current operation, tracked by exact
  process IDs.** Never use broad name or command-line kill filters
  (`Stop-Process` / `taskkill` on e.g. `node`, `npx`, `houtini`): they can kill
  OpenCode-hosted child processes, including MCP servers, and break the session.
- **Distinguish observed behavior in this OpenCode version from general claims.**
  State version-specific findings as observed in this version; do not generalize
  to other versions without evidence.
