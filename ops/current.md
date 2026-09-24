# Task: Market Research quote collection (RFQ send + bounded reply capture + quote extraction)

**Status:** READY_FOR_HUMAN_REVIEW
**Type:** delegation (implementation complete; live smoke passed; awaiting human review)
**Scope:** `soft/` implementation + canonical docs

## Objective

Implement the controlled market-research supplier quote-collection loop:
approve/send a reviewed RFQ from the draft's resolved **inquiry** sender, persist
immutable outbound metadata, poll the inquiry mailbox in a bounded read-only way,
associate a supplier reply with its RFQ, persist the reply safely, extract
structured quotation fields with evidence provenance, and reflect the state.
No final market-price summary, no bulk/automatic sending, no background polling,
no attachment parsing, no mail deletion/move. No commit/push.

## Deliverables

- New module `quote-collection` owning `quote_outbound_messages`,
  `quote_inbound_messages`, `supplier_quotes`; migration
  `20260924200000_add_quote_collection` (additive; `PriceInquiryStatus` gains
  `SENT`/`REPLY_RECEIVED`/`QUOTE_EXTRACTED`).
- `email-accounts` transport ports (`OutboundMailPort`/`InboundMailPort`) + SMTP
  send / bounded IMAP reply adapters; password decrypted only inside the port.
- `price-inquiry` owner-only status transitions (`markSent`,
  `markReplyReceived`, `markQuoteExtracted`).
- Contracts `quote-collection.ts` + extended `PriceInquiryStatus`.
- Web: RFQ panel send (confirmed) / check-replies actions + read-only collection
  display; new `entities/quote-collection`.

## Acceptance criteria

- [x] Send only from `READY_FOR_HUMAN_REVIEW`, explicit `confirm: true`, from the
      draft's **inquiry** sender; sender ACTIVE + linked; recipient present;
      immutable sent snapshot + preserved Message-ID; safe failure code;
      duplicate send prevented.
- [x] Bounded IMAP scan; header correlation first, bounded fallback only when
      unique; ambiguous replies left unlinked; idempotent by mailbox uid.
- [x] Reply persisted with provenance; fields extracted only from evidence;
      unknown → null; warnings recorded.
- [x] Research linkage via run evidence; no normalized market price.
- [x] Tests/typecheck/lint/build/verify green; no live I/O in tests.

## Verification

- contracts 66, API 153, web 154 tests pass; typecheck/lint clean; build exit 0;
  `scripts/verify.sh` 60/0; `git diff --check` clean.

## Blockers / notes

- No live send/read performed. Next task: convert faithfully-persisted supplier
  quotes into normalized `ResearchOffering`/price intelligence and a
  market-price summary (explicitly out of scope here).
- The IMAP adapter's exact `bodyParts`/headers shape should be confirmed in the
  controlled live smoke step below before relying on it in production.

## Controlled live steps (require explicit human confirmation; not run here)

1. Create an ACTIVE email account for the inquiry mailbox with SMTP + IMAP
   settings and a stored password (`EMAIL_SECRETS_KEY` set on the API).
2. Link an ACTIVE inquiry sender profile to that account; assign it as the
   product's `inquirySenderProfileId`.
3. Create an RFQ draft for a qualified lead + that product, review the
   subject/body, then **Send price inquiry** and confirm. Expect
   "Submitted to outgoing SMTP server" and a stored Message-ID.
4. Have the supplier reply to that message.
5. Click **Check for replies**. Expect the reply matched by headers and a
   structured quote extracted (nulls/warnings where the reply is silent).

## Controlled live smoke (executed 2026-09-24)

Two controlled send/reply cycles against the inquiry mailbox
(`tomas.berg@sapiensmetric.eu`, recipient = the operator-controlled mailbox
itself; no third party emailed), per explicit human approval.

- Smoke #1 exposed and drove fixes for: IMAP body shape (`BODY[TEXT]` empty →
  BODYSTRUCTURE + numeric part fetch), stale `check-replies` state, fallback
  over-match on the outgoing copy, and unmatched-body privacy.
- Smoke #2 (post-fix): reply captured (**887 chars**), **HEADER** match via
  `In-Reply-To`, exactly one inbound link + one quote, fields extracted
  (`1234.5 EUR`, `m3`, `MOQ 25 m3`, `FOB`, lead `4 weeks`, valid `30 days`,
  VAT excluded, no warnings), API state = DB state = `QUOTE_EXTRACTED`, re-scan
  idempotent (`persisted=0 skipped=5`), no unrelated body persisted
  (UNMATCHED bodies length 0).
- Both smoke drafts are marked `[TEST SMOKE - not a real supplier inquiry]`;
  their rows are test-only, marked + documented (no production delete path; no
  raw DB writes). No mail deleted/moved/marked-read.

Full detail: `soft/tasks/done/2026-09-24-quote-collection.md`.

## Completion record

Implementation complete 2026-09-24; workspace READY_FOR_HUMAN_REVIEW. No
commit/push. Full detail: `soft/tasks/done/2026-09-24-quote-collection.md`.
