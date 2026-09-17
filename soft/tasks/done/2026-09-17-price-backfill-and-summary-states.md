# Task: Verified price-amount backfill + Summary price states (O-018 continuation) — DONE

**Status:** COMPLETE (implementation); O-018 left READY_FOR_HUMAN_REVIEW. No
commit/push, no new research.

## Objective

Populate `priceAmountNumeric` on existing offerings in BOTH runs where the linked
evidence unambiguously states a price (preserving `priceText` and provenance);
keep dimensions visible beside price extrema; distinguish "price recorded but not
structured yet" from "no public price found"; update the harness so future
offerings record the numeric amount when the evidence states an unambiguous
price.

## Backfill (bounded, human-authorized)

- **Path:** re-`POST .../offerings` with the offering's unchanged fingerprint
  fields + `priceAmountNumeric` → the deterministic per-run fingerprint matches,
  so the existing row is **updated in place**. A guard asserts the returned id
  equals the expected id (a duplicate would abort). Idempotent: a re-run updated
  the same 10 ids with no new rows (26 offerings before and after).
- **Backup (outside Git):** `C:\Users\msmig\db-backups\ai-sdr\ai_sdr-20260917-152437-o18-backfill.dump`
  (88,187 B, SHA-256 `9A4360BC…`).
- **Audit map (outside Git):**
  `C:\Users\msmig\db-backups\ai-sdr\repair-records\price-backfill-2026-09-17T12-24-45Z.json`
  (before/after amount, before/after `priceText` and `priceUnit`, VAT, evidenceId).
- **Populated (10; only unambiguous single amounts from linked evidence):**
  - Cladding run (7): Coyletimber 7.00 GBP/per metre (ex VAT); Finnmark Sauna
    591.95 EUR/per m2; Kebur 11.80 GBP/per linear metre; Linwood 12.00 GBP/per
    linear metre; **MDS Terasos 68.97 EUR/per m2** (VAT included; verified per the
    operator's example — its combined unit "per m2 / per board" was set to
    "per m2" to match the number's basis); Pirtele.lt 69.00 EUR/per m2; The Timber
    Group 8.45 GBP/per metre (ex VAT).
  - Rough-sawn run (3): Gebhardt 2.221,73 EUR/m³ (incl. VAT); Theile 1.975,40
    EUR/m³ (incl. VAT); Sturhan 55,45 EUR/qm (incl. VAT).
- **Deliberately NOT populated (no single unambiguous number):** MatoSauna
  (per-length range), PK-Puu (per-variant values), Sauna Direct (range),
  SaunaInter (per-pack AND per-m²), UAB Vedrana (wholesale AND retail, per piece
  AND per m²), Southgate ("from around …"), and every offering with no price.
  These remain "price recorded but not structured" / "no price recorded".
- `priceText` and provenance were preserved for every offering (verified in the
  audit map and via API read-back).

## UI (Summary)

- `PriceExtreme` now carries `dimensionsText`; extremum rows show the product and
  its dimensions (e.g. "20 x 117 x 3000 mm"), and the section notes "Observed
  prices — specifications (including dimensions) may differ across offerings".
- New run-scoped counts distinct from missing values:
  `pricedOfferingCount` (structured), `unstructuredPriceCount` (price recorded
  but not structured), `noPriceRecordedCount` (no price information). The price
  section explains each state and never shows a missing value as `0`. Single-price
  groups show one "Observed price"; multi-price groups show "Lowest observed" /
  "Highest observed".

## Harness

- `operating-manual.md` §7 and `evidence-and-outputs.md` §1.1/§2 now require
  recording `priceAmountNumeric` whenever the linked evidence states an
  unambiguous single amount (with currency/unit/VAT), while never collapsing a
  range, a "from/around" figure, or multiple bases into one number.

## Verification

- `pnpm -r build|typecheck|lint|test` pass — **186 tests** (contracts 31,
  database 17, web 89, api 49); `verify.sh` pending; `git diff --check` clean.
- Real-browser (Edge headless, isolated web read-only) confirmed the Summary over
  the real populated data: cladding shows MDS 68.97 EUR/per m2 with
  "20 x 117 x 3000 mm"; rough-sawn shows 3 groups (Gebhardt 2,221.73 EUR/m³;
  Theile 1,975.4 EUR/m³; Sturhan 55.45 EUR/qm), each with dimensions.

## Preserved

- Both runs keep status/policies/checkpoints/results; no research state changed
  (only the offerings' numeric amount). No searches, outreach, commit or push.

## Rollback

- Restore the pre-backfill dump; the additive column remains.
