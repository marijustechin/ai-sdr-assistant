# Source of Truth and Documentation Invariants (Canonical)

**Status:** Canonical, live. Created 2026-09-25 (O-026).
**Companion:** `project-state.md`, `module-map.md`, `architecture.md`,
`decisions.md`; root `AGENTS.md`, `docs/README.md`, `ops/README.md`.
**Purpose:** define who owns which status statement, and the invariants that
keep the documentation/state set from drifting apart from committed reality.

---

## 1. One owner per status statement

Duplicated status statements are the main source of drift. Each status fact has
**exactly one authoritative home**; every other document must **point to** it
rather than restate it.

| Question | Authoritative home | Everyone else |
|---|---|---|
| What is implemented / planned / blocked right now? | `docs/system/project-state.md` | link to it; do not restate a status list |
| Who owns a module, its tables, and its boundaries? | `docs/system/module-map.md` (+ `data-governance.md` for tables) | link; do not duplicate ownership lists |
| Why was a consequential choice made? | `docs/system/decisions.md` | link to the dated entry |
| What is the actual present architecture? | `docs/system/architecture.md` | link; READMEs summarise only |
| What manager task is active? | `ops/current.md` (exactly one, or the idle form) | `ops/backlog.md` references it |
| What manager work is queued / done? | `ops/backlog.md` | `ops/done/` is the history |
| Manager task history | `ops/done/` (append-only-ish) | — |
| Implementation task lifecycle | `soft/tasks/current.md` / `soft/tasks/done/` | — |
| Orientation (what/where/why, entry points) | `README.md`, `soft/README.md` | must not become a second status database |

`soft/` is implementation evidence: the committed code, schema, and migrations
are the ground truth for **what the software does**, and the canonical docs are
the ground truth for **what we say about it**. When they disagree, the code is
evidence of fact and the docs must be corrected.

---

## 2. Machine-readable markers

Deterministic checks need stable markers, not prose. These are required:

- **`ops/current.md`** — a `**Task ID:**` line (`O-<nnn>` or `none`) and a
  `**Status:**` line. Allowed active statuses: `IN_PROGRESS`, `BLOCKED`,
  `READY_FOR_HUMAN_REVIEW`, or `NONE` (idle). Terminal statuses (`ACCEPTED`,
  `DONE`, `CLOSED`, `COMPLETE`) belong only in archives.
- **`ops/backlog.md`** — a `## Active` section and a `## Completed` section;
  each manager task ID appears under **exactly one**.
- **`ops/done/*.md`** — a `**Task ID:** O-<nnn>` line.
- **`docs/system/project-state.md`** — a `Last updated YYYY-MM-DD` field.
- **`docs/system/architecture.md`** — the module table uses the fixed status
  vocabulary `implemented | implemented-subset | planned`.

The checker `scripts/verify-docs.mjs` enforces only these markers and the
contradictions they make checkable. It deliberately does **not** parse arbitrary
English.

---

## 3. Finalization invariants

A manager task is **not finalized** (and must not be described as closed) until
all of the following hold:

1. The implementation/task record is complete (or the task is explicitly
   manager-only and touches no `soft/` code).
2. The relevant `docs/system/**` documents are updated to match the new reality.
3. `ops/current.md` no longer describes the completed task as active — it is
   reset to the idle form or replaced by the next task.
4. `ops/backlog.md` status is updated: the task moves to `## Completed` with a
   `committed <hash>` once it is on `main`, and it is removed from `## Active`.
5. A completion record exists (archived to `ops/done/YYYY-MM-DD-slug.md`).
6. Commit/push fields in the current docs match actual `git` state. **A commit
   message alone does not close the lifecycle**; the manager loop records must
   be reconciled in the same change.

A blocked task is never archived and never moved to `## Completed`.

---

## 4. What the automated check does (and does not) do

`scripts/verify-docs.mjs` is a small deterministic Node script. It fails when:

- a required canonical document is missing;
- `ops/current.md` is malformed, or holds a terminal status, or names a task
  that is already `Completed`, or has both an active and an archived record;
- the same O-task is `Active` **and** `Completed` in `ops/backlog.md`, or the
  `Active` task does not match `ops/current.md`;
- `project-state.md` `Last updated` is older than its newest dated entry (or is
  malformed);
- `architecture.md` marks a module `planned` when its directory exists under
  `soft/apps/api/src/modules/`, or omits it from the table entirely;
- `soft/README.md` still calls `apps/web` "planned"/"deferred" while
  `soft/apps/web/app` exists;
- a `committed <hash>` recorded in `ops/backlog.md` does not exist in git.

It warns (does not fail) about historical records that predate the marker
convention. It never reads live business values and never uses an AI heuristic.

Run it directly (`node scripts/verify-docs.mjs`) or through the implementation
harness (`bash soft/scripts/verify.sh`).

---

## 5. Maintenance rule

When a task changes status, update the **owner** in §1 first, then let the
pointers follow. If a check in §4 becomes wrong or noisy, fix the marker or the
checker in one small change — do not add prose exceptions to a document to
silence it.
