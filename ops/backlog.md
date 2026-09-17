# Ops Backlog — Root Manager

Ordered upcoming **manager** tasks. Only one is active (`ops/current.md`). The
agent must not start any of these without a new `ops/current.md`.

## Active

- **O-014 — Finalize and commit the research results dashboard (O-013)** — close
  O-013, sync project state/backlog, take and restore-verify a new local database
  backup (incl. the 18 offerings), run the gates, and commit/push the reviewed
  changes. Status: **IN PROGRESS** in `ops/current.md`.

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
7. **Repair the four historical encoding-damaged `research_queries` rows.**
   They are double-encoded (CP1252↔UTF-8) and recoverable; a future bounded task
   with explicit human approval may transcode only those rows (IDs recorded in
   `ops/done/2026-09-15-research-results-dashboard.md`). No blind bulk rewrite.

## Completed (for reference)

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
