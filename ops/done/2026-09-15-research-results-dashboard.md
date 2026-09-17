# O-013 — Research results dashboard (read-only first version)

**Status:** READY_FOR_HUMAN_REVIEW
**Type:** direction (delegation) + project-state
**Scope:** repository root `ops/`/`docs/system/` direction and one delegated
`soft/` slice (web dashboard, read-only reads, docs). No schema or research
execution.

## Objective

Let an operator navigate from an existing product to its research runs and
understand the persisted results **without manually supplying UUIDs**, using a
read-only first version of the admin dashboard. This is a presentation slice
over data already persisted by O-010/T-007/O-011; it must not resume runs,
search, correct claims, change checkpoints, or infer structured values from free
text.

## Inputs / references

- `AGENTS.md` §3, §5–§7; `soft/AGENTS.md`; `soft/tasks/current.md`
- `docs/system/project-state.md`, `docs/system/module-map.md`
- `docs/system/research-harness/AGENTS.md`,
  `persistence-boundary.md`, `coverage-and-stopping.md`, `evidence-and-outputs.md`
- `docs/system/research-context-contract.md`
- Existing web admin (`soft/apps/web`) and internal API/contracts
- Live run `ba1fcdd0-…` observed read-only (19 coverage cells, 8 follow-ups,
  23 queries, 29 evidence, claims 31 = 22 `CURRENT` + 6 `REPLACED` + 3 `RETRACTED`)

## Steps

1. Inspect the real API responses + checkpoint structure; reuse existing
   dashboard components, navigation, and the server-side API client.
2. Product → research navigation with useful empty states.
3. Research-run overview (scope, status/pause/context, timestamps, recorded
   usage/limits, coverage by country × application, gaps, follow-ups).
4. Findings: CURRENT claims by default, type/confidence, linked evidence with
   stance/text/verification/retrieval/source URL; filters from real API fields.
5. Correction history via `includeHistory=true` (CURRENT/REPLACED/RETRACTED,
   reason/timestamp, replacement navigation).
6. Read-only boundaries; no schema changes; minimal read support only if
   required (document first).
7. Verify (compliant Node, existing rules); visually inspect the dashboard
   against the real run read-only and confirm business state unchanged; update
   docs/canonical project state.

## Deliverables

- `ops/current.md` (this task) + `ops/backlog.md` update; optional
  `docs/system/project-state.md` update after verification
- `soft/tasks/current.md` delegated task → implemented → archived
- `soft/apps/web/**` read-only research dashboard; implementation docs

## Acceptance criteria

- [ ] Operator can go product → opportunities → research runs → run detail
      without supplying UUIDs; empty states are useful.
- [ ] Run overview shows scope, status/pause/context, timestamps, recorded
      usage/limits, coverage by country × application (sauna vs facade distinct),
      gaps and pending follow-ups; `COVERED` is explained as recorded coverage,
      not a complete assessment.
- [ ] CURRENT claims shown by default; FACT/INFERENCE/UNKNOWN distinguished;
      evidence stance/text/verification/retrieval/source URL inspectable.
- [ ] Correction history is explicit; historical claims never appear as current
      by default.
- [ ] Missing checkpoint fields render as unavailable; unknown cost is not `0`;
      no price/geography/application inferred from free text.
- [ ] Read-only for business data; no schema change; internal key stays
      server-side; the API (not the DB) is used.
- [ ] Gates pass on compliant Node; real run unchanged after visual inspection.

## Out of scope

- Resuming/completing/correcting runs or claims; new searches; outreach; billing.
- Schema changes; a new research execution framework; new price calculations.
- Editing products beyond the existing admin behaviour.

## Verification

- `pnpm -r build|typecheck|lint|test`, `bash scripts/verify.sh`.
- Read-only HTTP inspection of the dashboard pages against the live run;
  re-read of the run/claims confirming unchanged state.

## Rollback/blocked conditions

- Revert the delegated `soft/**` changes. Blocked if a UI requirement cannot be
  served read-only without a schema change; record the gap instead of changing
  the schema.

## Completion record

**Completed:** 2026-09-15 · **Status:** READY_FOR_HUMAN_REVIEW. Not archived
(pending review). No commit or push.

1. **Delegation.** One bounded programmer task was delegated via
   `soft/tasks/current.md` and completed; archived to
   `soft/tasks/done/2026-09-15-research-results-dashboard.md`. No schema change;
   no new endpoint or contract.
2. **What the operator can now view (read-only).** From a product:
   `/products/:id/research` lists the product's opportunities (offer, status,
   context version, attached target markets) and their research runs (status,
   pause reason, context version, requested/checkpoint timestamps) with useful
   empty states; `/products/:id/research/:opportunityId/:runId` shows the run
   overview (scope, status/pause/context, timestamps), recorded usage/limits
   (checkpoint notes verbatim), coverage grouped by recorded country × segment
   (sauna/bathhouse and exterior/facade kept distinct) with `COVERED` explained
   as recorded coverage (not a complete market assessment), recorded gaps,
   pending follow-ups, CURRENT findings (FACT/INFERENCE/UNKNOWN) with linked
   evidence (stance, text, verification, retrieval date, source URL) and filters
   over real API fields, and an explicit `?history=1` correction view
   (CURRENT/REPLACED/RETRACTED, reason, timestamp, replacement navigation).
3. **Verification.** `pnpm -r build` (incl. the Next.js app, both new routes),
   `typecheck`, `lint`, `test` (**135 passed**: contracts 16, database 16,
   api 35, web 68) and `scripts/verify.sh` (**60/0**) pass on Node v24.20.0;
   `git diff --check` clean. The production build was served against the live
   API and the real run's pages rendered correctly (index; run detail; history);
   only GETs were issued.
4. **Business state unchanged.** Run `ba1fcdd0-…` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `contextVersion 7`, checkpoint 19 cells / 8
   follow-ups, 31 claims (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`) after the
   inspection. European market research remains **not** complete.
5. **Boundaries.** Read-only: no resume, search, claim correction, checkpoint
   change, or product write; the internal API key stays server-side; the API is
   used (never the database directly); no price/geography/application inference
   from free text; unknown cost is not rendered as `0`. Local environment note:
   the Docker engine had stopped and was restarted so the local database (and
   tests) could run — no code or data change.
6. **Limitations (recorded in `soft/apps/web/docs/MISSING_API.md`).** Structured
   usage/limit fields are not persisted (notes shown verbatim); filters are
   limited to type/confidence/stance/lifecycle; price values are displayed
   verbatim and never normalised; there is still no product-level research
   status.
7. **Next.** Human review; then, if approved, the manager may authorize a commit
   and push (no commit/push was performed here).

<!-- Archived to ops/done/YYYY-MM-DD-slug.md on closure. -->

## Completion record — round 2 (sales-manager view)

**Completed:** 2026-09-15 · **Status:** READY_FOR_HUMAN_REVIEW. Not archived
(pending review). No commit or push.

1. **Delegation.** One bounded programmer task delegated and completed via
   `soft/tasks/current.md`; archived to
   `soft/tasks/done/2026-09-15-research-results-dashboard-sales-view.md`.
2. **Data boundary + minimal read model.** The only structured fields were run
   lifecycle/checkpoint, target markets, claims, evidence and sources; company/
   offering/price were free text. Added the smallest bounded model: an
   evidence-owned `research_offerings` table (migration
   `20260915140000_research_offerings`) with mandatory provenance and an
   idempotent per-run fingerprint, plus `POST/GET .../:runId/offerings`
   (internal-key guarded). Values are explicit only; nothing is parsed from
   prose; the UI is read-only.
3. **Population.** 18 offerings created for the real run **through the API**,
   each linked to existing evidence + source (and a CURRENT claim where
   applicable), preserving original price wording. Repeatable without
   duplicates. No claims/evidence/corrections/checkpoint were modified.
4. **UI.** Offerings are the primary view (company/product, recorded location vs
   market served, application/treatment/dimensions, original price + currency +
   unit + VAT, sample vs full product, source + retrieval date, explicit
   uncertainty); filters for market served / application / match class with
   "Showing X of Y" and "Clear filters"; exact/adjacent/substitute separated;
   CURRENT findings shown beside their offering with other current findings kept
   accessible; correction history via `?history=1`; usage/limits/notes/discovery
   log moved behind a collapsed "Research details" (query total in the summary);
   accessible reduced-motion-aware "Back to top". Run overview left unchanged.
5. **Encoding defect.** Localized to the **manager PowerShell write path**
   (BOM-less scripts parsed as CP1252 and string-body encoding); the API/web path
   round-trips non-ASCII correctly (integration test). Fixed/documented the
   manager pattern (`research-toolchain.md` §8). Two historically double-encoded
   `research_queries` rows are reported, not rewritten.
6. **Verification.** `pnpm -r build|typecheck|lint` pass; `pnpm -r test` **148
   passed** (contracts 17, database 16, api 40, web 75); `verify.sh` **60/0**;
   `git diff --check` clean. Production build inspected in a **real browser**
   (headless Chrome) at desktop (1440) and narrow (420) widths.
7. **Run state unchanged.** `ba1fcdd0-…` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `contextVersion 7`, checkpoint 19/8, 23 queries, 31
   claims (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`), 29 evidence; offerings
   (18) are additive. European market research remains **not** complete.
8. **Limitations.** Population is a curated, provenance-linked submission (no
   automatic extraction); market-served filter values are free text; offering and
   claim filter links reset the other filter namespace; usage counters remain
   free-text in the checkpoint. Recorded in `apps/web/docs/MISSING_API.md`.
9. **Backlog.** Recorded (not implemented) the
   result → clarification → email → human-approved sending → reply-as-evidence →
   reviewed correction flow in `ops/backlog.md`; supplier confirmation must stay
   distinguishable from independent verification. No sending, no action button.

### Round 3 — integration follow-ups (accepted direction)

Delegated and completed via
`soft/tasks/done/2026-09-15-research-dashboard-integration.md`.

1. **Harness requirement.** The canonical harness now requires future runs to
   persist evidence-linked offerings through
   `POST .../research-runs/:runId/offerings` as in-scope company/product/price
   evidence is verified — citing the `evidenceId` (+ `sourceReferenceId`) and any
   CURRENT `claimId`. `operating-manual.md` §7 states the rule;
   `evidence-and-outputs.md` documents the field set, mandatory provenance,
   `UNKNOWN`/null rules, fingerprint deduplication and correction consistency.
   General market findings are **not** required to become offerings, and the
   dashboard is not the population path (no manual per-run dashboard work).
2. **Correction consistency.** `offeringClaimState` resolves a linked claim
   through the existing lifecycle; the offering card shows a "Review: linked
   finding replaced/retracted" flag with the reason and replacement link, and the
   stored fields are never overwritten from the replacement. The run page now
   reads claim history so the flag can resolve. No real-run offering currently
   links to a historical claim; behaviour is unit-tested.
3. **Filters.** Changing an offering or claim filter preserves the other
   namespace; "Clear filters" clears both. Verified in served HTML (12 preserved
   hrefs) and counts (GB → 10, sauna → 8, exact → 15 of 18).
4. **Verification.** web `typecheck|lint|test` pass (76 tests); `build` pass;
   earlier full suite 148; `verify.sh` 60/0; `git diff --check` clean. The four
   historical encoding-damaged `research_queries` rows were left untouched; the
   run is unchanged. No commit/push.

## Closure — O-013 accepted (2026-09-15)

**Status:** CLOSED / ACCEPTED. The human approved O-013 including rounds 1–3.

1. **Accepted scope.** The read-only research results dashboard: product →
   opportunities → research runs → run detail; a sales-manager view led by
   companies/offerings (structured, evidence-linked, filterable by market served,
   application and match class with confirmed/adjacent/substitute separated);
   CURRENT findings beside their offering with other current findings kept; the
   explicit `includeHistory` correction view; coverage that explains investigated
   vs missing; usage/limits/notes/discovery log behind a collapsed "Research
   details"; and the accessible "Back to top". Backed by the evidence-owned
   `research_offerings` read model + `POST/GET .../offerings`, and the harness
   requirement that future runs persist offerings via the API.
2. **Preserved.** Run `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `contextVersion 7`, checkpoint 19 cells / 8 follow-ups,
   23 queries, 31 claims (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`), 29 evidence
   and 18 offerings. Closing the manager task does not resume/complete/cancel the
   run. European market research is **not** complete.
3. **Recorded follow-up (not implemented).** Four historical `research_queries`
   rows are double-encoded (CP1252↔UTF-8, recoverable): `3487472b-57f0-4cb4-ad82-f5b9de506c21`,
   `6160aabc-d86b-40f7-8a4b-dd5dca79a2ec`, `0b53f12a-6ee4-4587-b915-086228257913`,
   `424f26fc-6ea7-41a5-98d7-50ae641f60c0`. They are reported, not rewritten; a
   future bounded repair (with explicit approval) may transcode them.
4. **Finalization** (backup, verification, commit, push) is recorded in
   `ops/done/2026-09-15-finalize-research-dashboard.md`.
