# Task: First-contact refinement + canonical body/HTML consistency

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Refine first-contact draft quality (natural evidence personalization, no
proposition duplication, natural flow) and close the canonical-body/HTML
consistency gap so an edited plain-text body can never be paired with a stale
HTML body. No SMTP send / Sent-folder persistence.

## Completion record

### Generation refinements (`domain/content.ts`)

- **Natural personalization:** `naturalizeObservation` deterministically maps
  third-person observations (`sells …`, `The company builds …`, `works with …`)
  to natural "you …" clauses; unrenderable phrasing uses a neutral, evidence-safe
  fallback — the raw database fragment is never injected. Non-English scaffolds
  use an in-language neutral opener (no mixed-language fragment).
- **No proposition duplication:** `shouldIncludeCategory` includes the category
  only when it is not already represented in the offer wording (no
  "Thermo Abachi STD cladding (cladding)").
- **Natural flow:** personalization + proposition share one short paragraph;
  restrained terms + the single CTA share the next. Same information, no isolated
  template lines.
- Existing constraints kept: short; one CTA; no concrete price; no RFQ block.

### Canonical body + derived HTML

- New `outreach_drafts.canonical_body` (additive migration
  `20260925180000_outreach_draft_canonical_body`): the human-editable message
  text **without** the closing/signature.
- `composeOutreachBodies(language, canonicalBody, identity)` derives the sendable
  plain-text `body` and the `htmlBody` (HTML paragraphs + optional logo +
  structured signature) from the canonical body; used at generation and revision.
- New `PATCH /opportunities/:id/leads/:leadId/outreach-drafts/:draftId`
  (`ReviseOutreachDraftSchema`) applies a human revision: it rebuilds both derived
  bodies from the draft's stored structured sender snapshot and creates a new
  append-only version — the previous version and its HTML are preserved.
- Exact approved send snapshot: `subject` + `body` + `htmlBody` + `canonicalBody`
  + sender identity snapshot + recipient + language + provenance/evidence refs.
  Transport performs zero content generation at send time.

### Tests / verification

- API **214**: `outreach-content.spec.ts` (19) covers naturalization +
  fallback, category dedup, flow, no price/superlatives/RFQ, single CTA,
  structured closing, WhatsApp/logo, determinism, and canonical↔derived
  consistency (re-composing an edited body changes both derived outputs; the old
  HTML can never remain paired). `outreach-drafts-api.spec.ts` adds a revision
  test proving the edited draft's plain text and HTML are both regenerated.
- Contracts **76**, database **17**, web **174**; typecheck/lint/build,
  `verify-docs`, `verify.sh`, `git diff --check` green.

### Known limitations / ambiguity

- Non-English templates (lt/lv/et) use a neutral in-language personalization
  opener (the observation is not rendered) to avoid mixing languages; a
  language-specific observation naturalizer is future work. LT wording reviewed;
  no "team" suffix is appended to a local company label.
- No separate web editing control yet — the canonical-body/revision API is the
  single editable source; a UI editor can call it.
