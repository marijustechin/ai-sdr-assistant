# Task: Market Research quote collection (RFQ send + bounded reply capture + quote extraction)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-24
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

The controlled market-research supplier quote-collection loop: approval-gated
RFQ send from the draft's resolved inquiry sender, immutable outbound
persistence, bounded read-only inbox capture, reply↔RFQ correlation, safe reply
persistence, and evidence-grounded structured quote extraction, with RFQ state
advancement. Market research, never buyer outreach.

## Completion record

### Architecture decision

- New module **`quote-collection`** owns the loop's three tables. `price-inquiry`
  stays the sole writer of `price_inquiry_drafts`: reply/quote processing
  advances draft status only through `PriceInquiryService`. This keeps supplier
  price clarification explicitly Market Research.
- Transport stays in `email-accounts`, exposed as provider-neutral ports
  (`OutboundMailPort`, `InboundMailPort`). The SMTP/IMAP adapters resolve the
  account and decrypt the password **only inside the transport boundary**;
  credentials are never returned, logged, or stored in the new tables.
- The loop reuses existing research objects: the raw reply is persisted as run
  evidence (`SourceReference` type `EMAIL_REPLY` + `Evidence`) and the inbound/
  quote rows carry the lead's `researchRunId`; a derived `marketResearchState`
  is a view, not a second workflow.

### DB/schema changes

One additive migration `20260924200000_add_quote_collection`:

- 3 tables: `quote_outbound_messages`, `quote_inbound_messages`, `supplier_quotes`.
- 3 enums: `QuoteOutboundStatus`, `QuoteInboundStatus`, `QuoteMatchConfidence`.
- `ALTER TYPE "PriceInquiryStatus" ADD VALUE 'SENT','REPLY_RECEIVED','QUOTE_EXTRACTED'`.
- Rollback notes in the SQL. Applied to `ai_sdr` + `ai_sdr_test_api` via psql and
  recorded in `_prisma_migrations` (schema engine blocked by Device Guard).

### Outbound send flow

1. Load the draft (owner service) and assert sendable: status
   `READY_FOR_HUMAN_REVIEW`, inputs non-stale, recipient present, subject/body
   non-empty, no existing SUBMITTED outbound.
2. Resolve the draft's **inquiry** sender profile (ACTIVE) and its email account
   (ACTIVE). The outreach sender is never consulted.
3. Generate the Message-ID and submit exactly one message via `OutboundMailPort`.
4. On success: persist an immutable `QuoteOutboundMessage` (snapshot + Message-ID
   + submission status) and `markSent` the draft.
5. On failure: persist the FAILED attempt with a short safe code, leave the draft
   reviewable, return `502 rfq_send_failed`.

### Reply correlation strategy

`In-Reply-To` / `References` against our Message-ID first (HEADER confidence).
Only when headers are absent: bounded fallback (recipient relationship +
normalized subject + sent-time window), accepted only when exactly one candidate
matches (FALLBACK). More than one → ambiguous → left unlinked (`UNMATCHED`) for
human review. Never subject alone.

### Inbound persistence

`QuoteInboundMessage` rows keyed idempotently by `(email_account_id, mailbox_uid)`
with `uidValidity:uid`; header/body fields, processing status, match confidence,
and research/evidence links. Only headers and the plain-text body are fetched; no
attachments; nothing is deleted, moved, or marked read.

### Quote extraction model

`SupplierQuote` stores the original commercial terms (price text/amount/currency/
unit, MOQ, Incoterm, loading, lead time, validity, VAT, qualification) with a
`fieldProvenance` map (field → supporting excerpt) and `warnings`. Values come
only from explicit spans of the reply; unknown/ambiguous stay null; no unit
conversion.

### UI flow

RFQ panel: per-draft status + derived market-research state; recipient/sender/
subject/body review (locked after send); **Send price inquiry** with an inline
confirm step; after send, the sent timestamp, safe Message-ID and submission
status; **Check for replies** button; incoming replies shown with match
confidence, received time and extracted fields/warnings; unmatched replies
flagged for human review.

### Tests / verification

- contracts **66**, API **153**, web **154** tests pass (new: quote-collection
  contracts, reply-matching + extraction domain unit, service unit with fakes,
  HTTP integration for gated/no-transport paths + immutable snapshot, web display).
- `-r typecheck`, `-r lint` clean; production build exit 0; `scripts/verify.sh`
  60/0; `git diff --check` clean.
- No live send/read is invoked by any test: SMTP/IMAP are reached only from an
  explicit confirmed human action. Integration tests exercise only paths that
  fail before (or without) a live connection.

### Files changed

- **Schema/migration:** `soft/packages/database/prisma/schema.prisma`,
  `migrations/20260924200000_add_quote_collection/`.
- **API:** new `modules/quote-collection/**` (domain/{types,message-id,
  reply-matching,quote-extraction,market-research-state}, infra repository,
  application service, presentation controller, module); `email-accounts`
  (`domain/messaging.ts`, `application/{outbound,inbound}-mail.adapter.ts`,
  module exports); `price-inquiry` (repository + service transitions);
  `app.module.ts`; `test/helpers/database.ts`.
- **Contracts:** `src/quote-collection.ts`, `src/price-inquiries.ts`, `src/index.ts`.
- **Web:** `entities/quote-collection/**`, `entities/price-inquiry/{types,display}`,
  `features/manage-price-inquiry/**`, lead detail page, `shared/api/errors.ts`.
- **Tests:** `packages/contracts/test/quote-collection-contracts.spec.ts` (+ price-inquiry
  contract update); `apps/api/test/{quote-reply-matching,quote-extraction,
  quote-collection-service,quote-collection-api}.spec.ts`;
  `apps/web/entities/quote-collection/display.test.ts` (+ price-inquiry display test).
- **Docs:** `docs/system/{decisions,module-map,data-governance,project-state,architecture}.md`,
  `soft/docs/{data-model,data-ownership}.md`, `ops/current.md`.

### Known limitations / blockers

- No final market-price summary or normalization (explicitly a later task).
- No automatic/periodic polling; reply checks are human-triggered only.
- No attachment parsing.
- The IMAP adapter's exact `bodyParts`/headers shape must be confirmed in the
  controlled live smoke step before production reliance.
- Device Guard still blocks the Prisma schema engine; migrations are applied via
  psql.

## Live smoke #1 (2026-09-24) — findings and fixes

A controlled live send/reply against `tomas.berg@sapiensmetric.eu` (recipient =
the inquiry mailbox itself; no third party emailed) exposed:

1. **IMAP body shape mismatch (blocking).** A plain `BODY[TEXT]` request did not
   return content on this hosted provider; bodies came back empty. Fixed by
   reading `BODYSTRUCTURE` and fetching the concrete numeric MIME part(s)
   (`text/plain`, else sanitized `text/html`) with a byte bound, decoding the
   transfer-encoding, never fetching attachments/embedded messages. Pure helpers
   in `email-accounts/domain/imap-body.ts` + unit tests.
2. **Stale API state.** `check-replies` reported the pre-transition state;
   fixed by reloading the draft after transitions so the response equals the DB.
3. **Fallback over-match.** The self-delivered copy of our own outbound matched
   via fallback; now any inbound whose Message-ID equals an outbound Message-ID is
   excluded, and localized reply prefixes (incl. `Ats.:`) are normalized.
4. **Unmatched-message privacy.** Unmatched messages are now persisted with
   bounded metadata only (`bodyText` empty, no evidence).

Verification after fixes: contracts 66, API 165, web 154; typecheck/lint clean;
build exit 0; `scripts/verify.sh` 60/0; `git diff --check` clean.

## Live smoke #2 (2026-09-24) — post-fix results

Second controlled RFQ (draft `867c8d27-7a50-44cb-b7b2-e8285b6fe05d`, lead
`MB Pirties meistrai` / Thermo Abachi Cladding, recipient
`tomas.berg@sapiensmetric.eu`), Message-ID
`<f5d84a6f-b726-4f9f-85d1-70d4d78307a3@sapiensmetric.eu>` (provider echoed the
same id). Reply carrying `In-Reply-To` = that id and explicit terms.

- Body text captured: **887 chars** (plain-text MIME part; includes the quoted
  original, as expected).
- Correlation: **HEADER** via `In-Reply-To`.
- Exactly **one** inbound link and **one** quote for the draft.
- Extracted (evidence-grounded): `priceText=1234.50 EUR`, `amount=1234.5`,
  `currency=EUR`, `priceUnit=m3`, `incoterm=FOB`, `leadTimeText=4 weeks`,
  `validityText=30 days`, `vatIncluded=false`, `warnings=[]`; MOQ captured as
  `25 m3, FOB Klaipeda.` (slightly greedy; acceptable, noted).
- API `marketResearchState` = DB status = `QUOTE_EXTRACTED` (match confirmed).
- Re-scan idempotent: `persisted=0 skipped=5`; totals unchanged.
- No unrelated mailbox body persisted: every UNMATCHED row has `length(body_text)=0`.
- The self-delivered copy of the new outbound was persisted as UNMATCHED
  **metadata only** (Message-ID = our outbound id, body 0, not linked) — i.e.
  excluded from matching; a possible follow-up is to skip persisting outgoing
  copies entirely.

### Test data

The two smoke drafts are marked in the UI subject as
`[TEST SMOKE - not a real supplier inquiry]`. Their linked test rows (outbound
`<9a61a275…>` / `<f5d84a6f…>`, the inbound/quote/evidence rows for those drafts)
are test-only. No production delete path exists and raw DB writes are not used,
so they are **marked and documented** rather than deleted. Unrelated data was
not touched; no mail was deleted, moved, or marked read.

### Final limitations (post-fix)

- MOQ extraction can over-capture to the end of the clause.
- Outgoing self-copies are stored as metadata-only UNMATCHED rows (not linked).
- IMAP `bodyParts`/BODYSTRUCTURE handling is now confirmed against this provider;
  other providers' structures are covered by unit tests but not yet live-tested.
