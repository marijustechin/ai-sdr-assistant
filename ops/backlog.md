# Ops Backlog — Root Manager

Ordered upcoming **manager** tasks. Only one is active (`ops/current.md`). The
agent must not start any of these without a new `ops/current.md`.

Status vocabulary for entries below: `Active` (currently in `ops/current.md`),
`Next` (queued, not started), `Completed` (accepted/closed; archived in
`ops/done/`), `Blocked / deferred`. A task ID must appear under **exactly one**
status. See `docs/system/source-of-truth.md` for the maintenance rules.

## Direction — automation-first SDR pipeline (2026-09-18)

This is an **automated SDR assistant**. The intended pipeline is
**product/objective intake → research → candidate discovery → evidence-based
qualification → contact discovery → initial email drafting → persisted
results**, and it should run **autonomously** within the approved scope, tool
permissions and execution limits. Human review is an **optional override and
exception path**, not a required action after every operation; an explicit human
rejection always wins. Email **drafting** is part of the workflow; buyer
**sending is not authorized** (it stays behind approval). The market-research
supplier quote loop does have an explicit human-gated send (O-024/O-025
predecessors), but no autonomous buying/outreach sending exists. No new
paid-service permissions are implied.

**Works today (implemented, manager-run research):**

- Catalogue + Research Context API; product-independent research request flow
  with `FREE_ONLY`/`METERED_APPROVED` permissions and resume counters.
- Research-run persistence (sources/evidence/claims/offerings) + read-only
  results dashboard + run Summary.
- Evidence-backed potential-buyer shortlist (**leads**) with **agent
  qualification** kept separate from optional human review, plus computed
  contact-discovery eligibility; explicit human `REJECTED` wins.
- Source-backed business contacts (company-scoped) with per-contact provenance,
  idempotent dedup, published-vs-deliverability separation and unusable handling.
- Evidence-backed initial **outreach drafts**; reusable **sender profiles**;
  **email accounts** (SMTP/IMAP, encrypted secrets) with bounded human-run
  verification.
- **Price inquiry (RFQ) drafts**, **supplier quote collection** (human-gated
  send, bounded reply capture, quote extraction), and **research-result
  finalization** with DB-backed pending-quote follow-up scheduling.
- Research execution is performed by the **manager-environment harness**, not by
  a platform runner.

**Requires orchestration implementation (not built):**

- A worker/jobs pipeline (`soft/apps/worker`, BullMQ) driving research →
  discovery → qualification → contact discovery → email drafting automatically.
- Execution-limit enforcement in a runner rather than the harness.
- `lead-evaluator` qualification records; autonomous buying/outreach sending.
- No generic scheduler or background worker platform exists. The only scheduled
  background work is the opt-in (default off) in-process quote follow-up
  trigger (`FOLLOW_UP_SCHEDULER_ENABLED`), whose source of truth is the DB
  `quote_follow_ups` table.

## Active

None. No manager task is active — `ops/current.md` is in the idle form. Do not
start a task without a new `ops/current.md`.

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
   `lead-evaluator` → `company-intelligence` → `contact-discovery`). No generic
   scheduler/worker platform is implied by current tasks.
5. **Buyer outreach: sending, follow-ups and inbox.** Initial outreach drafts
   are implemented (O-021, draft only) and the **market-research** supplier
   quote loop has a human-gated send/reply path (O-024/O-025). Remaining for
   *buyer* outreach: approval-gated **sending** + transport (not authorized),
   follow-up sequencing, and inbox/reply handling. `outreach-drafter` remains
   the owner.
6. **Finding → clarification → email (record only; not implemented).** Flow:
   result → clarification questions → email draft → human-approved sending →
   reply linked as evidence → reviewed finding correction. Prioritize uncertain
   or commercially important findings and consolidate questions per company;
   **supplier confirmation must remain distinguishable from independent
   verification**. No email sending and no nonfunctional action button until a
   bounded, approved slice exists.
7. **Full Price Intelligence results UI** — a later task beyond the minimal
   run-page result summary delivered in O-025.
8. **Stale-qualification recovery/reassessment (bounded, not implemented).** A
   lead whose supporting finding was replaced/retracted must be able to receive
   updated evidence (via a **new** research run — never reopening a completed
   run) and then require an **explicit re-qualification** before progressing; a
   resubmitted lead must not silently re-validate a prior agent assessment.
   Ref: `docs/system/research-harness/contact-discovery.md` §7.
9. **Enforce research cost/tool limits in an execution engine (not only the
   harness).** O-017 stores `FREE_ONLY`/`METERED_APPROVED` permissions and
   `checkpoint.providerUsage` counters, but enforcement is currently
   agent-followed, not platform-enforced. A future runner/jobs slice should
   refuse over-limit provider calls and persist counters transactionally. No
   current tool exposes a controllable monetary budget, so a strict euro ceiling
   remains out of scope.
10. **Price-grouping robustness (non-blocking, from O-018).** Groups can
    separate on wording-only differences and equivalent unit labels; a
    display-preserving canonicalization for grouping would fix this without
    conversion. Do **not** merge across unknown or materially different
    conditions. A canonical company id would replace the name-based dedup
    fallback.

## Completed

<!-- machine-readable: archive-required-from=O-024 -->

Convention: every completed task from `O-024` onward must have an archive record
in `ops/done/` (the marker above is read by `scripts/verify-docs.mjs`); earlier
history predates it. Each task ID appears under exactly one status section.

- **O-026 — Documentation-state reconciliation and drift prevention** —
  accepted/committed; archive
  `ops/done/2026-09-25-documentation-state-reconciliation.md`. Commit hash: see
  git log (`docs(ops): reconcile project state and prevent documentation drift`).
- **O-025 — Research result finalization + pending-quote follow-up scheduling**
  — accepted/committed `7fbbfae`; archive
  `ops/done/2026-09-25-research-result-finalization-and-followups.md`.
  Programmer record: `soft/tasks/done/2026-09-25-research-result-followups.md`.
- **O-024 — Admin dashboard metrics + branding** — accepted/committed `2f7d479`
  (FSD-light foundation `e9a7f71`); archive
  `ops/done/2026-09-22-admin-dashboard-metrics-and-branding.md` (reconstructed).
  Programmer records:
  `soft/tasks/done/2026-09-22-admin-dashboard-metrics-and-branding.md`,
  `soft/tasks/done/2026-09-22-fsd-light-foundation-and-o023-slices.md`.
- **O-023 — FSD-light frontend foundation + prerequisite slices** —
  accepted/committed `e9a7f71`; programmer record
  `soft/tasks/done/2026-09-22-fsd-light-foundation-and-o023-slices.md`.
- **O-022 — Email accounts + sender-profile refactor** — accepted/committed with
  O-021 (`83cf88c`); the approved branding assets were committed separately
  (`b4eaf58`). Splits mailbox transport (`email_accounts`, SMTP + IMAP,
  encrypted secrets) from the sender identity; additive migration
  `20260922120000_add_email_accounts`. Archive
  `ops/done/2026-09-22-email-accounts-sender-profile-refactor.md`; programmer
  record `soft/tasks/done/2026-09-22-email-accounts-sender-profile-refactor.md`.
- **O-021 — Evidence-backed initial outreach drafts** — implemented as a bounded
  subset (draft only, no send path); accepted/committed with O-022 (`83cf88c`).
  Programmer record `soft/tasks/done/2026-09-18-evidence-backed-outreach-drafts.md`.
- **O-020 — Source-backed business contacts and automation-first buyer
  progression** — accepted/committed `b189cff`; archive
  `ops/done/2026-09-18-source-backed-contacts-and-automation-first.md`.
- **O-019 — Evidence-backed potential buyer shortlist** —
  accepted/committed `573098e`; archive
  `ops/done/2026-09-18-evidence-backed-buyer-shortlist.md`.
- **O-018 — Research run Summary and Back-to-top cursor** —
  accepted/committed `45f0dde`; archive
  `ops/done/2026-09-17-run-summary-and-price-amount.md`.
- **O-017 — Product-independent market research request flow** —
  accepted/committed `10aa9f6`; archive
  `ops/done/2026-09-17-market-research-request-flow.md`.
- **O-016 — Repair research-text encoding end to end** —
  accepted/committed `ea69acb`; archive
  `ops/done/2026-09-17-research-text-encoding.md`.
- **O-015 — Replace standalone Node with nvm-windows on Windows** —
  accepted/committed `8701348`; archive
  `ops/done/2026-09-17-windows-nvm-runtime-setup.md`.
- **O-014 — Finalize and commit the research results dashboard (O-013)** —
  completed; backed up and restored the DB and pushed the milestone `623b9dd`.
- **O-013 — Research results dashboard (read-only)** — accepted/committed
  `623b9dd`; archive `ops/done/2026-09-15-research-results-dashboard.md`.
- **O-011 — First real resumable European research wave (LT / FI / GB)** —
  accepted/closed `8225d23`; archive
  `ops/done/2026-09-15-first-research-wave-lt-fi-gb.md`. European market
  research is **not** complete.
- **O-010 — Persist market-research runs, sources, evidence, and claims
  (T-007)** — completed; archive
  `ops/done/2026-09-15-research-persistence-and-product-discovery.md`.
- **O-009 — Build the market researcher operating harness** — completed;
  archive `ops/done/2026-09-15-market-researcher-operating-harness.md`.
- **O-008 — Finalize and commit the verified research toolchain** —
  committed `5132b11`; archive
  `ops/done/2026-09-14-finalize-and-commit-verified-research-toolchain.md`.
- **O-007 — Equip and validate the research toolchain** — archive
  `ops/done/2026-09-14-equip-validate-research-toolchain.md`.
- **O-005/T-006 — Catalogue + Research Context API vertical slice** —
  committed `0eb3f5c`; archive
  `ops/done/2026-09-10-deliver-catalogue-and-research-context-vertical-slice.md`.
- **O-001..O-004 — Root manager workspace, baseline commit/push, documentation
  reconciliation** — archives under `ops/done/2026-09-10-*.md`.

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
`soft/legacy/**` is historical input preserved in the implementation workspace.
They inform terminology and design but are never the current authority.
