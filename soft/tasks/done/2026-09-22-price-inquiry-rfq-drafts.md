# Task: Price inquiry (RFQ) draft workflow

**Status:** COMPLETE (ready for human review — no email sent, no transport invoked)

## Objective

Add a persisted, reviewable price-inquiry / RFQ draft linked to an eligible lead,
product/specification, selected published recipient, and sender identity, with a
small review UI. No outbound email.

## Completion record

### 1. Files created/changed

**Database**
- `packages/database/prisma/schema.prisma`: `PriceInquiryDraft` model + enums
  `PriceInquiryPurpose`, `PriceInquiryStatus`; back-relations on Opportunity,
  OpportunityCompany, Company, Product, Contact, SenderProfile, EmailAccount.
- `packages/database/prisma/migrations/20260922180000_add_price_inquiry_drafts/migration.sql`.

**Contracts**
- `packages/contracts/src/price-inquiries.ts` (+ `index.ts`); tests
  `packages/contracts/test/price-inquiries-contracts.spec.ts`.

**API (new `price-inquiry` module)**
- `domain/types.ts`, `domain/content.ts` (deterministic content/spec builder),
  `infrastructure/price-inquiry.repository.ts`, `application/price-inquiry.service.ts`,
  `presentation/price-inquiry.controller.ts`, `price-inquiry.module.ts`; `app.module.ts`.
- Recipient selection extracted from `outreach-drafter` into the owner module:
  `ContactDiscoveryService.selectRecipient` (reused by outreach and RFQ).
- Tests: `test/price-inquiry-api.spec.ts`; `test/helpers/database.ts` (truncate list).

**Web**
- `entities/price-inquiry/{types,display,display.test,api,index}.ts(x)`.
- `features/manage-price-inquiry/{server.ts,actions.ts,price-inquiry-panel.tsx,index.ts}`.
- Lead detail page integrates the panel (loads RFQ drafts + usable sender profiles).

**Docs**
- `docs/system/{decisions,module-map,data-governance,project-state,architecture}.md`,
  `soft/docs/{data-model,data-ownership}.md`.

### 2. Migration

`20260922180000_add_price_inquiry_drafts` (additive; no backfill). Applied to dev
+ test DBs via `psql` and recorded (Prisma schema-engine is Device-Guard-blocked
on this host).

### 3. Endpoints/contracts

- `POST /opportunities/:id/leads/:leadId/price-inquiry-drafts` (create; idempotent by fingerprint)
- `GET  /opportunities/:id/leads/:leadId/price-inquiry-drafts` (list)
- `GET  /opportunities/:id/leads/:leadId/price-inquiry-drafts/:draftId`
- `PATCH /opportunities/:id/leads/:leadId/price-inquiry-drafts/:draftId` (editable subject/body/recipient/sender)
- Contracts: `CreatePriceInquiryDraftSchema`, `UpdatePriceInquiryDraftSchema`,
  `PriceInquiryDraftResponseSchema` (+ sender snapshot).

### 4. Commands run and results

- contracts test → 10 files / 60 passed.
- api test (with `TEST_DB_SKIP_MIGRATE=1`) → 20 files / 118 passed.
- web test → 28 files / 148 passed.
- `-r typecheck` and `-r lint` → all Done.
- `scripts/verify.sh` → 60/0. production build → exit 0.

### 5. Test/verification evidence

Eligible lead → draft; rejected/stale/not-eligible → 409; named purchasing contact
preferred; general-email fallback; unusable recipient → 400; unknown product → 400;
sender required / not-linked → 409; product's assigned profile used by default;
persisted CONFIRMED+OPERATIONAL facts appear; PENDING/RESTRICTED values never
appear; status `READY_FOR_HUMAN_REVIEW`; no send metadata; secrets absent;
idempotency; editable fields with generated original preserved.

### 6. Known limitations

- No sending (by design); English-only draft.
- Recipient selection is reused from contact-discovery; a named contact is
  preferred only when its **published** title matches purchasing keywords.
- `sender_profile_not_linked` blocks RFQ until the sender profile references an
  email account.

### 7. Decisions / next task

- Decision recorded in `docs/system/decisions.md` (2026-09-22, RFQ drafts).
- Next task: approval-gated actual SMTP **sending** of a reviewed RFQ draft, then
  inbound supplier-reply capture and quotation/price extraction (see decision).

## Follow-up adjustments (same task): company/title optional, generated closing, locale

- **Sender profile:** `companyName` is now nullable and an optional `senderTitle`
  (role/title) was added (migration `20260922220000_sender_profile_optional_company_title`).
  A profile is fully usable with only sender name + From email + (for RFQ) a linked
  mailbox. Existing profiles with a company are unchanged.
- **Closing:** RFQ generation no longer reads the stored `signature`. The closing is
  built from structured identity (`Best regards,` + sender name + optional
  role/title + optional company), each line at most once; no company is invented.
  The stored signature remains optional on the profile for special cases.
- **Locale:** the RFQ draft persists `language`; the generator resolves it to an
  implemented locale (English only today; `de`/`fi`/`lt` are accepted by the
  contract and resolve to English until implemented). Greeting/request/closing
  always share one language. Closing text is template data, not profile identity.
- Tests added for: sender without company/brand valid; no company claim when
  absent; company/title each exactly once; language persisted; English greeting +
  closing; existing profiles with company remain valid.

### Updated example RFQ (sender without company, with a role/title)

Sender: **Tomas Berg**, role **Sourcing & Procurement**, no company.

Subject: `Price inquiry: Abachi`
```
Dear Jane Buyer,

We would like to request a quotation for the following product / specification:

Product: Abachi
Species / material: Triplochiton scleroxylon
Category: Timber
Grade: A/B
Thickness: 25 mm

Please quote:
1. your current price;
2. the pricing unit (e.g. m³, m², piece, pack);
3. the minimum order quantity (MOQ);
4. the Incoterm;
5. the loading / dispatch location;
6. the lead time / availability;
7. whether VAT is included;
8. the quotation validity.

Best regards,
Tomas Berg
Sourcing & Procurement
```
(No company line. The previously incorrect
`Example Sourcing / Sourcing Desk / Example Sourcing` footer is gone.)

## Follow-up (same task) — separate outreach vs inquiry sender contexts

**Why:** the single `products.sender_profile_id` implied one product sender for
two distinct communication purposes. Buyer/sales outreach and market-research
price inquiries (RFQ) to suppliers must never share one implicit identity.

**Migration strategy (additive, no data loss).** The existing column is a
`RENAME`, not a drop/recreate, so current assignments are preserved:

- `ALTER TABLE products RENAME COLUMN sender_profile_id TO outreach_sender_profile_id`
  (plus the FK constraint + index renamed to match).
- `ADD COLUMN inquiry_sender_profile_id UUID` (nullable) + index + FK to
  `sender_profiles(id) ON DELETE SET NULL`.
- Migration `20260922240000_product_split_sender_profiles`; rollback noted in the
  SQL. Applied to `ai_sdr` and `ai_sdr_test_api` via psql and recorded in
  `_prisma_migrations` (schema-engine remains blocked by Device Guard).

**Final product fields.** `outreachSenderProfileId String?` and
`inquirySenderProfileId String?` — both optional, each independently assignable
(neither / outreach only / inquiry only / both). Both validated through
`sender-profiles` (unknown → `400 sender_profile_not_found`); no silent default.

**RFQ sender resolution order.** explicit `senderProfileId` (validated) → else the
product's `inquirySenderProfileId` → else `409 inquiry_sender_profile_required`.
Never falls back to the outreach sender. The resolved profile is persisted on the
draft (`sender_profile_id` + `email_account_id` + non-secret snapshot) as before.

**Outreach sender behaviour.** `outreach-drafter` reads only
`outreachSenderProfileId`; the inquiry sender never affects buyer outreach.

**UI.** Product create/edit now shows two clearly separate selects — *Outreach
sender profile* and *Inquiry sender profile* — each optional, with helper text
stating each purpose and that inquiry senders must be linked to an email account.
The lead-page RFQ panel defaults to the product's **inquiry** sender.

**Tests.** Product assignment: neither / outreach-only / inquiry-only / both /
clear-one-keeps-the-other / unknown-inquiry rejected. RFQ: defaults to inquiry
sender; **does not** use outreach when inquiry is missing
(`inquiry_sender_profile_required`); explicit selection overrides the product
inquiry sender; buyer outreach continues to use the outreach sender only.
Contracts/web payload-mapper tests updated for the two-field shape. Results:
contracts 61, API 124, web 152 pass; typecheck/lint clean; verify.sh 60/0; build
exit 0.

**Files.** `schema.prisma`; migration
`20260922240000_product_split_sender_profiles`; API `products-and-offers`
(domain/repository/service), `outreach-drafter.service.ts`, `price-inquiry`
service; contracts `products.ts` + `price-inquiries.ts`; web `lib/products`
(schema/payload/mappers + tests), `components/products/product-form.tsx`,
lead detail page. Docs: `decisions.md`, `module-map.md` (§17/§20),
`data-governance.md`, `project-state.md`, `soft/docs/{data-model,data-ownership}.md`.
