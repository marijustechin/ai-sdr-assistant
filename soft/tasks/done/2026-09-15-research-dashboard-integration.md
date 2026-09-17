# Task: Research dashboard integration follow-ups (O-013 round 3)

**Status:** IN PROGRESS

## Objective

Wire the round-2 sales-manager view into the operating harness and close three
integration gaps: (1) require future runs to persist evidence-linked offerings
through the API; (2) flag an offering whose linked claim was later
replaced/retracted; (3) preserve other active filters when changing filters.

## Allowed scope

- `soft/apps/web/**` (filter preservation, offering review flag, tests)
- root `docs/system/research-harness/**` and `docs/system/research-toolchain.md`
- `ops/**`, `soft/tasks/**`

## Prohibited scope

- No new searches, commit, push or outreach; no change to run state, claims,
  evidence, checkpoint, or the four historical encoding-damaged query rows.
- No automatic copying of replacement text into structured offering fields.

## Architecture references

- `../AGENTS.md` §3, §5–§7; `AGENTS.md`
- `../docs/system/research-harness/{AGENTS,operating-manual,evidence-and-outputs}.md`
- `../docs/system/research-toolchain.md` §8

## Schema/migration impact

None (uses the existing `research_offerings` + claim lifecycle).

## Endpoint/contract impact

None.

## Acceptance criteria

- [x] Harness requires offerings be persisted per verified company/product/price
      evidence via the API; contract/dedup/unknown rules documented; general
      findings are not required to become offerings; not dashboard-dependent.
- [x] Offering linked to a REPLACED/RETRACTED claim is flagged for review (no
      silent "fully current"); values not overwritten from the replacement.
- [x] Changing one filter preserves the other namespace; "Clear filters" clears.
- [x] Applicable gates pass; run + the four damaged query rows untouched.

## Verification commands

- `pnpm --filter web run typecheck|lint|test`; `pnpm -r build`; `verify.sh`;
  `git diff --check`; browser check of filter preservation.

## Rollback/blocked conditions

Revert the web/harness changes. No blocker.

## Completion record

**Completed:** 2026-09-15 · **Status:** DONE (ready for human review).

1. **Harness (item 1).** `research-harness/AGENTS.md` run loop now includes
   "persist sources + evidence + claims + evidence-linked offerings";
   `operating-manual.md` §7 requires persisting an offering via
   `POST .../offerings` as in-scope company/product/price evidence is verified
   (citing `evidenceId`/`sourceReferenceId` and a CURRENT `claimId`), and states
   general findings stay claims; `evidence-and-outputs.md` documents the field
   set, mandatory provenance, `UNKNOWN`/null rules, fingerprint dedup, and
   correction consistency. Not dependent on manual dashboard population.
2. **Correction consistency (item 2).** Added `offeringClaimState` (resolves the
   linked claim through the existing lifecycle) and a review flag/banner on the
   offering card for `REPLACED`/`RETRACTED` links; the run page always fetches
   claim history so the flag can resolve. Structured offering fields are never
   overwritten from a replacement. No offering in the real run currently links to
   a historical claim, so the flag does not appear there; behaviour is unit-tested.
3. **Filter behavior (item 3).** `offeringFilterHref` and `claimFilterHref` now
   accept and preserve the other namespace; the run page threads both. Verified
   in served HTML (12 preserved hrefs) and counts (GB→10, sauna→8, exact→15 of
   18); "Clear filters" present and clears both.
4. **Verification.** `web typecheck|lint|test` pass (**76** web tests);
   `pnpm -r build` pass; earlier full suite **148 passed**; `verify.sh` **60/0**;
   `git diff --check` clean; headless-Chrome filter checks as above.
5. **Preserved.** Run `ba1fcdd0-…` unchanged (`PAUSED`/`DIMINISHING_RETURNS`, v7,
   19/8, 31 claims 22/6/3, 29 evidence, 18 offerings); the four historical
   double-encoded `research_queries` rows were not modified.
