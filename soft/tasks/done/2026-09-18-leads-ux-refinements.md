# Task: Leads UX refinements (presentation only)

**Status:** DONE

**Archived:** 2026-09-18

**Parent:** O-019 — Evidence-backed potential buyer shortlist

## Objective

Apply the operator-approved presentation-only refinements to the product Leads
list and detail. Preserve the schema, API contracts, research records, candidate
evidence and operator review decisions.

## Scope / files changed

- `apps/web/components/leads/leads-list.tsx` — candidate-first ordering;
  opportunities without candidates moved into a collapsed `<details>`; recorded
  countries shown per opportunity (from `targetMarkets[].country`); explicit
  "View details" link per candidate; contextual summary retained.
- `apps/web/components/leads/lead-review-form.tsx` — review copy reworded
  (shortlisting = selection for further investigation, not confirmation of
  purchasing intent); implementation-oriented phrasing removed; cursor affordance.
- `apps/web/app/(dashboard)/products/[id]/leads/page.tsx` — concise intro text.
- `apps/web/app/(dashboard)/products/[id]/leads/[opportunityId]/[leadId]/page.tsx`
  — UUID removed from the visible layout; labels renamed ("Why this company?",
  "What we still need to know", "Next step"); Review moved before Evidence;
  evidence text + linked finding collapsed under "View evidence" with source
  link and retrieval date kept visible; correction warning kept visible;
  focus-visible styling and responsive grid.
- `apps/web/lib/leads/display.ts` — new pure helpers `opportunityCountries` and
  `partitionOpportunities`.
- `apps/web/lib/leads/display.test.ts` — focused tests for the new helpers.

## Schema / endpoint impact

None. Presentation only; no migration, no contract or API change.

## Commands run and results

- `pnpm --dir soft --filter web test` → **95 passed** (17 files; incl. 6 leads display tests).
- `pnpm --dir soft --filter @ai-sdr/contracts test` → 35 passed.
- `pnpm --dir soft --filter @ai-sdr/api test` → 56 passed (isolated `ai_sdr_test_api`; review mutations exercised on test data only).
- `pnpm --dir soft -r typecheck` → clean; `pnpm --dir soft -r lint` → clean.
- `bash scripts/verify.sh` → **60 passed, 0 failed**.

## Verification evidence

- Rendered `GET /products/<id>/leads` (200): concise intro, 3 "View details"
  links, two "Countries:" lines (one per opportunity), candidate-first ordering,
  collapsed `<details>` section after the candidate rows.
- Rendered `GET /products/<id>/leads/<opp>/<lead>` (200): "Why this company?",
  "What we still need to know", "Next step", "View evidence" present; old labels
  and implementation-copy absent; Review section precedes Evidence; source link
  and retrieval date visible; UUID absent from the visible layout (appears only
  in Next's serialized client props).
- Review mutations were **not** run against real candidates; the review flow is
  covered by the isolated API integration tests.

## Known limitations

- The collapsed no-candidate section renders only when an opportunity without
  candidates exists (the test product has two opportunities; both cases covered).
- Correction warning is shown only when the supporting claim is not CURRENT;
  verified via the isolated integration test rather than by mutating the real
  completed run's claims.

## Notes

- No commit/push performed by the programmer; finalization (backup, archive,
  commit/push) is authorized under O-019.
