# Ops Backlog — Root Manager

Ordered upcoming **manager** tasks. Only one is active (`ops/current.md`). The
agent must not start any of these without a new `ops/current.md`.

## Direction — automation-first SDR pipeline (2026-09-18)

This is an **automated SDR assistant**. The intended pipeline is
**product/objective intake → research → candidate discovery → evidence-based
qualification → contact discovery → initial email drafting → persisted
results**, and it should run **autonomously** within the approved scope, tool
permissions and execution limits. Human review is an **optional override and
exception path**, not a required action after every operation; an explicit human
rejection always wins. Email **drafting** is part of the workflow; actual
**sending is not authorized** (it stays behind approval). No new paid-service
permissions are implied.

**Works today (implemented, manager-run research):**

- Catalogue + Research Context API; product-independent research request flow
  with `FREE_ONLY`/`METERED_APPROVED` permissions and resume counters.
- Research-run persistence (sources/evidence/claims/offerings) + read-only
  results dashboard.
- Evidence-backed potential-buyer shortlist (**leads**) with **agent
  qualification** (`agentQualificationStatus`) kept separate from optional human
  review, and a computed contact-discovery eligibility; explicit human
  `REJECTED` wins.
- Source-backed business contacts (company-scoped) with per-contact provenance,
  idempotent dedup, published-vs-deliverability separation and unusable handling.
- Research execution is performed by the **manager-environment harness**, not by
  a platform runner.

**Requires orchestration implementation (not built):**

- A worker/jobs pipeline (`soft/apps/worker`, BullMQ) driving research →
  discovery → qualification → contact discovery → email drafting automatically.
- Execution-limit enforcement in a runner rather than the harness.
- `lead-evaluator` qualification records; `outreach-drafter` (draft only).
- No scheduler or background worker is implied by current tasks.

## Active

- None. (Last completed: O-020 — Source-backed business contacts and
  automation-first buyer progression; accepted 2026-09-18.)

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
4. **Autonomous pipeline orchestration (worker/jobs).** Drive research →
   candidate discovery → agent qualification → contact discovery → initial
   email drafting automatically within approved scope/limits (BullMQ
   `soft/apps/worker`); enforce execution limits in a runner rather than the
   harness. Includes discovery & intelligence (`lead-discoverer` →
   `lead-evaluator` → `company-intelligence` → `contact-discovery`). No
   scheduler/worker is implied by current tasks.
5. **Outreach drafting + inbox.** `outreach-drafter` produces drafts with full
   traceability (draft only). Sending stays human-approved and is **not
   authorized** here; "outreach + inbox" remains future work.
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

8. **Stale-qualification recovery/reassessment (bounded, not implemented).** A
   lead whose supporting finding was replaced/retracted must be able to receive
   updated evidence (via a **new** research run — never reopening a completed
   run) and then require an **explicit re-qualification** before progressing; a
   resubmitted lead must not silently re-validate a prior agent assessment.
   Today only generic endpoints exist (refresh the lead's provenance by
   re-submitting it with a CURRENT claim, then re-qualify); there is no
   dedicated recovery flow. Ref:
   `docs/system/research-harness/contact-discovery.md` §7.
9. **Enforce research cost/tool limits in an execution engine (not only the
   harness).** O-017 stores `FREE_ONLY`/`METERED_APPROVED` permissions and
   `checkpoint.providerUsage` counters, but enforcement is currently
   agent-followed, not platform-enforced. A future runner/jobs slice should
   refuse over-limit provider calls and persist counters transactionally. No
   current tool exposes a controllable monetary budget, so a strict euro ceiling
   remains out of scope.
10. **Price-grouping robustness (non-blocking, from O-018).** The run Summary
   groups prices by, among others, the raw free-text `treatmentText` and the exact
   unit label. Consequences to revisit (none block acceptance): (a) groups can
   separate on wording-only differences — e.g. part of the split between Gebhardt
   (`…Qualität A/B`) and Theile (`…parallel besäumt`) is recorded grade/format
   wording; (b) equivalent unit labels (`per metre`/`per linear metre`;
   `qm`/`per m2`/`m²`; `m³`/`cbm`) would separate groups if they coexisted in one
   run — a display-preserving canonicalization for grouping would fix this without
   conversion. Do **not** merge across unknown or materially different conditions
   (e.g. area-vs-volume bases, unknown grade). A canonical company id would also
   replace the name-based dedup fallback.

## Completed (for reference)

- O-020 — Source-backed business contacts and automation-first buyer
  progression — **accepted**; archived
  `ops/done/2026-09-18-source-backed-contacts-and-automation-first.md`. Adds the
  bounded `contact-discovery` slice (`contacts` + `contact_sources`, migration
  `20260918140000_add_contacts`), the automation-first **agent qualification**
  (`agentQualificationStatus` + stale guard, migration
  `20260918160000_add_agent_qualification`) kept separate from optional human
  review, a Contacts section on the lead detail page, and the harness procedure
  `docs/system/research-harness/contact-discovery.md`. First real batch: 3
  candidates agent-qualified, 6 source-backed contacts persisted (idempotent).
  Programmer records: `soft/tasks/done/2026-09-18-source-backed-business-contacts.md`,
  `2026-09-18-agent-qualification-automation-first.md`,
  `2026-09-18-contact-discovery-batch-1-and-stale-guard.md`. Stale-qualification
  recovery remains a bounded backlog item (item 8).
- O-019 — Evidence-backed potential buyer shortlist — **accepted**; archived
  `ops/done/2026-09-18-evidence-backed-buyer-shortlist.md`. Adds the bounded
  `lead-discoverer` slice (`companies` + `opportunity_companies`, migration
  `20260918090000_add_companies_opportunity_leads`), guarded leads API, the
  product **Leads** list/detail with an operator review action, presentation
  refinements, and an initial `UNREVIEWED` shortlist (3 candidates) from run
  `9e4e6d02…`. Programmer records:
  `soft/tasks/done/2026-09-18-evidence-backed-buyer-shortlist.md`,
  `soft/tasks/done/2026-09-18-leads-ux-refinements.md`. Contact discovery remains
  the next slice.
- O-018 — Research run Summary and Back-to-top cursor — **accepted**; archived
  `ops/done/2026-09-17-run-summary-and-price-amount.md`. Adds the run-scoped
  Summary (companies; offering counts; usable/unstructured/no-price states;
  Lowest/Highest observed prices within comparable groups; gaps), the Back-to-top
  cursor/focus fix, and an optional `research_offerings.price_amount_numeric`
  (migration `20260917160000_research_offering_price_amount`) with a bounded,
  verified backfill of 10 offerings. Acceptance covers the implemented research
  flow and Summary; it does **not** imply complete market coverage.
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
