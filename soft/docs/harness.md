# Development Harness

**Status:** Live policy.
**Companion:** `AGENTS.md` (binding contract), `task-format.md`, `../harness/task-template.md`, `../harness/acceptance-checklist.md`.

This document defines the **autonomous development harness**: how work is
organised, executed, verified, and archived. It is distinct from the
market-research harness (historical, in `../legacy/docs/market-research-harness.md`).

---

## 1. One Active Task

- Exactly **one** active task exists at `tasks/current.md`.
- The task is the unit of work. Its scope comes from `tasks/current.md` and may
  only be narrowed by the agent, never broadened.
- No automatic start of the next task: after completing and archiving one task,
  the agent **stops** and resets `tasks/current.md` to the empty template.

## 2. Instruction Hierarchy

`AGENTS.md → docs/architecture.md + docs/security.md + docs/contracts/*
→ docs/decisions.md → docs/testing.md → tasks/current.md`

When sources conflict, the higher-ranked one wins.

## 3. Task Loop

```text
baseline → plan → implement → migration check → tests → verification → record
```

Each phase is described in `AGENTS.md` §5. The agent must not skip the
migration check or the verification step.

## 4. Acceptance

- Use `../harness/acceptance-checklist.md` as the gate for every task.
- Run `scripts/verify.sh` (or `pnpm verify`) before declaring a task complete.
- Record commands and outcomes in the task record (see `task-format.md`).

## 5. Archival

- A completed task is archived to `tasks/done/YYYY-MM-DD-slug.md` containing the
  original task plus the completion record.
- If blocked or verification fails, **do not archive** — keep `tasks/current.md`
  in place and record the blocker.

## 6. Boundaries (non-negotiable)

- No business module implementation, migration, research logic, or external
  integration may be added outside an explicit task in `tasks/current.md`.
- Never modify `../legacy/**`.
- No automatic start of the next task.
