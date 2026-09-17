# Task: Repair persisted research-text encoding (bounded, auditable) — DONE

**Status:** COMPLETE (implementation); manager task O-016 left
READY_FOR_HUMAN_REVIEW. No commit/push.

## Objective

Repair the known encoding-damaged non-ASCII text already persisted in the live
research run with a bounded, idempotent, compare-and-swap maintenance script, and
add a regression test proving a non-ASCII write→read round-trip. Human-authorized
for exactly the allowlisted records below; evidence/`source_references` are
otherwise immutable. No other data changed.

Allowlist (fixed): 4 `research_queries.query_text` rows
(`3487472b…`, `6160aabc…`, `0b53f12a…`, `424f26fc…`); `U+FFFD` fields
`source_references.title` (`e0bd06b4…`, `9bb0301a…`), `source_references.publisher`
(`b598d75b…`), `evidence.evidence_text` (`ae33d1e0…`, `904003c6…`, `d980cdd2…`).

## Allowed / prohibited scope

- Allowed: `packages/database/scripts/repair-research-encoding.mjs`,
  `packages/database/test/research-text-encoding.spec.ts`,
  `docs/system/research-toolchain.md` §8, and the allowlisted rows.
- Prohibited: schema/migration change; new endpoint; general-purpose evidence
  editor; display-time replacement in the web app; price/specification rewrite;
  `retrievedAt`/claim-lifecycle edits; resuming the run; commit/push;
  `legacy/**`.

## Schema/migration impact

- **None.** Data-only repair of text columns.

## Endpoint/contract impact

- **None.** Repair is out-of-band; API unchanged.

## Completion record

1. **Files created/changed.**
   - new `soft/packages/database/scripts/repair-research-encoding.mjs`
   - new `soft/packages/database/test/research-text-encoding.spec.ts`
   - modified `docs/system/research-toolchain.md` (§1 Node version; §8 rewritten
     with the reproduced defect + required write pattern)
   - modified `docs/system/research-harness/persistence-boundary.md` (writer note)
   - modified `docs/system/project-state.md`, `docs/system/decisions.md`
   - manager-loop files: `ops/current.md`, `ops/backlog.md`, `soft/tasks/current.md`
   - data: 10 text fields across 10 rows (4 queries + 3 source fields + 3 evidence)
2. **Migration:** not needed.
3. **Endpoints/contracts:** none added or changed.
4. **Commands and results.**
   - `node scripts/repair-research-encoding.mjs --dry-run` → repair 10, no
     unresolved/missing/conflict.
   - apply run → **repair 10**; record
     `…\repair-records\2026-09-17T08-18-11-481Z-research-text-encoding.json`.
   - idempotent re-run → **noop 10**, exit 0.
   - whole-DB scan of every public `text`/`varchar`/`json`/`jsonb` column for
     `U+FFFD` → **none**.
   - `pnpm -r build | typecheck | lint | test` → all pass (**150 tests**:
     contracts 17, database 17, web 76, api 40).
   - `bash scripts/verify.sh` (Git Bash) → **60 passed / 0 failed**.
   - `git diff --check` → clean (LF/CRLF notices only).
5. **Test/verification evidence.**
   - New `research-text-encoding.spec.ts` stores and reads back LT/FI text (`ė š
     ū ą ä ö`), `U+20AC`, `U+2014` byte-exactly with no `U+FFFD`.
   - Live API (`:3003`): the 4 queries and 6 fields return the repaired text; 0
     `U+FFFD` across 23 queries / 28 sources / 29 evidence.
   - Served dashboard (`:3000`, production build): run page renders `dailylentė`,
     `tiekėjas`, `lämpökäsitelty`, `Pirtelė`, `rūšis`, `jälleenmyyjä`; 0 `U+FFFD`.
   - Run state preserved: `PAUSED` / `DIMINISHING_RETURNS`, `contextVersion 7`,
     coverage 19 / follow-ups 8, queries 23, evidence 29, claims 31
     (22 `CURRENT` / 6 `REPLACED` / 3 `RETRACTED`), offerings 18. Pre-mutation
     backup `…\ai_sdr-20260917-111612.dump` (SHA-256
     `B2646C66B6CF169BA0A43A05D217FBFF8CF981B893A6D2AF1A4C26A20CBA08`).
   - Fix: `convert_to(...,'WIN1252')` errors once a value is already repaired;
     wrapped it in `pg_temp.try_cp1252_roundtrip` so an already-clean value is a
     no-op (ensures idempotency).
6. **Known limitations.**
   - The scan found **~20 additional records with silent best-fit diacritic loss
     and no `U+FFFD` marker** (8 queries, 7 evidence, 4 source titles, 1 claim;
     e.g. `lampokasitelty`, `dailylentes`, `Ylojarvi`, `myos`). These are
     **outside the approved allowlist** and their intended wording is not always
     certain, so they were **detected and reported, not rewritten** (manager
     follow-up decision required).
   - `source_references.title` `b598d75b…` is one of those (`Termo abachi
     dailylentes … A rusis`) while its `publisher` was repaired to `UAB Pirtelė`.
   - `verify.sh` must be run with Git Bash on this host: the `bash` on PATH is the
     WSL shim, which has no Linux `node`.
7. **Decisions/blockers.** No blocker. Prevention recorded in
   `research-toolchain.md` §8 and `decisions.md` (2026-09-17). The silent
   best-fit-strip class is queued as a follow-up in `ops/backlog.md`.

## Rollback

- Restore the `before` values from the outside-Git repair record, or restore the
  pre-mutation dump. The script is idempotent (re-runs are no-ops).
