# Ops Backlog — Root Manager

Ordered upcoming **manager** tasks. Only one is active (`ops/current.md`). The
agent must not start any of these without a new `ops/current.md`.

## Active

- None. (Last completed: O-017 — product-independent market research request flow
  + explicit cost/tool permissions; accepted 2026-09-17.)

## Next (candidate, priority order)

1. **Deferred research-persistence items** (separate bounded tasks, not the
   active slice): `research_contexts` frozen snapshots (so resume can read the
   run's frozen context version), `research-records`/findings, target-market
   suggestions, clarification requests, DB-backed report generation, and
   `activities`/`executions`/jobs/worker.
2. **Knowledge + Approvals human gate** — the next functional slice. Ref:
   `docs/system/module-map.md` §§4, 14; `docs/system/research-context-contract.md` §10.
3. **Research-records + full Market Researcher (+ jobs/worker)** — beyond the
   minimum run slice above.
4. **Discovery & intelligence** (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
5. **Outreach + inbox**.
6. **Finding → clarification → email (record only; not implemented).** Flow:
   result → clarification questions → email draft → human-approved sending →
   reply linked as evidence → reviewed finding correction. Prioritize uncertain
   or commercially important findings and consolidate questions per company;
   **supplier confirmation must remain distinguishable from independent
   verification**. No email sending and no nonfunctional action button until a
   bounded, approved slice exists.
7. ~~Repair the encoding-damaged `research_queries` rows and the silently
   best-fit-stripped records.~~ **Done under O-016** (2026-09-17): 22 text fields
   repaired data-only. The 9 ASCII search queries were left unchanged (may be
   intentional).

8. **Enforce research cost/tool limits in an execution engine (not only the
   harness).** O-017 stores `FREE_ONLY`/`METERED_APPROVED` permissions and
   `checkpoint.providerUsage` counters, but enforcement is currently
   agent-followed, not platform-enforced. A future runner/jobs slice should
   refuse over-limit provider calls and persist counters transactionally. No
   current tool exposes a controllable monetary budget, so a strict euro ceiling
   remains out of scope.

## Completed (for reference)

- O-017 — Product-independent market research request flow — **accepted**;
  archived `ops/done/2026-09-17-market-research-request-flow.md`. Product →
  Market research → New market research → Submit → "Queued — waiting for
  researcher"; the request persists as a `QUEUED` run and is discovered/intaken/
  claimed through the API (no supplied ids); Abachi and Cacao share one flow;
  verified end to end with a real queued run. Also adds explicit cost/tool
  permissions (`FREE_ONLY` default; `METERED_APPROVED` with finite provider call
  limits). **Known limitation:** provider call limits are agent-enforced through
  the harness, not by an execution engine. Both research runs preserved.
- O-016 — Repair research-text encoding end to end — **accepted**; archived
  `ops/done/2026-09-17-research-text-encoding.md`. Repaired 22 encoding-damaged
  text fields data-only (4 double-encoded `research_queries`; 6 `U+FFFD` fields;
  12 silent best-fit-stripped source/claim/evidence records) via an idempotent,
  compare-and-swap script, and fixed + verified the researcher UTF-8 write/read
  helper (`scripts/research/ResearchApi.psm1`) end to end against an isolated
  database. The real run is unchanged.
- O-015 — Replace standalone Node with nvm-windows on Windows — **accepted**;
  archived `ops/done/2026-09-17-windows-nvm-runtime-setup.md`. nvm-windows 1.2.2,
  Node 24.20.0 (`C:\nvm4w\nodejs`), pnpm 11.26.0 via corepack; `verify.sh` 60/0
  and `/health` + `/ready`.
- O-014 — Finalize and commit the research results dashboard (O-013) —
  completed; backed up and restored the DB (incl. 18 offerings) and pushed the
  milestone (`623b9dd`).
- O-013 — Research results dashboard (read-only; rounds 1–3) — **accepted**;
  archived `ops/done/2026-09-15-research-results-dashboard.md`. Adds the
  evidence-owned `research_offerings` read model, an offerings-led view, and the
  harness requirement to persist offerings per verified evidence.
- O-011 — First real resumable European research wave (LT / FI / GB) —
  **accepted/closed**; archived
  `ops/done/2026-09-15-first-research-wave-lt-fi-gb.md`. The database run remains
  `PAUSED` / `DIMINISHING_RETURNS`; European market research is **not** complete.
- O-010 — Persist market-research runs, sources, evidence, and claims (T-007) —
  completed; archived
  `ops/done/2026-09-15-research-persistence-and-product-discovery.md`.
- O-009 — Build the market researcher operating harness (completed; archived
  `ops/done/2026-09-15-market-researcher-operating-harness.md`).
- O-008 — Finalize and commit the verified research toolchain.
- O-007 — Equip and validate the research toolchain.
- O-005/T-006 — Catalogue + Research Context API vertical slice.
- O-001..O-004 — Root manager workspace, baseline commit/push, documentation
  reconciliation.

## Blocked / deferred

- Production deployment — deferred.
- External integrations in `soft/**` (search providers, email) — deferred;
  require a delegated task under `soft/AGENTS.md`. The manager research toolchain
  is manager-environment tooling only and does not authorize module integration.
- Research-execution/orchestration (running the harness end-to-end against live
  sources) — deferred beyond O-010, which persists results but executes no
  research.

## Historical note

`docs/redesign/**` and `legacy/**` are historical/superseded and non-live.
They inform terminology and design but are never the current authority. The
historical `legacy/docs/market-research-harness.md` informs the new canonical
harness but is **not** authoritative.
