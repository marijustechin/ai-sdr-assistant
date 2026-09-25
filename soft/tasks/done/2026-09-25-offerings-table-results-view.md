# Task: Market Research offerings — compact results table with expandable rows

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Replace the stacked offering cards on the Market Research run page with a
compact, scan-friendly table: one offering per row, minimum columns (Company,
Product, Price, Unit, VAT, Market/channel, Stock/availability, Match), unknown
values shown as —, compact exact/adjacent/substitute badges, whole-row click to
expand a detail row in place, preserved filters and counts, and accessible
keyboard/expanded-state semantics. Presentation only — no research data, API
contract, quote-collection or pricing-semantics change.

## Completion record

### Actual implementation summary

- Extracted a pure, serializable view-model `lib/research/offerings-table.ts`:
  `offeringRowCells` (unknown → `UNKNOWN_CELL` = `—`), `buildOfferingTableGroups`
  (one row per offering, exact → adjacent → substitute → unclassified, with the
  linked-claim review and its evidence), `linkedClaimEvidenceFor`, and
  `toggleExpandedRow` (single-open expansion).
- Added a client component `components/research/offerings-table.tsx`: semantic
  `<table>` with group header rows (match badge + count), one row per offering,
  a full-row `onClick` plus a real `<button>` in the Company cell carrying
  `aria-expanded`/`aria-controls`, and an expandable detail `<tr>` directly
  beneath the selected row. Lower-priority columns progressively hide
  (`Unit sm`, `Market md`, `VAT lg`, `Stock xl`); the wrapper scrolls
  horizontally and rows never become cards.
- Moved the old card body into `components/research/offering-detail.tsx`, keeping
  every previous field and adding product/specification, recorded numeric
  amount, recorded/updated/retrieved metadata, stock/availability (unrecorded)
  and an explicit inquiry/clarification "not linked" note. Provenance, evidence
  excerpt and uncertainty are retained inside the expanded detail.
- Rewired `components/research/offerings-view.tsx` (still a server component) to
  build serializable groups (no `Map` crosses the client boundary) and render
  `<OfferingsTable>`; filters, "Showing X of Y", and clear-filters are unchanged.
- Deleted the now-unused `components/research/offering-card.tsx`.

### Files changed

- Added: `apps/web/lib/research/offerings-table.ts`,
  `apps/web/lib/research/offerings-table.test.ts`,
  `apps/web/components/research/offerings-table.tsx`,
  `apps/web/components/research/offerings-table.test.ts`,
  `apps/web/components/research/offering-detail.tsx`.
- Modified: `apps/web/components/research/offerings-view.tsx`.
- Deleted: `apps/web/components/research/offering-card.tsx`.

### Migration applied

Not needed (presentation only; no schema/DB change).

### Endpoints/contracts added or changed

None. No API route, Zod contract, or data shape changed.

### Commands run and results

- `pnpm --dir soft/apps/web test` → **31 files / 170 tests passed** (baseline 154;
  +8 view-model, +8 render tests).
- `pnpm --dir soft/apps/web typecheck` → clean.
- `pnpm --dir soft/apps/web lint` → clean.
- `pnpm --dir soft/apps/web build` → exit 0 (Next.js 16.3.4).
- `pnpm --filter @ai-sdr/contracts test` → 70 passed (contracts unchanged).
- `bash soft/scripts/verify.sh` (from `soft/`) → 61 passed, 0 failed.

### Test and verification evidence

- `lib/research/offerings-table.test.ts`: one row per offering; unknown → `—`;
  price and unit independent; VAT recorded vs unknown; group order; linked-claim
  review + evidence resolution; single-open expand / switch / collapse.
- `components/research/offerings-table.test.ts` (server-render via
  `react-dom/server`, deterministic): one offering row per offering and no
  detail row when collapsed; the blank offering row renders seven `—` cells and
  no invented company; price present with a missing unit leaves only the unit
  (and always-unrecorded stock) unknown; Exact/Adjacent/Substitute badges;
  collapsed `aria-expanded="false"`, one `aria-expanded="true"` when expanded;
  `aria-controls`/detail id match; expanded detail contains the evidence text,
  source URL and uncertainty; collapse restores no-detail.
- Filtering is unchanged and still covered by `lib/research/offerings.test.ts`.

### Known limitations

- The suite runs in a `node` vitest environment with no jsdom/RTL, so true
  pointer/keyboard event dispatch is not exercised; the interaction is covered
  by the pure `toggleExpandedRow` logic and by render tests asserting the
  accessible state. The button naturally bubbles its click/Enter/Space to the
  row toggle.
- `Stock / availability` has no structured field, so it always renders `—`
  (never inferred from prose).
- Offerings are not linked to supplier price inquiries in the data model, so the
  expanded detail states that explicitly rather than inventing a status.
- No screenshot was captured: browser-automation tooling is not installed and the
  app + local Postgres were not run for this presentation-only change. The
  rendered structure is asserted by the tests above.

### Decisions or blockers created

- Extracted the pure view-model into `lib/` so testing stays within the
  project's existing node/vitest setup (no new test dependencies).
- Kept match grouping (exact first) as table group-header rows with counts, so
  the existing taxonomy and group logic are preserved.
- No blockers.
