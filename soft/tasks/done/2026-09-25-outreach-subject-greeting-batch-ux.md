# Task: First-contact subject/greeting rules + unambiguous batch UI

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Fix first-contact subject/greeting rules (LT/EN) and make multiple outreach
batches distinguishable, with an understandable funnel and cancel/archive
support. No change to SMTP/Sent-copy/idempotency; no live email.

## Completion record

### Subject rules

- Removed template subjects ("A quick question about …", "Trumpas klausimas
  apie …", etc.).
- EN: concise restrained subject = offer (+ category only if it adds info), e.g.
  `Thermo Abachi cladding`.
- LT: `Dėl {offer}{ localized category }`, e.g. `Dėl Thermo Abachi dailylenčių`,
  via a **bounded, curated** LT category map (cladding→dailylenčių, et al.).
  Official product names are never translated; an unknown category is omitted
  (no leaked English label). LV/ET use restrained equivalents.
- No attention-tactic words, no `?`.

### Greeting semantics

- A company name is never used as a recipient name. Without a known named
  contact: `Hello,` (EN) / `Sveiki,` (LT); LV/ET equivalents. A real named
  contact may be addressed (`Hello Jane Buyer,` / `Sveiki, Jonas Pirkėjas,`).
  The drafter passes `recipientName` only for a `NAMED_PERSON` contact with a
  published `personName`; names/responsibility are never invented.

### Batch identity + funnel

- The batch section lists **all** batches per opportunity; each block shows a
  short stable id (`#xxxxxxxx`), creation time, language/target market, sender
  profile, status, and opportunity/product.
- Funnel counts: lead candidates, draftable (qualified), rejected/not-qualified/
  stale, excluded by human decision, without usable recipient, generated drafts
  (+ send-state counts). A note clarifies Market Research findings ≠ outreach-
  ready leads; unsupported upstream counts are not fabricated.

### Cancel / archive

- New `POST .../:batchId/cancel` (owner-mediated): cancels queued rows and sets
  `CANCELLED`; cancelled batches are hidden behind a "Show archived/cancelled"
  control and are never startable/sendable. Nothing is hard-deleted.

### Tests / verification

- Content tests **29** (5 new: EN/LT subject, unknown-category omission,
  named-contact greeting, company-only neutral greeting).
- Full suite numbers and verification results are reported in the completion
  report. No live email activity.

### Known limitations

- The funnel shows counts the model supports (leads, decisions, recipients,
  drafts); distinct research companies/offerings are not counted here and the
  boundary is stated in the UI.
- Batches are listed per opportunity; there is no cross-opportunity archive view.
