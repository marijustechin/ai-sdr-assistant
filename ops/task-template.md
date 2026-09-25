# O-<id> — <title>

**Task ID:** O-<id>
**Status:** IN PROGRESS
**Type:** <manager task type: direction | coordination | decision | intake | delegation | project-state>
**Scope:** <repository area>

## Objective

<what must be achieved at the manager level>

## Inputs / references

- `AGENTS.md`
- `docs/system/source-of-truth.md`
- `docs/system/<relevant>.md`
- <human decisions / intake / evidence>

## Steps

- <ordered manager actions>

## Deliverables

- <files created/changed>

## Acceptance criteria

- [ ] <checkable criterion>

## Out of scope

- <what must not be touched>

## Verification

- <commands or inspections that prove the result>

## Rollback/blocked conditions

- <how to back out / what blocks the task; do not archive a blocked task>

## Finalization checklist (required before a task is closed)

- [ ] Implementation/task record complete (or "manager-only task — none required").
- [ ] Relevant `docs/system/**` docs updated.
- [ ] `ops/current.md` no longer describes this task as active (reset to the idle form or start the next task).
- [ ] `ops/backlog.md` status updated (moved to `## Completed` with a `committed <hash>` when known).
- [ ] Completion record written and archived to `ops/done/YYYY-MM-DD-slug.md`.
- [ ] Commit/push fields match actual `git` state (a commit message alone does not close the lifecycle).

## Completion record

<!-- Filled on completion; archived to ops/done/YYYY-MM-DD-slug.md -->

---

## Idle form — no active manager task

When no manager task is active, `ops/current.md` must contain exactly the
machine-readable idle form below (nothing more), so tooling can tell "active"
from "idle" deterministically:

```markdown
# No active manager task

**Task ID:** none
**Status:** NONE

No manager task is active. See `ops/backlog.md` for the queue and `ops/done/`
for history. Do not start a task without a new `ops/current.md`.
```

Statuses that close a task (`ACCEPTED`, `DONE`, `CLOSED`, `COMPLETE`) belong in
archives, never in an active `ops/current.md`.
