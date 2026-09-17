# O-018 — Research run Summary and Back-to-top cursor

**Status:** CLOSED / ACCEPTED (operator-accepted 2026-09-17)
**Type:** direction (delegation) + project-state + review
**Scope:** one delegated `soft/` UX slice over the existing research-run data
(web Summary + Back-to-top) plus the minimal structured price support it needs,
and a bounded verified numeric-price backfill. No new research execution,
searches or outreach.

## Objective

Add a compact, product-independent **Summary** to the research run view,
immediately after **Run overview** and before **Companies and offerings**, and
fix the **Back to top** control's cursor. The Summary is whole-run scoped and is
not affected by the offering filters. Populate the numeric price amount on
existing offerings where the linked evidence unambiguously supports it.

## Inputs / references

- `AGENTS.md` §3, §5–§7; `soft/AGENTS.md`
- `docs/system/research-harness/evidence-and-outputs.md` §2,
  `coverage-and-stopping.md`, `operating-manual.md` §7
- `docs/system/data-governance.md` (evidence owns `research_offerings`)
- Existing: `research_offerings` price model, run page, `lib/research/offerings.ts`,
  `offering-card`, `back-to-top`.

## Steps

1. Inspect the price model (verbatim `priceText` + enums; no numeric amount).
2. Delegate a bounded programmer task: minimal structured numeric field + the
   Summary + cursor fix, then a bounded verified backfill and Summary states.
3. Verify (unit + isolated DB + real browser); preserve runs/evidence.
4. Record outcome; leave READY_FOR_HUMAN_REVIEW (no commit/push) until accepted.

## Acceptance criteria (all met)

- [x] A compact "Summary" sits after Run overview and before Companies and
      offerings; Run overview unchanged.
- [x] Summary shows: distinct identified companies; offering counts by
      exact/adjacent/substitute; offerings with usable public prices; Lowest/
      Highest observed prices within comparable groups; a short gaps indication.
- [x] Company count ≠ offering count; companies deduplicated by explicit identity
      (fallback documented); marketplaces/source domains are not counted.
- [x] Price groups separate substitutes from exact matches and group by currency,
      unit, VAT basis, retail/wholesale basis, sample/full-product and recorded
      treatment; extrema are labelled, link to the offering + source, show the
      group's priced count, and show one value for a single price.
- [x] Correction-flagged/unresolved offerings are excluded from extrema with an
      understandable explanation; missing values are never shown as zero; no
      currency/unit conversion; original price wording + provenance preserved.
- [x] Summary is run-scoped and labelled so; offering filters still affect only
      the results list.
- [x] Back to top enabled button has `cursor-pointer`, keyboard accessibility,
      visible focus and reduced-motion behavior preserved.
- [x] Tests cover company dedup, price grouping/extrema, single/no-price,
      correction exclusions and summary scope; desktop + narrow inspected in a
      real browser.
- [x] No searches/outreach; run policies/state/checkpoints/evidence preserved.

## Out of scope

- Any change to Run overview; browser-side free-text price extraction; currency
  or unit conversion.

## Verification

- `pnpm -r build|typecheck|lint|test`; `bash scripts/verify.sh`; `git diff --check`.
- Unit tests for the summary helpers; isolated-DB API test for the numeric price.
- Browser inspection (desktop + narrow).

## Rollback/blocked conditions

- Revert the slice; the additive migration is reversible. Blocked if a numeric
  price cannot be recorded explicitly — record the gap instead of parsing prose.

## Completion record

**Completed/closed:** 2026-09-17 · **Status:** CLOSED / ACCEPTED.
**Operator acceptance:** the operator confirms the research identifies **relevant
companies and potential customers**; acceptance covers the **implemented research
flow and Summary** and does **not** imply complete market coverage.

1. **Delegation.** Two bounded programmer tasks via `soft/tasks/current.md`;
   archived to `soft/tasks/done/2026-09-17-run-summary-and-price-amount.md` and
   `soft/tasks/done/2026-09-17-price-backfill-and-summary-states.md`.
2. **Behavior.** A compact **Summary** renders after **Run overview** and before
   **Companies and offerings** (Run overview unchanged): distinct identified
   companies; offering counts by exact/adjacent/substitute; price states
   ("Usable prices" / "Price recorded, not structured yet" / "No price recorded");
   **Lowest observed / Highest observed** prices within comparable groups (linked
   to the offering and its source); and a short gaps indication from the
   checkpoint. It is labelled "Whole run — offering filters below do not change
   this summary"; missing values never render as `0`. **Back to top** has
   `cursor-pointer` plus a visible focus ring, with keyboard and reduced-motion
   behavior preserved.
3. **Schema/API/data changes.** Additive migration
   `20260917160000_research_offering_price_amount` adds
   `research_offerings.price_amount_numeric DECIMAL(18,6) NULL` (applied to
   `ai_sdr` and the isolated test DBs); `POST .../offerings` accepts optional
   `priceAmountNumeric`; offering responses gain `priceAmountNumeric`. No new
   endpoint. `priceText` wording/provenance preserved; no prose parsing and no
   currency/unit conversion.
4. **Verified numeric-price backfill (bounded, authorized).** 10 offerings
   populated across both runs where the linked evidence states an unambiguous
   single price: Coyletimber 7.00 GBP/m (ex VAT), Finnmark Sauna 591.95 EUR/m2,
   Kebur 11.80 GBP/linear m, Linwood 12.00 GBP/linear m, **MDS Terasos 68.97
   EUR/m2** (operator-verified; unit set to `per m2` to match the number's basis),
   Pirtele.lt 69.00 EUR/m2, The Timber Group 8.45 GBP/m (ex VAT), Gebhardt
   2.221,73 EUR/m³, Theile 1.975,40 EUR/m³, Sturhan 55,45 EUR/qm. Ranges,
   multiple-basis and "from around" prices were deliberately left unstructured.
   Path: re-`POST` by unchanged fingerprint → in-place upsert with an id
   duplicate-guard; idempotent (26 offerings before and after).
5. **Verification.** `pnpm -r build|typecheck|lint|test` pass — **186 tests**
   (contracts 31, database 17, web 89, api 49); `bash scripts/verify.sh` **60/0**;
   `git diff --check` clean. A real Chromium browser (Edge headless, isolated web
   `:3005`, read-only) rendered the run page at 1440 and 420 px with the Summary
   present and the order Run overview → Summary → offerings; over the real
   populated data, cladding shows MDS 68.97 EUR/`per m2` with "20 x 117 x 3000
   mm", and rough-sawn shows three single-price groups (Gebhardt / Theile /
   Sturhan) with dimensions. The pre-backfill backup was restored into an
   isolated disposable database as a final check.
6. **Preserved.** Both research runs (`ba1fcdd0-…` `PAUSED`/`DIMINISHING_RETURNS`,
   cv7, 23/29/31/18 offerings; `c84763b1-…` `PAUSED`/`ACCESS_BLOCKED`, `FREE_ONLY`,
   cv2, 12/12/18/8 offerings) keep their policies, checkpoints and results. No
   research state changed; no research executed; no outreach.
7. **Non-blocking follow-up (recorded in `ops/backlog.md`).** Price groups
   currently separate on the raw free-text `treatmentText` wording and on
   materially different bases. For the rough-sawn run this yields three groups:
   Gebhardt (`…Qualität A/B`) vs Theile (`…parallel besäumt`) differ only in
   recorded grade/format wording (not equivalent unit labels), and Sturhan uses an
   area basis (`qm`) vs volume (`m³`) with `priceBasis = UNKNOWN`. These are
   **not** merged (grade/format and area-vs-volume are materially different /
   partly unknown). Optional future work: a display-preserving canonicalization of
   equivalent unit labels for grouping, and a canonical company id to replace the
   name-based dedup fallback. Neither is required for acceptance.
8. **Closure.** Operator accepted the implemented research flow and Summary (not
   complete market coverage). Archived here; `ops/current.md` reset. Finalization
   commit: `feat: add research run summary and verified price amounts` (see Git
   history). No new task started.
