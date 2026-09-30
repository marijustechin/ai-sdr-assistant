# Task: Reopen an approved outreach batch for editing

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-29
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Fix the approved-batch editing workflow: an APPROVED but not-yet-started batch can
be explicitly reopened for editing. Approved versions stay immutable history, new
PENDING versions are generated from the shared message on apply, and re-approval
freezes only the new versions.

## Allowed scope

- `outreach-drafter` (reopen + apply semantics), `outreach-sender` (latest-version
  selection), contracts, web batch-review surface, docs.

## Prohibited scope

- SMTP/Sent-copy behavior (unchanged); any schema/migration; committing/pushing.

## Architecture references

- `docs/system/module-map.md` §13 (`outreach-drafter`) / §23 (`outreach-sender`),
  `docs/system/decisions.md` (reopening an approved batch),
  `docs/system/data-governance.md`.

## Completion record

### Behavior

- `POST .../outreach-batches/:batchId/reopen` reopens a batch that is `APPROVED`
  and has not entered `QUEUED`/`SENDING`/`SENT` (else `409 batch_not_reopenable`).
  The batch returns to `DRAFT`; approved versions are left untouched.
- `POST .../apply-message` on an `APPROVED` batch is refused with
  `409 batch_approved_reopen_first` (no more silent 0-draft no-op). On a `DRAFT`
  batch it regenerates the **current** non-customized drafts (including previously
  approved ones) as NEW PENDING versions from the shared message; the old rows are
  never mutated.
- Individually customized drafts remain protected; the operator may opt into
  `resetCustomized`, which creates a new non-customized PENDING version for them
  (the customized row is retained).
- Re-approval freezes only the new current versions. The send layer now queues
  only the **latest** approved version per lead, so a superseded approved version
  is never sent alongside the new one.
- Test preview already reads the latest current version per lead (no superseded
  approved versions); the UI now states whether it previews the currently approved
  version or the current pending/editing version.

### UI

- APPROVED batches no longer show an actionable editor that can affect 0 drafts.
  They show "This batch is approved… Reopen it for editing to change the message"
  with a **Reopen for editing** button (and an explicit "reset customized drafts"
  checkbox). The editor shows only for DRAFT/FAILED.
- The shared-message editor is a small client component that makes unapplied
  changes visible ("Unapplied changes — click Apply batch message").

### Contracts

- `ReopenOutreachBatchSchema` (`{ resetCustomized?: boolean }`) + type.

### Migration

- **Not needed** — reopen/apply use existing `outreach_batches` /
  `outreach_drafts` tables only.

### Tests / verification

- `outreach-batches-api.spec.ts`: apply protects customized drafts; apply on
  APPROVED is refused; reopen returns DRAFT and keeps approved history; re-apply
  creates new PENDING versions with the new subject/body while old versions are
  byte-identical; re-approval freezes only new versions; `resetCustomized`
  unlocks a customized draft (history retained); reopen refused for
  QUEUED/SENDING/SENT.
- `outreach-send-api.spec.ts`: after approve → reopen → apply, the test preview
  lists/sends the new PENDING version (latest subject), not the superseded
  approved one.
- Contracts + web form helpers covered. Full suite + typecheck/lint/build/
  `verify-docs`/`verify.sh` reported in the completion report.

## Verification commands

- `pnpm -r typecheck && pnpm -r lint && pnpm -r build && pnpm -r test`
- `node scripts/verify-docs.mjs` / `bash soft/scripts/verify.sh`
- `git diff --check`
