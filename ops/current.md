# Task: Research result finalization + pending-quote follow-up scheduling

**Status:** ACCEPTED — committing to main (`feat(research): add result follow-ups and account-wide reply handling`)
**Type:** delegation (implementation complete; human review passed)
**Scope:** `soft/` implementation + canonical docs

## Objective

Let a market-research run present a publishable result while supplier price
inquiries are still awaiting replies. Separate research completion from
clarification status; add a DB-backed follow-up schedule and a bounded,
idempotent reply-check worker; keep the run open until genuine diminishing
returns or configured limits.

## Deliverables

- `ResearchRunStatus.COMPLETED_WITH_PENDING_CLARIFICATIONS` + immutable
  `research_results` (owner `market-researcher`); finalize/result endpoints; a
  read-only `research-result` composition module.
- `PriceInquiryStatus.NO_RESPONSE`; per-inquiry clarification state.
- `quote_follow_ups` (owner `quote-collection`) + configurable calendar-hour
  policy + compare-and-swap worker reusing the existing reply correlation; env-
  gated in-process trigger (default off); manual run-due endpoints.
- Minimal result UI (timestamps, counts/badges, per-seller state, finalize +
  manual check).

## Acceptance criteria

- [x] Run finalizes while inquiries remain pending; pending count correct.
- [x] Sending schedules a follow-up; due checks claimed once; no-reply
  reschedules; matching reply completes + enriches; final deadline →
  `NO_RESPONSE` (not pending); idempotent; DB persists across restarts.
- [x] Manual Check for replies unchanged; background work never sends mail.
- [x] Tests/typecheck/lint/build/verify green; no live send.

## Verification

- contracts 70, API 202, web 154; typecheck/lint clean; build exit 0;
  `scripts/verify.sh` 60/0; `git diff --check` clean.

## Correction (same day, live-verification defects)

Account-wide reply scan (no cross-draft swallowing) with in-place repair of
already-seen UNMATCHED rows whose headers reference a known outbound; a reply
without a usable price is `REPLY_RECEIVED` (not `QUOTE_EXTRACTED`); extraction
ignores the quoted original; result counts add `repliesReceived`. Live read-only
reprocessing: Consolva corrected to `REPLY_RECEIVED`; Medžio bitės reply
recovered (`REPLY_RECEIVED`); MDS still pending; re-scan idempotent.

## Blockers / notes

- Scheduler trigger opt-in (default off); DB is source of truth. Policy is
  calendar-hour (no business-day calendar). Full Price Intelligence UI is a
  later task. Next: keep the LT run open; due follow-ups run after the waiting
  windows (first ~24h after send).

## Completion record

Implementation complete 2026-09-25; workspace READY_FOR_HUMAN_REVIEW. No
commit/push. Full detail:
`soft/tasks/done/2026-09-25-research-result-followups.md`.
