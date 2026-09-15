# O-009 — Build the market researcher operating harness

**Status:** ARCHIVED 2026-09-15 by the manager while setting up O-010, which
superseded it as the active manager task. It was **not** archived on an explicit
human approval: O-009 was still at READY_FOR_HUMAN_REVIEW when O-010 began, so
its content is preserved here as historically complete-but-unapproved. The
original task, refinement, and coordination notes are retained verbatim below.
**Type:** direction (canonical instructions; documentation only)
**Scope:** root manager workspace docs — `docs/system/research-harness/`,
`docs/system/project-state.md`, `docs/README.md`, `README.md`, `ops/`.

## Objective

Create a coherent, reusable **operating workspace for the market researcher**,
built on the verified toolchain and the central-data architecture, so the
researcher can produce commercially useful, sourced market intelligence and
resume a run.

This is an **instructions harness for a research role**, distinct from the
unimplemented NestJS `market-researcher` module and from any business store.
Finding a few companies or running a fixed number of queries is **not**
completion.

## Inputs / references

- `AGENTS.md` (§2 workspace map, §3 live state vs Markdown, §5–§6 task loops and
  delegation, §7 hard prohibitions, §8 completion report, §9 harness safety)
- `docs/system/architecture.md`, `module-map.md`, `data-governance.md`,
  `research-context-contract.md`, `research-toolchain.md`, `project-state.md`,
  `decisions.md`
- `soft/packages/database/prisma/schema.prisma`;
  `soft/packages/contracts/src/{products,opportunities,research-context}.ts`;
  the implemented API controllers (`GET /opportunities/:id/research-context`,
  catalogue write routes)
- Prior art: `legacy/docs/market-research-harness.md` and
  `docs/benchmarks/2026-09-14-research-coverage-capability-test.md` (historical /
  non-canonical; inform, never authoritative)

## Steps

1. Inspected the existing researcher instructions, harness material, API
   contracts, and implemented persistence (schema + controllers).
2. Chose the canonical location `docs/system/research-harness/` (instructions
   for the researcher, consistent with `docs/system/` canonical operating
   context such as `research-toolchain.md`).
3. Wrote a concise `AGENTS.md` entry point plus the supporting instructions:
   operating manual, evidence/commercial outputs, coverage/stopping, persistence
   boundary, and a synthetic verification walkthrough.
4. Mapped every required input/output/checkpoint to existing API capability;
   documented minimum implementation requirements and **one** bounded proposed
   programmer task (not started).
5. Verified the harness with a clearly synthetic walkthrough (no live searches,
   no DB writes).
6. Updated canonical project state, the doc registers, and the backlog; left the
   task at READY_FOR_HUMAN_REVIEW (not archived).

## Deliverables

- `docs/system/research-harness/AGENTS.md` (entry point)
- `docs/system/research-harness/operating-manual.md`
- `docs/system/research-harness/evidence-and-outputs.md`
- `docs/system/research-harness/coverage-and-stopping.md`
- `docs/system/research-harness/persistence-boundary.md`
- `docs/system/research-harness/verification-walkthrough.md`
- updates: `docs/system/project-state.md`, `docs/README.md`, `README.md`,
  `ops/backlog.md`, `ops/current.md`

## Acceptance criteria

- [x] Researcher instructions consolidated and placed consistently with the
      canonical architecture; distinguished from the `market-researcher` module.
- [x] Entry point defines intake via the Research Context API using an
      opportunity ID; missing-information handling; planning; iterative
      discovery; tool selection/fallback; source verification/dedup/conflict/
      freshness; checkpoints, recovery, completion reporting.
- [x] Evidence/output rules cover suppliers/manufacturers/distributors, specs,
      public prices, pricing gaps, substitutes, market observations; each
      material claim requires URL, retrieval date, evidence, verification status;
      prices preserve currency/unit/VAT/dimensions/pack/commercial conditions and
      normalise only when inputs are known.
- [x] Required separations defined (exact vs substitute; location vs markets
      served; seller vs buyer suitability; unvisited vs rejected; evidence vs
      inference).
- [x] Coverage matrix + follow-up + stop/pause rules; no universal company-count
      threshold; unknown tool cost stays `UNKNOWN`.
- [x] Persistence boundary mapped honestly; no parallel Markdown/CSV business DB;
      minimum implementation requirements documented; one bounded programmer task
      proposed, **not started**.
- [x] Synthetic walkthrough proves the harness and marks executable-now vs
      requires-implementation.
- [x] Project state, doc registers, and backlog updated.
- [x] No application code, migration, database write, product onboarding, paid
      call, benchmark rerun, commit, or push.

## Out of scope

- Any application/API/business code, schema, or migration.
- Implementing or starting the `market-researcher` module or any other module.
- Writing `soft/tasks/current.md` (the proposed programmer task is a proposal
  only; the programmer loop is untouched).
- Product onboarding, live/database research, paid calls, benchmark reruns.
- Commit or push.

## Verification

- Cross-checked every persistence claim against `schema.prisma`, the implemented
  controllers, `module-map.md`, `data-governance.md`, and `project-state.md`.
- Walked the harness end-to-end with synthetic placeholders
  (`*.invalid` domains, `EXAMPLE` ids) — no live search, no DB write.
- Confirmed no `soft/**` file changed and no git commit was made.

## Rollback/blocked conditions

- Rollback: delete `docs/system/research-harness/` and revert the four edited
  files; nothing outside root docs/ops was touched.
- Blocked (do not archive): not applicable — task is complete pending review.
  Per instruction it is left in `ops/current.md` at READY_FOR_HUMAN_REVIEW rather
  than archived.

## Completion record

**Completed:** 2026-09-15 · **Status:** READY_FOR_HUMAN_REVIEW · **Type:**
direction (documentation only).

1. **Files created/changed**
   - created `docs/system/research-harness/AGENTS.md`,
     `operating-manual.md`, `evidence-and-outputs.md`, `coverage-and-stopping.md`,
     `persistence-boundary.md`, `verification-walkthrough.md`.
   - changed `docs/system/project-state.md` (O-009 record; harness row;
     research-persistence gap).
   - changed `docs/README.md` (doc register + reading order).
   - changed `README.md` (documentation table + current state).
   - changed `ops/backlog.md` (O-009 outcome; next candidates).
   - changed `ops/current.md` (this task).
2. **Migrations applied:** not needed.
3. **Endpoints/contracts added or changed:** none.
4. **Commands/inspections and results:** `git status` clean before work; file
   inspections of schema, contracts, controllers, and canonical docs (no code
   executed); no `soft/` command run.
5. **Test/verification evidence:** synthetic walkthrough
   (`verification-walkthrough.md`) executed as a documented reasoning exercise —
   intake, blocked source, ambiguous-unit price, pause/resume, coverage-gap
   report — with no network calls or DB writes. Persistence claims cross-checked
   against source-of-truth files.
6. **Known limitations:** the harness cannot persist any research output through
   the API today; run lifecycle/context freeze, evidence, research-records,
   suggestions, and clarification requests are all unimplemented. The proposed
   `evidence` slice is the first bounded unblock, with run-lifecycle as a
   separate dependent step. Gemini's model/token cost and Exa usage remain
   unobservable (`UNKNOWN`), and the O-007 coverage gaps (Germany thin, France
   partly Belgian, many `NOT_EVALUATED`) remain.
7. **Decisions made / blockers / next:** decision — the researcher harness is a
   canonical instruction set under `docs/system/`, not application source, and
   live research state must stay in PostgreSQL (no Markdown/CSV business store).
   No blocker. Next: human review of O-009 and a decision whether to delegate the
   proposed bounded persistence slice. No new task started; not committed or
   pushed.

### Refinement — 2026-09-15 (documentation correction only)

Before approval, the proposed next implementation task was refined to the
**minimum end-to-end scenario** and the supporting docs aligned. Status remains
**READY_FOR_HUMAN_REVIEW**; no implementation, live research, database write,
archive, commit, or push.

- `docs/system/research-harness/persistence-boundary.md` §3 — replaced the narrow
  `evidence`-only proposal with the **"minimum resumable research run"** slice:
  run envelope + evidence source/claim + checkpoint + pause/resume. It reuses the
  existing `research_runs` / `research_run_target_markets` tables and the
  canonical `contextVersion`; minimal deltas are `PAUSED` + a separate
  `pauseReason`, a run `checkpoint` field, and `claims.researchRunId`. Documented
  the context-change rule (block with `CONTEXT_CHANGED`, no silent rebase) and
  separated **lifecycle status** from **pause/block reason**. §1 table and §2 now
  mark what is in the slice vs deferred.
- `docs/system/research-harness/verification-walkthrough.md` — added the
  five-step **acceptance scenario** (start, record context version, persist
  source + linked claim, checkpoint, pause/resume in a fresh session) with
  indicative API calls, clearly marked **PROPOSED — NOT CURRENTLY EXECUTABLE**;
  corrected the pause/resume steps to the status-vs-reason model and the
  `CONTEXT_CHANGED` block.
- `docs/system/research-harness/coverage-and-stopping.md` §4 and
  `operating-manual.md` §8 — aligned pause terminology with the status-vs-reason
  model.
- `ops/backlog.md` — refined the "next candidate" entry to the single bounded
  slice and moved the other persistence items to deferred.
- `AGENTS.md` (root manager contract) — **added the explicit pointer**: before
  delegating research work the manager must read and cite
  `docs/system/research-harness/AGENTS.md`; its location under `docs/system/`
  does **not** auto-load it. Also registered it in the instruction hierarchy and
  workspace map.
- `docs/system/project-state.md` — updated the O-009 record to describe the
  refined proposal.
- Confirmed no `soft/**` change; no live research, DB write, commit, or push.

### Coordination update — 2026-09-15 (dependency: external research-result persistence)

**Status unchanged: READY_FOR_HUMAN_REVIEW.** Recorded only; O-009 is not
archived, and no implementation was started or delegated.

- A separate agent is already implementing database tables for research-result
  persistence. The proposed "minimum resumable research run" slice in
  `persistence-boundary.md` §3 is therefore **ON HOLD**: it must **not** be
  started or delegated, and its schema delta is a **proposal, not an approved
  migration plan**.
- The harness remains the source of required **behavior**; its persistence
  mapping must be **reconciled** with that agent's actual schema and API
  contracts before any delegation. `persistence-boundary.md` §4 lists the
  reconciliation inputs required; `ops/backlog.md` reflects the hold and adds a
  read-only reconciliation task.
- Boundaries honored: no other agent's files modified; `soft/tasks/**`
  (including `soft/tasks/current.md`) and `soft/docs/**` untouched; no `soft/**`
  change; no migration, live research, database write, paid call, commit, or
  push.
- Observed 2026-09-15 in this working tree (`main`): no research-result
  persistence migration/schema change is present (migrations still end at
  `20260910150428_research_context_fields`), and `soft/tasks/current.md` is the
  empty template. This is an observation, not a claim about the other agent's
  branch or revision.
- Awaiting from the other agent: the §4 details. Until then no implementation
  task is written to `soft/tasks/current.md`.

Nothing archived. O-009 stays at READY_FOR_HUMAN_REVIEW.
