# O-016 — Repair research-text encoding end to end

**Status:** CLOSED / ACCEPTED (human-approved 2026-09-17)
**Type:** direction (delegation) + intake + project-state
**Scope:** repository root `ops/`/`docs/system/` direction + manager tooling
(`scripts/research/`), plus delegated `soft/` slices (bounded maintenance repair
and one regression test). No schema/migration change; no research execution; no
endpoint change.

## Objective

Repair the locally-corrupted non-ASCII text already persisted in the live
research run so queries, source titles/publishers, and evidence read back
correctly through the API and the dashboard, and prevent recurrence by fixing and
documenting the **manager write path**. Human-authorized to touch existing
business records (including `evidence` and `source_references`, otherwise
immutable).

Root cause (observed, reproduced 2026-09-17): the manager wrote UTF-8 research
text through Windows PowerShell 5.1 `Invoke-RestMethod` with a **string** body;
the shell encodes it as Windows-1252 with .NET **best-fit** fallback, silently
destroying non-CP1252 characters (`ė`, U+0117, was transmitted as ASCII `e`,
`0x65`). A BOM-less `.ps1` is also read as CP1252 before it runs. Sending **UTF-8
bytes + `charset=utf-8`** round-trips exactly.

## Inputs / references

- `AGENTS.md` §3, §6, §7, §8; `soft/AGENTS.md` §3, §4, §7
- `docs/system/research-toolchain.md` §8; `docs/system/research-harness/AGENTS.md`;
  `operating-manual.md` §7; `evidence-and-outputs.md`; `persistence-boundary.md`
- `docs/system/data-governance.md`
- `ops/done/2026-09-15-research-results-dashboard.md` (affected-ID list)
- Human decisions (2026-09-17): repair the damaged records; the MatoSauna damaged
  character is `ė`; do not blanket-replace every `U+FFFD`; do not replace
  historical prices; extend to the silent best-fit-stripped records after review;
  fix and verify the researcher write path end to end.

## Steps

1. Record affected records; confirm intended text (reversible CP1252↔UTF-8 for
   queries; `U+FFFD`+`-` → `ė` for source/evidence, confirmed against the
   original source URLs).
2. Delegate a bounded programmer task for an auditable, idempotent,
   compare-and-swap maintenance script in `soft/packages/database`, a non-ASCII
   round-trip regression test, and the encoding docs.
3. Back up the DB before any mutation; keep exact before/after undo data
   **outside Git**.
4. Run the repair; confirm only the named rows/columns changed and re-runs are
   no-ops.
5. Verify via the database, the API, and the served dashboard; confirm the run
   envelope/claims/offerings unchanged.
6. Fix and verify the researcher write path end to end against an **isolated**
   database; point the harness/toolchain to the helper.
7. Update canonical project state/decisions; leave READY_FOR_HUMAN_REVIEW.

## Deliverables

- `ops/current.md` (this task) → archived here; `ops/backlog.md` update
- `soft/tasks/current.md` delegated tasks → archived:
  `soft/tasks/done/2026-09-17-repair-research-text-encoding.md`,
  `soft/tasks/done/2026-09-17-restore-silent-diacritics.md`
- `soft/packages/database/scripts/repair-research-encoding.mjs` (auditable,
  idempotent, compare-and-swap; also holds the diacritic-restore allowlist)
- `soft/packages/database/test/research-text-encoding.spec.ts` (round-trip guard)
- `scripts/research/ResearchApi.psm1` (canonical UTF-8 write helper),
  `scripts/research/Test-ResearchWriteEncoding.ps1` (isolated E2E verification),
  `scripts/research/fixtures/research-write-encoding.json` (synthetic fixture),
  `scripts/research/README.md`
- `docs/system/research-toolchain.md` §8; harness `operating-manual.md` §7,
  `persistence-boundary.md`; `docs/system/decisions.md`, `project-state.md`;
  `AGENTS.md` §2 map; `docs/README.md`
- Repair records + undo data + DB dumps kept **outside Git**

## Acceptance criteria

- [x] The 4 `research_queries.query_text` values are valid LT/FI text (no
      `U+FFFD`, no double-encoding).
- [x] The damaged `source_references`/`evidence` fields contain `ė` (and the
      separately authorized silent-loss fields their diacritics) with no `U+FFFD`.
- [x] No other column/row changed; `retrievedAt`, claim lifecycle, prices, run
      status, `contextVersion`, coverage/progress untouched.
- [x] The API returns the repaired text; the served dashboard shows it.
- [x] An exact before/after repair record (undo data) exists outside Git; the
      script is idempotent.
- [x] A regression test proves a non-ASCII write→read round-trip and no `U+FFFD`.
- [x] The manager write path is a concrete helper sending UTF-8 bytes +
      `charset=utf-8`, with UTF-8 input loading required and verified end to end.
- [x] `pnpm -r build|typecheck|lint|test` and `bash scripts/verify.sh` pass on the
      compliant Node runtime; `git diff --check` clean.

## Out of scope

- Any schema/migration change, new API endpoint, or general-purpose evidence
  editor; display-time replacements; rewriting prices/specifications; resuming
  the run; outreach/billing; unrelated `soft/**` changes.

## Verification

- DB: whole-database `U+FFFD` scan → none; affected rows re-read by ID.
- API: GET queries/sources/evidence → repaired text, 0 `U+FFFD`.
- Web: served run page renders the repaired strings.
- Isolated write-path E2E: `scripts/research/Test-ResearchWriteEncoding.ps1`
  against an isolated API (`:3004`, database `ai_sdr_test_api`) → PASS.
- Gates: `pnpm -r build|typecheck|lint|test` (**150 tests**),
  `bash scripts/verify.sh` (**60/0**, Git Bash), `git diff --check` clean.

## Rollback/blocked conditions

- Rollback: re-apply the recorded `before` values from the outside-Git repair
  records (per row), or restore the pre-task dumps.
- Blocked if a damaged character cannot be established without guessing (report
  unresolved) or the API is unavailable for end-to-end verification.

## Completion record

**Completed/closed:** 2026-09-17 · **Status:** CLOSED / ACCEPTED (human-approved).
No new task started.

1. **Files created/changed.**
   - Code: `soft/packages/database/scripts/repair-research-encoding.mjs`;
     `soft/packages/database/test/research-text-encoding.spec.ts`;
     `scripts/research/ResearchApi.psm1`,
     `scripts/research/Test-ResearchWriteEncoding.ps1`,
     `scripts/research/fixtures/research-write-encoding.json`,
     `scripts/research/README.md`.
   - Docs/tasks: `AGENTS.md` (§2 map), `docs/README.md`,
     `docs/system/decisions.md`, `docs/system/project-state.md`,
     `docs/system/research-toolchain.md` §8,
     `docs/system/research-harness/operating-manual.md`,
     `docs/system/research-harness/persistence-boundary.md`, `ops/backlog.md`,
     `ops/current.md`, this archive, and the two `soft/tasks/done/` archives.
   - Data: 22 text fields repaired (see below).
2. **Migration:** not needed. **Endpoints/contracts:** none added/changed.
3. **Repair evidence (data-only, human-authorized).**
   - **Batch 1 — 10 rows/fields:** the 4 double-encoded
     `research_queries.query_text` rows (lossless CP1252↔UTF-8) and 6 `U+FFFD`
     fields → `ė` (2 `source_references.title`, 1 `source_references.publisher`,
     3 `evidence.evidence_text`).
   - **Batch 2 — 12 records:** silent best-fit diacritic restoration (no
     `U+FFFD` marker), each token verified against the live source page: 4
     `source_references.title`, 1 `claims.statement`, 7 `evidence.evidence_text`.
     Examples: `dailylentes`→`dailylentės`, `dailylente`→`dailylentė`,
     `rusis`→`rūšis`, `SIUO METU SANDELYJE NETURIME`→`ŠIUO METU SANDĖLYJE
     NETURIME`, `LAMPOKASITELTY`→`LÄMPÖKÄSITELTY`, `lampokasiteltya`→
     `lämpökäsiteltyä`, `Ylojarvi`→`Ylöjärvi`, `myos`→`myös`, `varissa`→`värissä`,
     `ulkokayttoon`→`ulkokäyttöön`. The 9 ASCII search queries were left
     unchanged (may be intentional).
   - Script is compare-and-swap + idempotent: batch 1 re-run `noop 10`; batch 2
     re-run `noop 22`; whole-DB `U+FFFD` scan → none.
4. **Backup / undo-record references (outside Git).**
   - Dumps: `C:\Users\msmig\db-backups\ai-sdr\ai_sdr-20260917-111612.dump`
     (SHA-256 `B2646C66B6CF169BA0A43A05D217FBFF8CF981B893A6D2AF1A4C26A20CBA08`),
     `ai_sdr-20260917-112957.dump`
     (SHA-256 `45951B9A6336456B633C346C55C7A6FD5338FF59866707475257966FC42EBC85`).
   - Repair records/undo:
     `C:\Users\msmig\db-backups\ai-sdr\repair-records\2026-09-17T08-18-11-481Z-research-text-encoding.json`,
     `2026-09-17T08-30-19-265Z-research-text-encoding.json`, and the detection
     list `silent-bestfit-detected-2026-09-17.md`.
5. **Researcher write path fixed and verified end to end.**
   - Helper: `scripts/research/ResearchApi.psm1` (`Write-ResearchJson` /
     `Get-ResearchJson`; UTF-8 **bytes** + `charset=utf-8`; responses decoded as
     UTF-8; ASCII-only so it is BOM-independent).
   - Verification: `scripts/research/Test-ResearchWriteEncoding.ps1` drove
     PowerShell input → request → API → database → API read against an isolated
     API (`:3004`, database `ai_sdr_test_api`) and returned **PASS** for
     Lithuanian and Finnish (`dailylentė`, `dailylentės`, `rūšis`,
     `lämpökäsitelty`, `jälleenmyyjä`, `ä`, `ö`, `€`, `—`, `²`), byte-exact on the
     API read and on stored DB hex (`c497`, `c5a1`, `c5ab`, `c3a4`, `c3b6`,
     `e282ac`, `e28094`), no `U+FFFD`. The driver refuses `:3003` (real DB).
   - The negative control (PS 5.1 string body → `ė` sent as `e`, `0x65`) was
     reproduced earlier and is why the helper sends bytes.
   - Instructions require **UTF-8 input loading** as well as the helper (correct
     byte-sending cannot repair an already-corrupted input string); see
     `research-toolchain.md` §8, `operating-manual.md` §7,
     `persistence-boundary.md`, `scripts/research/README.md`.
   - `-ExecutionPolicy Bypass` is documented as **process-scoped** only; no
     machine/user execution policy was changed.
6. **Business state preserved.** Run `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1`
   remains `PAUSED` / `DIMINISHING_RETURNS`, `contextVersion 7`, coverage 19 /
   follow-ups 8, 23 queries, 29 evidence, 31 claims (22 `CURRENT` / 6 `REPLACED` /
   3 `RETRACTED`), 18 offerings. European market research remains **not**
   complete.
7. **Known limitations.** The 9 ASCII search queries remain ASCII (excluded by
   decision); some evidence paraphrases still differ from source wording (only
   diacritics were restored, not wording). `verify.sh` must run under Git Bash on
   this host (the `bash` on PATH is the WSL shim, which has no Linux `node`).
8. **Decisions recorded.** `docs/system/decisions.md` (2026-09-17): data-only
   repair, canonical write helper + UTF-8 input rule, never guess a character,
   never display-time "fixes", never blindly transcode.
9. **Closure.** Human approved O-016 (targeted repairs + verified UTF-8 write/read
   helper) on 2026-09-17; the task is archived here and `ops/current.md` reset.
   Finalization commit: `fix: preserve research text encoding and repair affected
   records` (see Git history). No new task started.
