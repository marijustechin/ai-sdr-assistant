# O-019 — Evidence-backed potential buyer shortlist

**Status:** ACCEPTED
**Type:** delegation
**Scope:** repository root (manager records) + delegated implementation in `soft/`

## Objective

Enable the operator to turn the existing LT/LV/EE market research into a
reviewable, **product-specific list of potential buyers** in the product's
Leads tab, without inventing demand, contacts or scores. The list links each
candidate to the product/opportunity and to the research evidence that
supports its inclusion, keeps observed facts separate from buyer-fit
hypotheses, and carries an operator review status
(`UNREVIEWED | SHORTLISTED | REJECTED`, optional reason). One bounded,
product-independent implementation slice only; contact discovery is the next
slice.

## Inputs / references

- `AGENTS.md` (manager contract; §4 responsibilities, §6 delegation, §7 hard prohibitions)
- `docs/system/module-map.md` §§8–11 (planned `lead-discoverer` / `lead-evaluator` / `contact-discovery`), §16 interaction matrix
- `docs/system/data-governance.md` §2 (`companies`, `opportunity_companies` owners), §3, §7
- `docs/system/research-harness/AGENTS.md` §3 (hard rules) and `evidence-and-outputs.md` §3 (seller status ≠ buyer suitability)
- `docs/system/decisions.md` (evidence-linked `research_offerings`; no CRM; no company write without approval)
- Human instructions 2026-09-18: start the task and populate from run `9e4e6d02…`; then approve UX refinements and authorize finalization (backup, archive, sync, commit/push)

## Steps

- [x] Inspect existing company/lead/contact models and module boundaries.
- [x] Delegate one bounded implementation task to `soft/tasks/current.md`.
- [x] Programmer implements the smallest complete slice (schema + API + web Leads tab) and runs isolated tests.
- [x] Populate an initial `UNREVIEWED` shortlist through the API using only run `9e4e6d02…` evidence.
- [x] Verify persistence, dedup, provenance, review actions and the real dashboard flow.
- [x] Apply the operator-approved presentation-only UX refinements (list + detail).
- [x] DB backup outside Git + restore verification into a disposable database.
- [x] Human review / acceptance.

## Deliverables

- Manager: this task record; updated `docs/system/project-state.md`, `docs/system/data-governance.md`, `docs/system/decisions.md`.
- Delegated (in `soft/`): `companies` + `opportunity_companies` tables and migration; `lead-discoverer` API module; shared lead contracts; product Leads tab (list + detail + review action); isolated tests.
- Populated initial shortlist (3 evidence-backed candidates) for run `9e4e6d02…`.
- UX refinements (presentation only) on the Leads list and detail.

## Acceptance criteria

- [x] A lead is linked to the opportunity/product and to the research evidence that supports its inclusion (provenance preserved, not copied).
- [x] The list/detail shows company name, website, country, observed activity/role, buyer-fit explanation, supporting sources with retrieval dates, unknowns and next step, and review status + optional reason.
- [x] Observed facts and buyer-fit hypotheses are separate fields; no demand/volume/contact/score is invented.
- [x] Candidates deduplicate within the opportunity; repeated submissions never create duplicates.
- [x] A replaced/retracted supporting claim stays traceable and flags the lead for review instead of silently supporting a finding.
- [x] Leads list + detail are usable through the API and the product Leads tab; credentials stay server-side; records live in PostgreSQL.
- [x] Isolated tests pass and `scripts/verify.sh` passes.
- [x] An initial `UNREVIEWED` shortlist exists from run `9e4e6d02…` evidence; missing data left unknown.
- [x] UX refinements applied and verified; presentation only (schema/API/records/review decisions unchanged).

## Out of scope

- New web searches, contact enrichment, outreach, email, or any contact records.
- Modifying the completed run `9e4e6d02…` or its evidence.
- Auto-converting every research offering into a lead; lead scoring; qualification engine.
- Top-level Leads nav / cross-product CRM; frozen research-context snapshots.
- `legacy/**` and `docs/redesign/**`.

## Verification

- API integration tests (isolated `ai_sdr_test_api`) for create/dedup/provenance/review/auth.
- Shared-contract tests; web pure-helper unit tests (ordering, recorded countries, review display).
- `pnpm --dir soft -r typecheck`, `pnpm --dir soft -r test`, `bash soft/scripts/verify.sh` (60/0).
- Live check: the product Leads list + detail render the populated shortlist; refined labels/ordering/collapse verified over HTTP.
- DB backup `ai_sdr-20260918-124652-o19-final.dump` (outside Git; sha256 `134316D0…C2560CA074`) restored into a disposable database; company/lead provenance verified.

## Rollback/blocked conditions

- Additive migration only; rollback = drop the two new tables/enum (no existing table touched).
- Populated leads are reviewable and reversible via `PATCH` (set back to `UNREVIEWED`); no business table outside `lead-discoverer` ownership is written.
- If a required provenance/route cannot be persisted, keep the task in `soft/tasks/current.md` (blocked), do not archive.

## Completion record

- Implementation archived in
  `soft/tasks/done/2026-09-18-evidence-backed-buyer-shortlist.md`; UX
  refinement slice in
  `soft/tasks/done/2026-09-18-leads-ux-refinements.md`.
- New additive migration `20260918090000_add_companies_opportunity_leads`
  (`companies`, `opportunity_companies`, `LeadReviewStatus`), owner
  `lead-discoverer`; no other module's tables touched.
- Endpoints: `POST/GET /opportunities/:id/leads`, `GET/PATCH
  /opportunities/:id/leads/:leadId` (guarded); shared `leads.ts` contracts.
- Product **Leads** tab (list + detail + server-side review action);
  `product-section-nav` enables Leads.
- UX refinements: opportunities with candidates first; no-candidate
  opportunities in a collapsed `<details>`; recorded countries shown from
  target-market data (never inferred); explicit "View details" per candidate;
  concise intro; detail renames ("Why this company?", "What we still need to
  know", "Next step"); Review moved before Evidence; evidence text/finding
  collapsed under "View evidence" with source + retrieval date visible;
  implementation-oriented copy removed; shortlisting explained as selection for
  further investigation; correction warnings + shortlisting guard preserved and
  kept visible.
- Tests: contracts 35, API 56, web 95, `-r typecheck`/`lint` clean,
  `scripts/verify.sh` 60/0.
- Initial `UNREVIEWED` shortlist from run `9e4e6d02…`: 3 candidates
  (MB Pirties meistrai/LT, After 7 OÜ/EE, SIA E`VITA/svetnica.lv/LV); dedup,
  provenance and review actions verified (review mutations exercised against the
  isolated test DB only).
- Backup/restore: `C:\Users\msmig\db-backups\ai-sdr\ai_sdr-20260918-124652-o19-final.dump`
  (112,833 bytes; sha256 `134316D021EDFB8B9FE8E6DCA7C385BB88CA6D461C8F1DFA49281CD2560CA074`)
  restored into a disposable database; 3 companies / 3 leads with full evidence
  provenance confirmed.
- Reviewed by the operator; finalization authorized. See the commit report for
  the commit/push.
