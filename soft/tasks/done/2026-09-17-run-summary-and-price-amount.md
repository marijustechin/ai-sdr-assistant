# Task: Research run Summary + Back-to-top cursor (O-018) — DONE

**Status:** COMPLETE (implementation); manager task O-018 left
READY_FOR_HUMAN_REVIEW. No commit/push.

## Objective

Add a compact, run-scoped **Summary** between **Run overview** and **Companies and
offerings**, fix the **Back to top** cursor, and add only the minimal structured
support needed for price extrema.

## Design (as built)

- **Price model inspected:** `research_offerings` stored only verbatim `priceText`
  plus `priceCurrency`/`priceUnit`/`vatStatus`/`priceBasis`/`sampleKind`/`matchType`;
  no numeric amount, and parsing prose is forbidden. Added the minimal
  `price_amount_numeric` (Decimal, nullable) recorded only when the source states
  a number on the same basis.
- **Summary** (`lib/research/summary.ts`, pure): distinct companies (deduped by
  normalized explicit `companyText`; documented fallback because no canonical
  company id exists — source domains/marketplaces are never treated as companies),
  offering counts by exact/adjacent/substitute, usable/priced offering counts,
  price groups (match type + currency + unit + VAT + basis + sample + treatment;
  substitutes never combined with exact matches) with Lowest/Highest observed,
  exclusions (correction-flagged/unresolved/price-wording-without-amount), and a
  gaps indication from the checkpoint. Run-scoped; offering filters do not change it.
- **Back to top**: added `cursor-pointer` to the enabled button and a visible
  `focus-visible` ring; keyboard access and reduced-motion behavior preserved.

## Files created/changed

- `packages/database/prisma/schema.prisma` +
  `prisma/migrations/20260917160000_research_offering_price_amount/migration.sql`
- `packages/contracts/src/research.ts` (`priceAmountNumeric`) +
  `test/offering-price.spec.ts`
- `apps/api/src/modules/evidence/{domain/types.ts, application/evidence.service.ts,
  infrastructure/evidence.repository.ts}`
- `apps/api/test/offerings-api.spec.ts`
- `apps/web/lib/research/{types.ts, summary.ts, summary.test.ts, offerings.ts,
  offerings.test.ts}`, `components/research/{run-summary.tsx, back-to-top.tsx,
  offering-card.tsx}`, run page
- Docs: `docs/system/{data-governance.md, decisions.md, project-state.md}`,
  `docs/system/research-harness/evidence-and-outputs.md`,
  `soft/docs/{data-model.md, data-ownership.md}`, `apps/web/docs/MISSING_API.md`

## Schema/migration impact

- One additive migration `20260917160000_research_offering_price_amount`:
  `research_offerings.price_amount_numeric DECIMAL(18,6) NULL`. Applied to the
  live `ai_sdr` DB and the isolated test DBs. Rollback: drop the column; existing
  rows keep `NULL` (not recorded numerically).

## Endpoint/contract impact

- `POST .../offerings` accepts optional `priceAmountNumeric`; offering responses
  gain `priceAmountNumeric` (additive). No new endpoint.

## Completion record

1. **Commands.** `pnpm -r build|typecheck|lint|test` pass — **184 tests**
   (contracts 31, database 17, web 87, api 49); `bash scripts/verify.sh` **60/0**;
   `git diff --check` clean.
2. **Tests.** Company dedup (explicit name; marketplace publisher not counted);
   price grouping/extrema (substitutes separate; group key); single-price and
   no-price cases; correction/unclassified exclusions; gaps; API persistence of
   the numeric amount alongside verbatim wording; contract accepts optional amount
   and rejects non-positive/non-finite.
3. **Browser.** A real Chromium browser (Edge headless, isolated web `:3005`
   against `:3003`, read-only) rendered the run page at **1440** and **420** px;
   the DOM contains the Summary with the expected content and the order is
   Run overview → Summary → Companies and offerings. (This headless setup did not
   emit screenshot files — Chrome legacy headless is unavailable and new headless
   produced blank images — so pixel-level capture was not possible here.)
4. **Preserved.** Both research runs (`ba1fcdd0-…` `PAUSED`/`DIMINISHING_RETURNS`;
   `c84763b1-…` `PAUSED`/`ACCESS_BLOCKED`, `FREE_ONLY`) keep their policies,
   checkpoints and results; no searches, outreach or research execution. The
   real run's offerings have no numeric amount recorded, so its Summary shows the
   "not recorded numerically" state (never `0`) with exclusions.
5. **Limitations.** No canonical company id yet (name-based dedup fallback);
   price extrema require the explicit numeric amount; no currency/unit conversion;
   screenshots unavailable in this headless environment.

## Rollback

- Revert the slice and drop the additive migration.
