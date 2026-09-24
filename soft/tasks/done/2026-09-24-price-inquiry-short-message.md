# Task: Simplify the default Market Research price-inquiry message

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-24
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Replace the formal, over-structured RFQ body with a short, natural first-contact
email that maximizes reply probability, while keeping content grounded in
persisted data and preserving downstream quote extraction.

## Completion record

### Content-generation changes

`price-inquiry/domain/content.ts`:

- Replaced the numbered 8-field procurement checklist with a short message:
  greeting; one sentence ("I found {product} on your website and would like to
  ask about the current price."); up to two clarifications (pricing unit and/or
  MOQ) only when not already on record; a simple "I look forward to your reply.";
  and a closing from structured sender identity.
- Introduced `assessPriceInquiryClarifications(facts)` (pure): asks the pricing
  unit only when no unit is on record, and MOQ only when no MOQ is on record,
  using `CONFIRMED + OPERATIONAL` facts only. `PENDING`/`RESTRICTED` are ignored.
- `LocaleTemplate` now holds the message sentences, topics, joiner, found-phrase,
  follow-up and closing, so `lt`/`de`/`fi` can be added without restructuring.
  English remains the only implemented locale; an unimplemented request resolves
  to `en` and the resolved locale is what is reported (no mislabelling).
- `buildSpecification` (the grounded `specificationSummary`) is unchanged and
  still persisted on the draft for audit; it is no longer pasted into the email.

`price-inquiry/application/price-inquiry.service.ts`: passes the assessed
clarification flags; no longer passes the specification lines into the body.

Downstream send/IMAP/quote matching/polling/extraction were **not** changed; a
shorter inquiry does not weaken parsing (suppliers may still volunteer any terms;
missing fields remain unknown).

### Before / after

Before:
```
Hello,

We would like to request a quotation for the following product / specification:

Product: Thermo Abachi Cladding
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

After:
```
Hello,

I found Thermo Abachi Cladding on your website and would like to ask about the current price.

If possible, please also let me know the pricing unit and the minimum order quantity.

I look forward to your reply.

Best regards,
Tomas Berg
Sourcing & Procurement
```
(The clarification sentence is omitted entirely when both a pricing unit and an
MOQ are already on record; the company line is omitted when no company is
configured.)

### Tests

- New `test/price-inquiry-content.spec.ts`: concise structure; no numbered
  checklist and no follow-up-only fields; pricing-unit question only when
  unknown; MOQ question only when unknown; clarification omitted when nothing is
  left to ask; no invented company/volume/destination/urgency/authority; sender
  closing correct and each identity line once; company omitted when absent; named
  recipient; locale labelling; `assessPriceInquiryClarifications` from facts
  (unit known, price-with-unit, MOQ known, PENDING/RESTRICTED ignored);
  `buildSpecification` still grounded.
- Updated `test/price-inquiry-api.spec.ts` integration assertions for the short
  body while confirming the grounded `specificationSummary` still carries the
  persisted attributes and excludes PENDING/RESTRICTED.

Results: contracts 66, API 182, web 154; typecheck/lint clean; build exit 0;
`scripts/verify.sh` 60/0; `git diff --check` clean. No live send/read performed.

### Files changed

- `soft/apps/api/src/modules/price-inquiry/domain/content.ts`
- `soft/apps/api/src/modules/price-inquiry/application/price-inquiry.service.ts`
- `soft/apps/api/test/price-inquiry-content.spec.ts` (new)
- `soft/apps/api/test/price-inquiry-api.spec.ts`
- `docs/system/{decisions,module-map,project-state}.md`
- `ops/current.md`

### Limitations

- English is the only implemented locale (structured for future locales).
- The "where found" phrase is generic ("your website"); no page URL is asserted.
- Clarification detection is a deterministic heuristic over fact keys/units
  (no NL understanding); it only ever decides whether to ask, never invents data.
- No change to extraction: unmatched/partial quotes still leave fields null.
