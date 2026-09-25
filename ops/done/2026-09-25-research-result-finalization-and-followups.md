# O-025 — Research result finalization + pending-quote follow-up scheduling

**Task ID:** O-025
**Status:** ACCEPTED — committed
**Completed:** 2026-09-25
**Commit:** 7fbbfae
**Type:** delegation
**Scope:** `soft/` implementation + canonical docs

> Reconciliation note (2026-09-25, O-026): this task was executed and discussed
> in `ops/current.md` without an `O-` number and its manager archive was not
> written before the next task began. It is assigned `O-025` and recorded here
> during the O-026 documentation-state reconciliation. The implementation record
> is the historical programmer archive
> `soft/tasks/done/2026-09-25-research-result-followups.md`; that file is
> unchanged.

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
  policy + compare-and-swap worker reusing existing reply correlation;
  env-gated in-process trigger (default off); manual run-due endpoints.
- Minimal result UI (timestamps, counts/badges, per-seller state, finalize +
  manual check).
- Migrations `20260925120000_research_result_and_quote_follow_ups`.

## Acceptance criteria

- [x] Run finalizes while inquiries remain pending; pending count correct.
- [x] Sending schedules a follow-up; due checks claimed once; no-reply
  reschedules; matching reply completes + enriches; final deadline →
  `NO_RESPONSE`; idempotent; DB persists across restarts.
- [x] Manual Check for replies unchanged; background work never sends mail.
- [x] Tests/typecheck/lint/build/verify green; no live send.

## Correction (same day, live-verification defects)

Account-wide reply scan (no cross-draft swallowing) with in-place repair of
already-seen UNMATCHED rows whose headers reference a known outbound; a reply
without a usable price is `REPLY_RECEIVED` (not `QUOTE_EXTRACTED`); extraction
ignores the quoted original; result counts add `repliesReceived`. Live read-only
reprocessing corrected Consolva to `REPLY_RECEIVED` and recovered the Medžio
bitės reply; MDS remains pending; re-scan idempotent. Recorded in
`docs/system/decisions.md` (2026-09-25 entries).

## Verification

- contracts 70, API 202, web 154; typecheck/lint clean; build exit 0;
  `scripts/verify.sh` 60/0; `git diff --check` clean.

## Completion record

Accepted/committed to `main` as `7fbbfae`
(`feat(research): add result follow-ups and account-wide reply handling`).
Full implementation detail: `soft/tasks/done/2026-09-25-research-result-followups.md`.
