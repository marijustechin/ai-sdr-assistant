# Task: Batch/campaign outreach review (not per-recipient approval)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Replace mandatory per-recipient approval with a batch/campaign review model:
generate drafts for all eligible leads in the outreach scope, present them as one
batch, approve the whole batch in one action (freezing exact versions), keep
individual editing optional, and design the state model for a future
controlled-pacing send worker. No sending.

## Completion record

### Data model / migration

- New `outreach_batches` (owner `outreach-drafter`): opportunity scope + optional
  target market + sender profile + language, `status`
  (`DRAFT | APPROVED | QUEUED | SENDING | SENT | CANCELLED`), human `approvedAt`,
  reserved `sendPolicy` JSON.
- `outreach_drafts` gains `batch_id`, `customized`, `approval_status`
  (`PENDING | APPROVED`), `approved_at`. Approval is **per immutable version**.
- Migration `20260925190000_outreach_batches` (additive).

### API

- `POST /opportunities/:id/outreach-batches` — create a batch and generate drafts
  for every currently eligible lead; skip + count human-excluded, rejected/stale,
  and no-usable-recipient leads.
- `GET /opportunities/:id/outreach-batches/:batchId` — summary: sender, scope,
  language, counts (eligible / excluded-by-decision / without-recipient /
  generated / approved / pending), representative previews, all drafts.
- `POST .../:batchId/approve` — approve the whole batch; freezes every included
  prepared pending version.
- `POST .../:batchId/regenerate` — re-derive **unapproved, non-customized** drafts
  only (never overwrites an individual edit or an approved version).
- `PATCH .../outreach-drafts/:draftId` (existing editor) now marks the new version
  `customized` + `PENDING`; if its batch was `APPROVED` the batch returns to
  `DRAFT` (deterministic re-approval).

### Web

- Batch section on the product Leads page: per opportunity a batch block showing
  status, language, sender, the counts line, representative previews (with an
  "Open draft" link to the lead), and whole-batch **Approve** / **Regenerate** /
  **New batch** actions. Individual editing remains available on the lead detail.

### Deterministic approval rules

- A draft is in the approved batch iff its version row has
  `approval_status = APPROVED`; approved versions are immutable.
- Any human edit creates a new `PENDING` version → requires re-approval and
  returns the batch to `DRAFT`.

### Future send preparation

- Status vocabulary reserves `APPROVED → QUEUED → SENDING → SENT`; `sendPolicy`
  reserved for pacing. Intended policy: configurable, conservative default ≈ one
  message every 3 minutes + sender/mailbox rate limits + pause/resume; an
  operational/deliverability safeguard, **not** a spam-filtering guarantee.

### Tests / verification

- API **221** — `outreach-batches-api.spec.ts`: generation counts (eligible 3,
  excluded-by-decision 1, without-recipient 1, generated 2), whole-batch approval
  (all included drafts `APPROVED`), and the customized-edit → new `PENDING`
  version → batch returns to `DRAFT` → regeneration never overwrites the edit.
- Contracts **78**, database **17**, web **176**; typecheck/lint/build,
  `verify-docs`, `verify.sh`, `git diff --check` green.

### Known limitations

- `QUEUED/SENDING/SENT` and `sendPolicy` are reserved only; no send worker.
- Batch scope is the opportunity (a batch per opportunity); the sender/market are
  optional overrides.
- The batch UI is server-rendered forms (no optimistic UI).
