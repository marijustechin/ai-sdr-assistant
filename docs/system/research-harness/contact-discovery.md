# Contact Discovery — Source-Backed Business Contacts

**Status:** Canonical operating procedure (O-020, 2026-09-18). Entry point:
[`AGENTS.md`](AGENTS.md).
**Applies to:** turning **shortlisted** potential-buyer leads into a sourced
contact list. This is a research-role procedure; it is not the
`contact-discovery` module implementation and not a data store.

A contact record is **public business contact information published on a
source** for a company we already have as a lead. Finding an address does **not**
establish that it works or that the recipient handles purchasing.

---

## 1. Eligibility (automation-first)

Contact discovery does **not** require a human shortlist. Within the approved
scope, tool permissions and execution limits, the agent advances autonomously:
it **qualifies candidates itself** against documented, evidence-backed criteria
(§2) and then discovers contacts. Human review is an **optional override**, not
a required step.

A candidate is **eligible for contact discovery** when it is **not explicitly
rejected by a human**, **not resting on superseded evidence**, and is **either
agent-qualified** or **human-shortlisted**:

- `reviewStatus = UNREVIEWED` — the agent may assess and qualify it.
- `reviewStatus = SHORTLISTED` (human) — an additional eligibility path.
- `reviewStatus = REJECTED` (human) — **always wins**; do not qualify or
  discover contacts for it.
- Agent qualification is recorded separately
  (`agentQualificationStatus` + `agentQualificationReason`) and **never writes
  the human review fields**.

Also required:
- The company exists as a lead (`opportunity_companies`); company identity is
  established by the lead's buyer-fit evidence (name, website, country). If
  identity is uncertain, resolve it before recording any contact.
- A contact-discovery authorization exists **for this activity** (see §5).

## 2. Agent qualification criteria (documented, product-fit, evidence-backed)

`QUALIFIED` means **suitable for contact discovery for this specific product**,
based on the lead's **CURRENT** supporting claim/evidence: an evidenced
activity/role that plausibly **buys or uses the product** (e.g. builds, installs,
specifies, distributes or retails **it**, or a product-adjacent use). It does
**not** mean confirmed demand, purchasing intent, or an established customer.
A **generic trade role alone is insufficient** — record the product-fit
rationale in `agentQualificationReason`, naming the evidence relied on.

Otherwise record `NEEDS_MORE_EVIDENCE` (insufficient, ambiguous, or a stale
basis) or `DISQUALIFIED` (evidence contradicts eligibility, or the candidate is
clearly out of scope). A candidate whose supporting claim is **not `CURRENT`** is
at most `NEEDS_MORE_EVIDENCE`, and any prior qualification is **stale** until
reassessed. Never treat a seller/competitor status as purchasing intent, and
never invent demand, contacts or scores.

**Stale evidence.** When a supporting finding is replaced or retracted, the
agent's prior qualification is invalidated on read (`agentQualificationStale`)
and contact-discovery eligibility is removed; re-qualifying is refused until a
current basis exists. Reassess from the corrected evidence, then qualify again
if product fit holds. A human rejection and the claim-correction safeguards are
never overridden by this.

## 2. Procedure

1. **Select eligible candidates** (§1): agent-qualified or human-shortlisted,
   never a human-rejected candidate.
2. **Inspect official pages first.** Prefer the company's own
   contact/impressum/team pages (and its official profiles linked from there),
   in the local language where relevant. A third-party directory is a fallback,
   not the first choice.
3. **Verify company identity.** Confirm the page belongs to the same legal
   entity (registered name, address, registration/VAT id where shown). Never
   attribute a contact to a similarly named company or to a company that merely
   ships to the market.
4. **Persist only what the source states.** Record email, phone, contact-page
   URL; add a named person **only with the job title the source explicitly
   publishes**. Distinguish a **general company** contact from a
   **named-person** contact. Send every contact with its own source URL,
   retrieval date, and a short supporting excerpt.
5. **Preserve values exactly.** Do not normalise into the stored value;
   normalisation is server-side and only for comparison/deduplication. Never
   invent an email pattern (`first.last@`, `info@`), a person name, a job title,
   or a phone country code. If a channel is not published, leave it absent.
6. **Record unknowns explicitly.** "No named contact", "role/purchasing
   responsibility unknown", "deliverability not checked" are findings, not gaps
   to fill by guessing.
7. **Mark outdated/incorrect contacts unusable** (do not delete): set the
   contact's usability to `UNUSABLE` with a reason, keeping its provenance.
8. **Report gaps.** No contact page, form-only contact, login-walled or blocked
   pages, and unverifiable identity are reported as gaps.

## 3. What a contact may and may not carry

- **May carry:** general company email/phone/contact-page URL; a named person
  with an explicitly published title; the source URL, retrieval date and
  excerpt; explicit unknowns; a deliverability state.
- **May not carry:** guessed addresses, private/individual data not published by
  the company for business contact, or a claim that an address is deliverable
  when it has not been separately verified.

## 4. Separation from the completed research run

Contact discovery is a **separate, bounded activity**. It does **not**
reopen a completed market-research run and does **not** attach new evidence to
that run's sources/evidence/claims/offerings. Contact provenance lives with the
contact (`source_references` deduplicated by URL + the contact's own
`contact_sources` rows), independent of any `research_runs` row. The lead's
original buyer-fit evidence is never overwritten.

## 5. Cost, tools and authorization

- **Do not silently inherit authorization for paid tools.** A research
  request's `FREE_ONLY`/`METERED_APPROVED` decision (and any provider call
  limits) governs that research run only. Contact discovery needs its **own**
  explicit authorization; assume no paid tool is authorized unless the operator
  says so for this activity.
- Under a free-only authorization, only tools with an established free tier
  (Exa; Firecrawl Search/Scrape) are permitted, and provider quotas are finite —
  pause and report rather than retry aggressively.
- Never purchase a plan, enable overage, subscribe, or change billing.

## 6. Hard prohibitions

- No emails, calls, contact-form submissions, mailbox/deliverability probes, or
  subscriptions of any kind.
- No outreach and no commercial commitment.
- No inventing, guessing or "completing" contact data.
- No mutation of companies, leads or review states as part of contact discovery
  beyond the contact rows themselves and the contact usability field.
- No writing Markdown as live state; contacts live in PostgreSQL through the
  guarded API.

## 7. Recovering a stale qualification (not yet a first-class flow)

When a supporting finding is replaced or retracted, the agent qualification
becomes **stale** (`agentQualificationStale`), contact-discovery eligibility is
removed, and re-qualifying is refused (`lead_claim_not_current`) until a current
basis exists.

There is **no purpose-built reassessment/recovery flow today**. What the existing
API allows, and its limits:

- Updated evidence must come from research. Attach it to a **new** research run
  for the opportunity (or rely on a CURRENT replacement claim already held by the
  run the lead references). **Do not reopen or append to a completed research
  run.**
- A lead's provenance can be refreshed by re-submitting it via
  `POST /opportunities/:opportunityId/leads` with the CURRENT `researchRunId` +
  `evidenceId` (+ `claimId`); this is idempotent per company/opportunity.
- Re-submitting with a CURRENT claim clears staleness on read, after which the
  agent can re-qualify (record a fresh product-fit reason).

**Recorded limitation (bounded backlog item — not implemented).** Re-submitting a
lead with a replacement claim does not by itself force a fresh assessment, so a
prior agent qualification can be re-validated without an explicit reassessment.
A first-class recovery flow — attach updated evidence and **require** an explicit
re-qualification, refusing to silently re-enable a stale assessment — is **not
built** and is tracked in `ops/backlog.md`. This document does not claim recovery
is implemented.
