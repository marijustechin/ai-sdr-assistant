# Task: RFQ / price intelligence draft workflow

**Status:** ACCEPTED — committing to main (`feat(rfq): add market research price inquiry workflow`)
**Type:** delegation (implementation complete; human review passed)
**Scope:** `soft/` implementation + canonical docs

## Objective

Add a persisted, reviewable price inquiry (RFQ) draft linked to an eligible lead,
product/specification, selected published recipient, and sender identity, with a
small review UI. No outbound email is sent in this task.

## Deliverables

- Dedicated `PriceInquiryDraft` model + additive migration
  `20260922180000_add_price_inquiry_drafts`.
- New `price-inquiry` API module; shared `ContactDiscoveryService.selectRecipient`
  reused by `outreach-drafter` and `price-inquiry`.
- Contracts + guarded endpoints (create/list/get/patch).
- Web: `PriceInquiryPanel` on the lead detail page (create + editable review,
  explicit "Not sent — awaiting human review").
- Docs: decisions, module-map §20, data-governance, project-state, architecture,
  soft data-model/data-ownership.

## Acceptance criteria

- [x] Persisted RFQ draft with company/lead/opportunity, product, contact,
      recipient email, sender profile, subject/body, purpose, status, provenance.
- [x] Status starts `READY_FOR_HUMAN_REVIEW`; no `SENT` state; no send action.
- [x] Reuses outreach eligibility and recipient selection; sender must be active
      and linked to an email account.
- [x] Product/spec grounded in persisted data only; PENDING/RESTRICTED excluded.
- [x] Tests/typecheck/lint/verify/build green; no transport invoked.

## Verification

- contracts 61, API 124, web 152 tests pass; verify.sh 60/0; build exit 0.

## Blockers / notes

- No live send/read performed. Next task: approval-gated SMTP **sending** of a
  reviewed RFQ draft, then supplier-reply capture and quotation/price extraction.

## Completion record

Implementation complete 2026-09-22; workspace READY_FOR_HUMAN_REVIEW. No
commit/push. Full detail: `soft/tasks/done/2026-09-22-price-inquiry-rfq-drafts.md`.

## Finalization (2026-09-24)

Pre-commit review passed; no secrets, `.env`, credentials, logs, live mailbox
data, or temp artifacts in the change set (`.env`/`.env.local` are gitignored).
Invariants confirmed: both product sender fields optional and independent; no
inquiry→outreach fallback; outreach uses only `outreachSenderProfileId`; RFQ
defaults only to `inquirySenderProfileId` with explicit override validated;
sender company optional; closing from structured identity; no transport/send
path in `price-inquiry`. Migrations (in order)
`20260922180000` → `20260922220000` → `20260922240000` applied to `ai_sdr` and
`ai_sdr_test_api`. Verification: contracts 61, API 124, web 152; typecheck/lint
clean; production build exit 0; `scripts/verify.sh` 60/0; `git diff --check`
clean. Committed to main; no live send/read performed.

## Follow-up (same task)

- Sender profile: company/brand optional + optional role/title; generated RFQ
  closing built from structured identity (never the stored signature); draft
  `language` persisted for future locales (English implemented). Migration
  `20260922220000_sender_profile_optional_company_title`.
- Separate sender contexts per product: replaced the single
  `products.sender_profile_id` with `outreach_sender_profile_id` (buyer/sales
  outreach) and a new nullable `inquiry_sender_profile_id` (market-research
  price inquiries / RFQ). RFQ resolution: explicit selection → product inquiry
  sender → else `409 inquiry_sender_profile_required`; **never** the outreach
  sender. Buyer outreach uses only the outreach sender. Product create/edit now
  shows two clearly separate selects with helper text. Additive migration
  `20260922240000_product_split_sender_profiles`. No send/transport.
