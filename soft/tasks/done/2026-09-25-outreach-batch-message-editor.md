# Task: Batch-level outreach message editor (shared fields, preserve personalization)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Let an operator edit the shared first-contact fields for a whole outreach batch
once — subject, proposition/commercial text, commercial terms, CTA — and apply
them to every eligible draft, while preserving each recipient's evidence-backed
personalization and never overwriting approved or individually customized drafts.

## Allowed scope

- `outreach-drafter` (batch `messageStrategy` persistence + apply-message
  endpoint + regeneration rules).
- Web batch review surface (edit form) + contracts.
- Docs and the additive migration.

## Prohibited scope

- The send layer's content-dumb contract (no regeneration on send).
- Live email send/read; target-market/contact mutation; product facts.

## Architecture references

- `docs/system/module-map.md` (outreach-drafter), `docs/system/decisions.md`
  (batch review + batch message editor), `docs/system/data-governance.md`,
  `docs/system/research-harness/outreach-drafting.md`.

## Completion record

### State / data model

- `outreach_batches.message_strategy` JSON (nullable): shared
  `{subject?, proposition?, terms?, cta?}`. Additive migration
  `20260925220000_outreach_batch_message_strategy`.
- `normaliseStrategy` drops blank fields so a cleared field falls back to the
  language template.

### Generation rules

- `buildDraftContent` accepts a strategy that overrides the language scaffold per
  field; the subject/greeting/personalization rules are unchanged, so per-lead
  evidence (greeting, naturalized observation, signature) is preserved.
- `prepareDraft(..., { strategy, batchId })` records the strategy on the
  version's fingerprint so regeneration is deterministic and idempotent.
- `applyBatchMessage(opportunityId, batchId, strategy)` persists the strategy and
  regenerates **only unapproved, non-customized** drafts. Approved versions are
  immutable and individually customized drafts are never overwritten; any change
  returns the batch to `DRAFT` (explicit re-approval).
- The batch summary now reports `regeneratableDrafts` and `customizedDrafts` so
  the review surface can show the impact before applying.

### Endpoint / contract

- `POST /opportunities/:opportunityId/outreach-batches/:batchId/apply-message`
  (guarded; body validated by `OutreachMessageStrategySchema`).

### UI

- New "Edit batch message" panel in the batch review section: subject,
  proposition, terms and CTA inputs prefilled from `batch.messageStrategy`, an
  affected/untouched counts note, and an **Apply batch message** action.

### Tests / verification

- `outreach-batches-api.spec.ts`: applies a batch message to all unapproved,
  non-customized drafts (subject + shared proposition/terms/CTA appear, evidence
  personalization preserved, `customized=false`); an individually customized
  draft is left intact on re-apply while the other regenerates; an approved
  version's body is unchanged after re-apply and the batch stays `APPROVED`.
- Commands: `pnpm --filter @ai-sdr/api typecheck`, `pnpm --filter @ai-sdr/web
  typecheck`, `vitest run test/outreach-content.spec.ts
  test/outreach-batches-api.spec.ts` — all green. Full-suite numbers reported in
  the completion report.

## Verification commands

- `pnpm --filter @ai-sdr/api typecheck`
- `pnpm --filter @ai-sdr/web typecheck`
- `pnpm --filter @ai-sdr/api exec vitest run test/outreach-batches-api.spec.ts test/outreach-content.spec.ts`
- `node scripts/verify-docs.mjs` / `bash soft/scripts/verify.sh` (full)
