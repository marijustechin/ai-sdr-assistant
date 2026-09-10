# Task Format

**Status:** Live policy.
**Companion:** `harness.md`, `../harness/task-template.md`, `../harness/acceptance-checklist.md`.

This document defines the format of `tasks/current.md` (the active task) and
`tasks/done/YYYY-MM-DD-slug.md` (the archived task + completion record).

---

## 1. Active Task — `tasks/current.md`

The active task must contain:

| Field | Required | Meaning |
|---|---|---|
| `# Task: <title>` | yes | Task title |
| `Status:` | yes | e.g. `IN PROGRESS`, `BLOCKED` |
| `Objective` | yes | What must be achieved |
| `Allowed scope` | yes | What may be changed/created |
| `Prohibited scope` | yes | What must not be touched |
| `Architecture references` | yes | Docs the task must respect |
| `Files/modules expected to change` | yes | Concrete list |
| `Schema/migration impact` | yes | e.g. "none" or a specific change |
| `Endpoint/contract impact` | yes | e.g. "none" or a specific endpoint/contract |
| `Acceptance criteria` | yes | Checkable list |
| `Verification commands` | yes | Commands to run (must exist) |
| `Rollback/blocked conditions` | yes | How to back out or what blocks it |
| `Completion record placeholder` | yes | Empty section to fill on completion |

The empty template lives at `../harness/task-template.md`. After archiving a
task, `tasks/current.md` is reset to that template.

---

## 2. Archived Task — `tasks/done/YYYY-MM-DD-slug.md`

An archived task contains the **original task** (everything above) plus the
completion record:

| Section | Required |
|---|---|
| `## Completion record` | yes |
| `Actual implementation summary` | yes |
| `Files changed` | yes |
| `Migration applied` (or "not needed") | yes |
| `Endpoints/contracts added or changed` | yes |
| `Commands run and results` | yes |
| `Test and verification evidence` | yes |
| `Known limitations` | yes |
| `Decisions or blockers created` | yes |

Archive only after `scripts/verify.sh` and the acceptance checklist pass. If
blocked or verification fails, do not archive.
