# Task: Outreach decision is opportunity+company scoped (research-first)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Let a human record the outreach decision directly from the Companies and
offerings Market Research results, before/without a lead, with the decision
genuinely scoped to `(opportunity, company)` rather than requiring a `leadId`.
One authoritative record per `(opportunity, company)`; the drafting gate reads
the same record.

## Completion record

### API

- Canonical: `GET/PUT /opportunities/:id/companies/:companyId/outreach-decision`.
- Convenience: `GET/PUT /opportunities/:id/research-offerings/:offeringId/outreach-decision`
  — resolves the offering's company from `companyText`/`companyLocationText`
  (read-only on GET; get-or-create on PUT) and stores the same record.
- Removed the lead-scoped routes; the lead detail now uses the company route.
- `EvidenceService.getOffering(opportunityId, offeringId)` verifies the offering
  belongs to the opportunity's runs.
- `LeadDiscovererService.resolveCompanyByName` / `ensureCompanyByName` (idempotent,
  human-initiated company identity; unique-name fallback so an offering resolves
  to the same company a later lead uses).

### Web

- Compact `OutreachDecisionControl` inside the **expanded offering detail** of the
  Companies and offerings table (lazy-loads the persisted decision; no new table
  column). The lead detail reuses the same control with the company scope.
- `OfferingsView`/`OfferingsTable`/`OfferingDetail` carry `opportunityId`.

### Scope / precedence

- One record per `(opportunity, company)`; a company in another opportunity is
  unaffected. `ELIGIBLE` = no exclusion; any other state overrides the agent gate
  and blocks drafting (`409 lead_excluded_from_outreach`).

### Tests / verification

- API **206**: new/updated `outreach-decisions-api.spec.ts` covers company-scoped
  persistence, exclusion override, opportunity isolation, and the key flow —
  decide `EXISTING_RELATIONSHIP` from an **offering before any lead exists**, then
  create the lead and prove drafting is blocked by that same record.
- Web **174**, contracts **76**, database **17**; typecheck/lint/build,
  `verify-docs`, `verify.sh`, `git diff --check` green.
- Added a `server-only` stub + vitest alias (standard Next testing setup) so the
  render test can mount the table whose expanded row uses the control.

### Known limitations

- Company resolution is name-based (with a unique-name fallback). If a research
  offering and a later lead use materially different company names, they are
  different companies and the decision does not carry — by design (the persisted
  scope is `company_id`).
