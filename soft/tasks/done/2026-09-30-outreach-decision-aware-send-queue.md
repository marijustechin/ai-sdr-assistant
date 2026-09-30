# Task: Decision-aware send queue (human exclusions never queued)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-30
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Guarantee that a human outreach decision (DO_NOT_CONTACT / EXISTING_RELATIONSHIP /
NOT_RELEVANT / ALREADY_CONTACTED) excludes a company from a batch send **even when
an already-approved historical draft version exists** for it.

## Allowed scope

- `outreach-drafter` draft read model + `outreach-sender` queue selection.
- Test + docs.

## Prohibited scope

- Approving/starting/sending; changing SMTP/Sent-copy behavior; Market Research
  evidence.

## Completion record

- `OutreachDraftRecord` gains `excludedFromOutreach` (derived from the
  (opportunity, company) human decision in `toRecord`); no schema change.
- `OutreachSenderService.queueDraft` skips excluded drafts, so an excluded
  company's approved version is never queued; `getSendState` excludes them from
  the eligible `approved` count.
- Decisions never touch research evidence (separate `outreach_decisions` table).
- Test (`outreach-send-api.spec.ts`): with an `APPROVED` batch of two drafts, a
  `DO_NOT_CONTACT` decision on one company results in exactly one queued outbound;
  the excluded company is never queued.

## Verification

- `pnpm -r typecheck` / `lint` / `build` / `test`; `verify-docs`; `verify.sh`;
  `git diff --check` (reported in the slice completion report).

## Notes

No batch was approved/started/sent as part of this change. The running API
process must be restarted (or the built artifact deployed) for the guard to be
active in the live instance.
