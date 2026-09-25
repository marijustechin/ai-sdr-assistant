# Task: Human outreach eligibility decisions + structured sender identity

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Keep Market Research factual while letting a human prevent certain
companies/leads from being used for outreach (Part A), and reshape sender
identity around structured fields with locale-safe closing composition (Part B).
Buyer outreach behaviour stays intact except for the new human exclusion gate.
No SMTP sending and no Sent-folder IMAP append.

## Completion record

### Data model changes

- New `outreach_decisions` (owner `outreach-drafter`): scoped to one
  `(opportunity, company)` pair; `decision` ∈ `ELIGIBLE | DO_NOT_CONTACT |
  EXISTING_RELATIONSHIP | NOT_RELEVANT | ALREADY_CONTACTED`, optional `note`,
  explicit human provenance (`decided_by_kind` = `HUMAN`, `decided_at`),
  unique `(opportunity_id, company_id)`.
- `sender_profiles` gains `phone` (varchar 64) and `website` (varchar 2048);
  `signature` retained but marked deprecated.
- Migration `20260925150000_outreach_decisions_and_sender_contact_fields`
  (additive; enums + table + two columns). Manual rollback in the migration.

### API / UI changes

- `GET/PUT /opportunities/:id/leads/:leadId/outreach-decision` (guarded):
  read/set the human decision; every write records `HUMAN` + `decidedAt`.
- `POST .../outreach-drafts` now rejects with `409 lead_excluded_from_outreach`
  (carrying the decision) for any excluding state; existing drafts are flagged
  stale (`Excluded from outreach by a human decision (...)`) when the decision
  changes. `ELIGIBLE` records no exclusion and does not bypass qualification.
- `sender_profiles` create/update/read accept and expose `phone`/`website`.
- Web: a compact **Outreach decision** control on the lead detail page
  (`features/manage-outreach-decision`), a `lead_excluded_from_outreach` error
  message, and the sender form now exposes phone/website plus an
  "Advanced / custom override" section for the deprecated signature (stale RFQ
  wording removed).

### Exclusion precedence rules

- `ELIGIBLE` → no exclusion (normal qualification gate still applies).
- Any other state → hard block that **overrides** agent qualification and
  operator review; `DO_NOT_CONTACT`/`EXISTING_RELATIONSHIP` (and the other two)
  cannot reappear as a draftable candidate for the same scope.
- Scoped to one opportunity+company (not a global blacklist); research evidence,
  companies and offerings remain visible and unchanged.

### Sender-profile / signature rules

- Closing phrase is generated from the message language (existing scaffolds).
- Signature block composed only from structured fields: sender name, canonical
  role/title, company, phone, website. Name/company/phone/website are never
  invented or translated.
- A canonical role/title is emitted **verbatim**; it is never machine-translated
  (translating free-text titles can change seniority/meaning).
- Free-text `signature` no longer participates in generation, fingerprinting or
  staleness; the persisted draft snapshot carries the structured fields only.

### Tests and verification

- Contracts: **73 passed** (new outreach-decision contract test; sender-profile
  phone/website cases).
- API: **197 passed** (new `outreach-decisions-api.spec.ts` incl. exclusion
  precedence and scope; `outreach-content.spec.ts`; sender-profile phone/website
  case).
- Web: **169 passed** (decision labels/exclusion helper; sender payload
  phone/website; updated fixtures).
- Typecheck (contracts/API/web), lint (API/web), web build, `verify-docs`,
  `verify.sh`, `git diff --check` — see the completion report in the chat.

### Known limitations / ambiguity

- Scope is opportunity+company (the lead). A company is **not** globally
  blacklisted; the same company in a different opportunity is unaffected by
  design. If product-wide exclusion is wanted later, that is a separate scoped
  decision.
- `ELIGIBLE` intentionally does not override an agent `DISQUALIFIED`/
  `NEEDS_MORE_EVIDENCE`; only exclusion overrides the agent gate (as specified).
- Role/title localization is intentionally disabled because titles are free
  text; a future structured title enum could enable safe localization.
- `signature` remains in the schema for compatibility; a future migration may
  drop it once no consumer relies on it.
