# Task: Research result finalization + pending-quote follow-up scheduling

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Let a market-research run present a publishable result while supplier price
inquiries are still awaiting replies, with a DB-backed follow-up schedule that
survives restarts and a bounded worker that only checks for replies to already
sent inquiries.

## Completion record

### Lifecycle decision

- `ResearchRunStatus` gains `COMPLETED_WITH_PENDING_CLARIFICATIONS`. A run is
  finalized to `COMPLETED` (no pending clarifications) or
  `COMPLETED_WITH_PENDING_CLARIFICATIONS` (RFQs awaiting replies) — never kept
  `RUNNING` solely for outstanding supplier replies.
- `PriceInquiryStatus` gains `NO_RESPONSE` (waiting window elapsed; not pending;
  outbound/inquiry records preserved). `SENT` = pending clarification. No
  duplicate state model; the per-seller clarification state is derived
  (`AWAITING_REPLY | REPLY_RECEIVED | QUOTE_RECEIVED | NO_RESPONSE`).

### DB / schema changes

Migration `20260925120000_research_result_and_quote_follow_ups` (additive):

- `ALTER TYPE "ResearchRunStatus" ADD VALUE 'COMPLETED_WITH_PENDING_CLARIFICATIONS'`.
- `ALTER TYPE "PriceInquiryStatus" ADD VALUE 'NO_RESPONSE'`.
- New `QuoteFollowUpStatus` enum.
- New `research_results` (owner `market-researcher`, 1:1 run): frozen snapshot +
  `research_completed_at` + `last_enriched_at`.
- New `quote_follow_ups` (owner `quote-collection`, unique per draft): status,
  `next_check_at`, attempt count, `last_checked_at`, worker lease,
  `completed_at`, `last_result`.

### Result snapshot + enrichment

`POST .../research-runs/:runId/finalize` (human) freezes the snapshot and
completes the run; `GET .../result` returns the frozen envelope + live counts
(evidence/sources, sellers, buyers, public prices, pending, quotes, no-response)
and per-inquiry states. Later replies bump `lastEnrichedAt`; the frozen snapshot
and historical evidence are never rewritten. A read-only `research-result` module
composes the view from the owning modules (no new tables).

### Follow-up policy + worker

- Configurable calendar-hour policy (`follow-up-policy.ts`): default checks at
  24h/48h/72h, 120h (5 calendar day) expiry; env `FOLLOW_UP_CHECK_DELAYS_HOURS`,
  `FOLLOW_UP_EXPIRY_HOURS`, `FOLLOW_UP_LEASE_MINUTES`. No business-day calendar
  (documented).
- Sending an RFQ creates the schedule (`nextCheckAt = sentAt + first delay`).
- `FollowUpService.processDue(limit)` claims due rows via a compare-and-swap
  lease (safe against duplicates), reuses `QuoteCollectionService.checkReplies`
  (existing correlation/extraction), completes on a matched reply, reschedules on
  no reply, and expires to `NO_RESPONSE` after the window. The in-process trigger
  (`FollowUpScheduler`) is env-gated (`FOLLOW_UP_SCHEDULER_ENABLED`, default off)
  and is only a trigger; the DB schedule is the source of truth. Manual endpoints
  `POST /opportunities/:id/quote-follow-ups/run-due`, `GET .../quote-follow-ups`
  remain, and the per-draft "Check for replies" action is unchanged.

### UI

Minimal `ResearchResultSummary` on the run page: completion/last-updated
timestamps; badges for public prices / pending clarification / quotes received /
no response (+ sellers, buyers); a per-inquiry list with the clarification state;
"Finalize result" (human) and "Check due inquiries now".

### Tests / verification

- New: follow-up policy unit; follow-up worker unit (matched/no-reply/expire/
  lease); contracts (run status, `NO_RESPONSE`, result, run-due); integration
  (finalize with pending → `COMPLETED_WITH_PENDING_CLARIFICATIONS`; `NO_RESPONSE`
  not pending; finalize idempotent; DB schedule survives and is deduped).
- Extended quote-collection service unit: send schedules a follow-up; matched
  reply completes it and enriches the result.
- Results: contracts **70**, API **193**, web **154**; typecheck/lint clean;
  build exit 0; `scripts/verify.sh` 60/0; `git diff --check` clean. No live send.

### Live run

Run `959edfb5` finalized to `COMPLETED_WITH_PENDING_CLARIFICATIONS`. The three
previously sent inquiries (Consolva, Medžio bitės, MDS Terasos) are
`AWAITING_REPLY`, each with a `SCHEDULED` follow-up (next check ~24h after send).

### Files changed

- contracts: `research-result.ts` (+`research.ts`, `price-inquiries.ts`, `index.ts`), tests.
- api: `research-result/**`; `market-researcher/{domain,infrastructure,application}`;
  `price-inquiry/{repository,application}`; `quote-collection/{domain/follow-up-*.ts,
  infrastructure/quote-follow-up.repository.ts, application/follow-up{,-scheduler}.service.ts,
  application/quote-collection.service.ts, presentation, module}`; `app.module.ts`.
- web: `lib/research/result.ts`, `lib/api/research.ts`, `features/manage-research-result/**`,
  `components/research/research-result-summary.tsx`, run page.
- db: `schema.prisma`, migration. Tests: `test/helpers/database.ts`, new specs.
- docs: `docs/system/{decisions,module-map,project-state}.md`,
  `soft/docs/{data-model,data-ownership}.md`, `ops/current.md`.

### Limitations / uncertainties

- Scheduler trigger is opt-in (default off); schedule persists regardless.
- Policy uses calendar hours (no business-day/holiday calendar).
- The `research-result` composer is read-only; a fully redesigned Price
  Intelligence results UI is a separate later task.

### Correction (same day) — live-verification defects

Three real defects from the controlled live verification were fixed:

1. **Cross-draft reply swallowing.** Reply collection is now **account-wide**:
   `scanAccountReplies(accountId)` matches every candidate against **all** sent
   RFQ Message-IDs for the mailbox and routes it to its own draft; only truly
   unrelated messages are stored UNMATCHED metadata-only. An already-seen
   UNMATCHED row whose headers reference a known outbound is **repaired in
   place** (body re-fetched by its mailbox UID within the bounded scan).
   `FollowUpService` scans each shared mailbox once per batch; the manual
   per-draft check runs the same account-wide scan.
2. **Reply ≠ usable quote.** `SENT → REPLY_RECEIVED` on any matched reply;
   `QUOTE_EXTRACTED` **only** with a usable price (`priceAmount` + `currency`).
   Added `PriceInquiryService.reconcileReplyState` (idempotent; never touches
   `SENT`) applied during the scan to correct earlier misclassifications. Result
   counts add `repliesReceived` (no usable price) separately from
   `quotesReceived`.
3. **Quoted-original contamination.** `extractQuote` now runs on
   `stripQuotedOriginal(text)` (drops `>` blocks, signature separators, and
   `From:`/`Sent:`/`On … wrote:` reply-header tails), so our own quoted inquiry
   cannot create false price/unit/MOQ.

**Live read-only reprocessing (no sends):** called the account-wide check for
the Medžio bitės inquiry. Consolva was corrected `QUOTE_EXTRACTED →
REPLY_RECEIVED` (no usable price); the swallowed Medžio bitės reply was
**recovered** (`In-Reply-To <fb647648-…>`, body 1439 chars, linked, quote with
`price_not_found`), → `REPLY_RECEIVED`, follow-up `COMPLETED (REPLIED)`. MDS
Terasos remains `SENT`/pending. Result counts: pending 1, repliesReceived 2,
quotesReceived 0, noResponse 0; `lastEnrichedAt` updated. Re-scan is idempotent
(`persisted=0 skipped=2 matched=0`, state unchanged).

**New tests:** account-wide routing of two replies to their own RFQs; unrelated
mail metadata-only; already-seen UNMATCHED repair (no duplicate); reply-no-price
→ `REPLY_RECEIVED`; reply-with-price → `QUOTE_EXTRACTED`; quoted-original
stripping (pure); result counts separate pending/replies/usable quotes/no-response;
follow-up completes on a price-less reply. Final suite: contracts **70**,
API **202**, web **154**; typecheck/lint clean; build exit 0.
