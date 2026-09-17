# Task: Restore silently best-fit-stripped diacritics (O-016 follow-up) — DONE

**Status:** COMPLETE (implementation); manager task O-016 left
READY_FOR_HUMAN_REVIEW. No commit/push.

## Objective

Under the human's 2026-09-17 decision, restore diacritics that were silently
best-fit-stripped (no `U+FFFD` marker) in 12 high-confidence, source-verified
prose/quote records. The 9 search queries were deliberately excluded (ASCII may
be intentional).

## Allowed / prohibited scope

- Allowed: the `RESTORE_TARGETS` allowlist added to
  `packages/database/scripts/repair-research-encoding.mjs`; the 12 rows/columns
  (data only); documentation; a fresh outside-Git backup + undo record.
- Prohibited: the 9 queries; any other row/column; schema/migration; endpoints;
  display-time replacement; price/`retrievedAt`/claim-lifecycle changes;
  commit/push; `legacy/**`.

## Schema/migration impact

- None. Data-only.

## Endpoint/contract impact

- None.

## Completion record

1. **Files changed.** `packages/database/scripts/repair-research-encoding.mjs`
   (added `RESTORE_TARGETS` + `applyFixes`, longest-token-first, compare-and-
   swap, idempotent); docs (`ops/current.md`, `ops/backlog.md`,
   `docs/system/decisions.md`, `docs/system/project-state.md`); this archive.
2. **Repair applied (data-only).** 12 records: 4 `source_references.title`,
   1 `claims.statement`, 7 `evidence.evidence_text`. Examples:
   `dailylentes`→`dailylentės`, `dailylente`→`dailylentė`, `rusis`→`rūšis`,
   `SIUO METU SANDELYJE NETURIME`→`ŠIUO METU SANDĖLYJE NETURIME`,
   `LAMPOKASITELTY`→`LÄMPÖKÄSITELTY`, `lampokasiteltya`→`lämpökäsiteltyä`,
   `lampokasiteltyna`→`lämpökäsiteltynä`, `Ylojarvi`→`Ylöjärvi`,
   `myos`→`myös`, `varissa`→`värissä`, `ulkokayttoon`→`ulkokäyttöön`,
   `pintakasiteltyna`→`pintakäsiteltynä`. Each token was confirmed against the
   live source page (Consolva, MDS Terasos, Pirtele, SaunaABC, PK-Puu, PR Wood,
   Puutoimi).
3. **Commands and results.**
   - dry-run → **repair 12 / noop 10**; apply → **repair 12** (record
     `…\repair-records\2026-09-17T08-30-19-265Z-research-text-encoding.json`);
     idempotent re-run → **noop 22**, exit 0.
   - whole-DB `U+FFFD` scan → none.
   - `pnpm --filter @ai-sdr/database test` → pass (17).
   - `bash scripts/verify.sh` (Git Bash) → **60/0**; `git diff --check` clean.
4. **Verification.** API (`:3003`) returns the restored text for the 4 titles, the
   claim, and all 7 evidence rows (0 `U+FFFD`). Served dashboard (`:3000`) renders
   `dailylentės`, `rūšis`, `Ylöjärvi`, `lämpökäsiteltyä`, `myös`,
   `ulkokäyttöön`.
5. **State preserved.** Run `ba1fcdd0-…` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `contextVersion 7`, coverage 19 / follow-ups 8,
   23 queries, 29 evidence, 31 claims, 18 offerings. Pre-mutation dump
   `ai_sdr-20260917-112957.dump` (SHA-256 `45951B9A…`).
6. **Known limitations.** The 9 search queries remain ASCII (excluded by
   decision). Some evidence paraphrases still differ from the source wording
   (e.g. `kostean tilan` vs `kosteiden tilojen`); only diacritics were restored,
   not wording.
7. **Rollback.** Restore `before` values from the outside-Git record, or restore
   the pre-task dump.
