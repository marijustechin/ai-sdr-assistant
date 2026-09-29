# Task: First-contact outreach generation rules

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Rework `outreach-drafter` first-contact generation so the initial buyer email
opens a conversation rather than delivering the offer: evidence-backed
personalization, one product proposition, restrained commercial-terms wording, a
single low-friction CTA, no concrete price and no spec/RFQ dump. No SMTP send and
no Sent-folder persistence.

## Completion record

### Generation rules implemented (domain `content.ts`)

Per message language (`en`/`lt`/`lv`/`et`; English fallback):
1. greeting;
2. one evidence-backed personalization sentence from the lead's stored
   `observedActivityText`;
3. one product proposition = offer name (+ optional stored product category);
4. one restrained commercial-terms line: "We offer competitive B2B terms —
   current pricing depends on quantity and specification.";
5. exactly one CTA question: "Would this be relevant for your product range?";
6. localized closing phrase + structured sender signature.

The service passes `productCategory` from the Research Context
(`context.product.category`); nothing else is invented.

### Example (English, Thermo Abachi / sauna reseller)

```
Hello Example Sauna Reseller team,

I came across your company — sells thermo-treated sauna cladding

We supply Thermo Abachi STD cladding (cladding) and would be glad to share more.

We offer competitive B2B terms — current pricing depends on quantity and specification.

Would this be relevant for your product range?

Best regards,
Jane Doe
Sales Manager
Premium Timber Hub
+370 600 00000 · WhatsApp
premiumtimberhub.eu
jane@acme.invalid
```

### Persisted snapshot contents

`outreach_drafts` row (materialized, versioned, idempotent by fingerprint):
`subject`, `body` (plain text), `htmlBody` (HTML), `recipientEmail`, `language`,
`senderProfileId` + `emailAccountId` + `senderSnapshot` (structured identity incl.
WhatsApp/logo fields), `contextVersion`, `evidenceId`/`claimId`/`sourceReferenceId`,
`rationale`/`recipientRationale`, `missingFields`, `version`. Sending must use the
exact approved snapshot; transport never regenerates it.

### Evidence use

Personalization and the proposition come only from persisted data: the lead's
evidence-backed observation, the offer name, and the optional stored product
category. No recipient interest/intent, purchasing responsibility, relationship,
or certification is asserted.

### Explicitly forbidden (first contact)

Concrete price by default; superlatives/guarantees ("cheapest"/"best price"/
"lowest price"/"guaranteed"); spec dumps; MOQ/Incoterm/lead-time/validity blocks;
multiple questions; RFQ/procurement styling; invented interest/intent/
responsibility/relationship/certification.

### Tests / verification

- API **209** (new `outreach-content.spec.ts` 15 tests: personalization,
  no-invented-interest, no-price, restrained wording, single CTA/no questionnaire,
  structured closing, WhatsApp fallback/separate/off, logo off/on/no-URL,
  determinism; `outreach-drafts-api.spec.ts` asserts the persisted snapshot has
  subject/text/HTML/sender/recipient, evidence personalization, exactly one `?`
  and no concrete price).
- Contracts **76**, database **17**, web **174**; typecheck/lint/build,
  `verify-docs`, `verify.sh`, `git diff --check` green.

### Remaining ambiguity before real send

- "One or two meaningful product advantages" is left out by default: there is no
  structured, evidence-safe advantage field beyond the offer name and category;
  dumping raw `product_facts` would risk an unsupported spec dump. A future
  structured "positioning/benefit" fact could enable a bounded advantage line.
- CTA wording is a fixed localizable template; per-lead CTA variation is not
  implemented.
