# Ops — Root Manager Task Loop

`ops/` is the **root manager's task loop**. It is separate from, and must not be
conflated with, the programmer task loop in `soft/tasks/`.

## What belongs here

Manager-level work only:

- system direction and canonical documentation alignment;
- cross-module coordination and sequencing;
- recording human decisions;
- product/research intake (as input to PostgreSQL, via delegated tasks);
- delegation into `soft/tasks/current.md`;
- maintaining `docs/system/project-state.md`.

It does **not** contain application code, schema, migrations, or tests. Work
that changes `soft/` is delegated to the programmer loop.

## Structure

```text
ops/
├── README.md          # this file
├── current.md         # the ONE active manager task
├── backlog.md         # ordered upcoming manager tasks
├── task-template.md   # manager task template
└── done/              # archived manager tasks (YYYY-MM-DD-slug.md)
```

## Rules

- **One active task** in `current.md` at a time, using the machine-readable
  `**Task ID:**` / `**Status:**` markers; when idle, use the explicit idle form
  from `task-template.md`.
- Use `task-template.md` for every task.
- Archive a completed task to `done/YYYY-MM-DD-slug.md`, then reset
  `current.md` to the idle form (or start the next task).
- **Finalization invariant:** a task is not finalized until its record is
  complete, relevant `docs/system/**` docs are updated, `current.md` no longer
  describes it as active, `backlog.md` moves it to `## Completed`, a completion
  record exists, and the recorded commit/push state matches git. A commit
  message alone does not close the lifecycle. Full rules:
  `../docs/system/source-of-truth.md`; enforced by
  `../scripts/verify-docs.mjs`.
- A **blocked** task is not archived: leave it in `current.md` with the blocker
  recorded.
- Do not auto-start the next task.
- The manager loop never contains implementation instructions to itself; it
  delegates to `soft/tasks/current.md`.
- Keep `backlog.md` status sections authoritative: each task ID appears under
  exactly one of `Active`, `Completed`, `Blocked / deferred`.

## Relationship to `soft/tasks/`

| | `ops/` (this loop) | `soft/tasks/` |
|---|---|---|
| Owner | main managing agent | implementation agent |
| Contract | root `AGENTS.md` | `soft/AGENTS.md` |
| Content | direction, decisions, intake, delegation, project state | code, schema, migrations, tests |
| May touch | root docs, `ops/` | `soft/**` |

See the root `AGENTS.md` §5–§6 for the full boundary and delegation protocol.
