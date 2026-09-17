# O-017 — Product-independent market research request flow

**Status:** CLOSED / ACCEPTED (human-approved 2026-09-17)
**Type:** direction (delegation) + intake + project-state + review
**Scope:** repository root `ops/`/`docs/system/` direction and the canonical
research harness, plus delegated `soft/` slices (schema, contracts, API, web,
tests) and the follow-on cost/tool-permissions increment.

## Objective

An operator can create any product, configure a **market research request** in
the dashboard, submit it, and see it waiting for the researcher ("Queued —
waiting for researcher"). The researcher discovers the queued request through the
API and retrieves everything needed — product context and the request's
goals/scope/questions/constraints/limits — **without** the human supplying
descriptions, files, or UUIDs. The flow supports arbitrary products (e.g. Cacao
beans); Abachi is existing business data, not a system-wide specialization.

## Inputs / references

- `AGENTS.md` §3, §5–§7; `soft/AGENTS.md`
- `docs/system/module-map.md`, `data-governance.md`, `architecture.md`
- `docs/system/research-context-contract.md`
- `docs/system/research-harness/AGENTS.md`, `operating-manual.md`,
  `persistence-boundary.md`, `coverage-and-stopping.md`
- `docs/system/research-toolchain.md` §8 (canonical UTF-8 helper) and §6
- Existing implementation: `Offer`, `Opportunity`, `TargetMarket`,
  `ResearchRun`, contracts, `research_offerings`, module ownership.

## Steps

1. Inspect and reuse the existing domain; no parallel task framework or duplicate
   lifecycle.
2. Persist request parameters on the run; validate geography, goals, segments and
   limits server-side; keep internal Offer/Opportunity IDs out of the operator
   workflow; reuse a suitable offer when unambiguous; never change an existing
   opportunity/run scope.
3. Add the dashboard flow (Market research access per product, new-request form,
   review summary, "Submit research request", queued state), product-independent.
4. Add the internal-key-protected researcher intake (discover, read, claim once)
   and the exact operator instruction in the harness.
5. Verify with isolated databases (Abachi + Cacao), idempotency, rollback,
   single claim, key enforcement, unchanged existing run; inspect in a browser.
6. Review: trace and resolve the cost-policy inconsistency; implement explicit
   cost/tool permissions.

## Deliverables

- `ops/current.md` (this task) + `ops/backlog.md` update; archived here.
- `soft/tasks/current.md` delegated tasks → archived to
  `soft/tasks/done/2026-09-17-market-research-request-flow.md` and
  `soft/tasks/done/2026-09-17-research-cost-tool-permissions.md`.
- `soft/` implementation: schema + migration, contracts, API (submission +
  intake + claim), web flow, tests.
- Canonical docs: harness intake instructions + cost/tool policy;
  `project-state.md`, `module-map.md`, `data-governance.md`, `decisions.md`.
- `soft/docs/` implementation/API docs.

## Acceptance criteria (all met)

- [x] Operator: product → Market research → New market research → review →
      Submit research request → "Queued — waiting for researcher".
- [x] Request parameters persist in PostgreSQL and are returned by the API.
- [x] Researcher discovers queued requests and retrieves product context +
      goals/scope/questions/constraints/limits without any human-supplied IDs.
- [x] Two execution attempts cannot both claim the same queued run.
- [x] Server-side validation for geography, goals, segments and limits; an
      unspecified segment is allowed without inventing a commercial segment.
- [x] Double-click/retry safe (idempotent submission); related writes are
      transactional.
- [x] The existing paused LT/FI/GB run and its scope are unchanged.
- [x] Abachi and Cacao beans use the same flow with no code changes.
- [x] Build/typecheck/lint/tests and `verify.sh` pass; rendered form + queued
      state inspected in a real browser; submission tests use isolated DBs.
- [x] Explicit cost/tool permissions (`FREE_ONLY`/`METERED_APPROVED`) implemented
      and tested (follow-on increment).

## Out of scope

- Background worker, scheduler, embedded LLM runtime, automatic OpenCode launch.
- Real research execution inside the implementation task; paid searches;
  outreach; commit/push.

## Verification

- `pnpm -r build|typecheck|lint|test`; `bash scripts/verify.sh`; `git diff --check`.
- API integration tests on isolated DBs (`ai_sdr_test_api`): validation, saved
  parameters, unspecified segments, idempotency, rollback, queued discovery,
  single/concurrent claim, key enforcement, Abachi + Cacao, existing run
  unchanged, cost/tool-policy persistence and validation.
- Browser inspection of the request form and the queued state.

## Rollback/blocked conditions

- Rollback: revert the delegated `soft/**` changes and the doc updates; the
  additive migration is reversible. No blockers.

## Completion record

**Completed/closed:** 2026-09-17 · **Status:** CLOSED / ACCEPTED (human-approved;
includes the real request-flow verification and explicit cost/tool permissions).

1. **Delegation.** Two bounded programmer tasks delegated via
   `soft/tasks/current.md` and completed; archived to
   `soft/tasks/done/2026-09-17-market-research-request-flow.md` and
   `soft/tasks/done/2026-09-17-research-cost-tool-permissions.md`.
2. **Implemented behavior.** Product → **Market research** → **New market
   research** → review → **Submit research request** → **"Queued — waiting for
   researcher"**. The request persists in PostgreSQL as a `QUEUED` `ResearchRun`
   (`request_parameters` JSONB + unique `request_key`); the researcher discovers
   it with `GET /research-requests?status=QUEUED`, reads parameters + product
   context with `GET /research-requests/:runId`, and claims it exactly once via
   `PATCH .../research-runs/:runId {status:'RUNNING'}` before persisting outputs
   with the canonical UTF-8 helper.
3. **Schema/migration.** One additive migration
   `20260917130000_research_requests` (`research_runs.request_parameters` JSONB +
   unique `request_key`). **API.** New `POST/GET /research-requests`,
   `GET /research-requests/:runId`; `research_runs` responses gain
   `requestParameters`; queued→running `PATCH` is a conditional claim.
4. **Verification (final).** `pnpm -r build|typecheck|lint|test` pass —
   **175 tests** (contracts 29, database 17, web 81, api 48); `bash scripts/verify.sh`
   **60/0**; `git diff --check` clean. Isolated-DB API tests cover Abachi and
   Cacao, saved parameters, `UNSPECIFIED` segment, idempotency (incl. concurrent
   duplicate), validation, transaction rollback, queued discovery,
   single/concurrent claim, internal-key enforcement, an unchanged existing
   run/scope, and cost/tool-policy persistence/validation. A real Chromium browser
   (isolated API `:3004` + web `:3005`) rendered the form and the queued state;
   the form is product-independent (no `sauna`/`facade`/`timber`).
5. **Real request-flow run (the actual researcher execution).** The operator
   submitted a request for **Rough-Sawn Abachi Lumber** (Germany; all five goals;
   segment identified during research) and the researcher discovered, claimed and
   executed it through the API without human-supplied ids, persisting 12 queries,
   11 sources, 12 evidence, 18 claims and 8 offerings (0 `U+FFFD`) plus a
   checkpoint (7 coverage cells, 7 follow-ups). It paused `ACCESS_BLOCKED` on
   provider free-quota exhaustion (Exa + Firecrawl), well inside the request's
   numerical limits. This is the end-to-end proof the flow works.
6. **Business state preserved.** Cladding run `ba1fcdd0-…` remains `PAUSED` /
   `DIMINISHING_RETURNS`, `cv7`, 23 queries / 29 evidence / 31 claims. The
   rough-sawn run `c84763b1-…` remains `PAUSED` / `ACCESS_BLOCKED` with its
   `FREE_ONLY` policy, checkpoint and results intact. Services `:3003`/`:3000`
   healthy; no test data written to the real development database.
7. **Researcher intake instruction.** Operator prompt (no ids): *"Pick up the next
   queued market research request and run it using the research harness."*
   Procedure in `docs/system/research-harness/operating-manual.md` §9.
8. **Known limitation (explicit).** **Provider call limits are currently
   agent-enforced through the harness, not enforced by an execution engine.**
   There is no background worker/scheduler/runner: a researcher agent follows the
   harness, calling `checkProviderCall` and persisting `checkpoint.providerUsage`;
   the platform does not itself refuse an over-limit call. A strict monetary
   (euro) ceiling is likewise not enforceable with the current tools (Exa/Gemini
   report no cost). Other limitations: scope/segment findings stay proposals
   (no automatic target-market mutation); `Product` has no aggregated
   research-status field.

## Review addendum — budget-policy trace and resolution (2026-09-17)

**1. Trace of `FREE_ONLY` — the operator did not select it; it was inherited.**
- Form/UI (`soft/apps/web`): `ResearchRequestFormValues` had **no** cost field and
  `buildResearchRequestInput()` hardcoded `costPolicy: DEFAULT_STANDARD_RESEARCH_SCOPE.costPolicy`;
  the only UI text was a static hint, "Free sources only; no paid searches."
- Contracts (`soft/packages/contracts/src/research-requests.ts`):
  `ResearchCostPolicySchema = z.enum(['FREE_ONLY'])` (only permitted value);
  `StandardResearchScopeSchema.costPolicy.default('FREE_ONLY')`;
  `DEFAULT_STANDARD_RESEARCH_SCOPE.costPolicy = 'FREE_ONLY'`.
- Harness: `research-harness/AGENTS.md` §3.7, `coverage-and-stopping.md` §5–§6,
  `operating-manual.md` §9, `research-toolchain.md` §6.
- Conclusion: the stored `costPolicy: FREE_ONLY` was a **system default that was
  the only allowed value**, not an explicit operator decision.

**2. Corrected execution-report statement (cost honesty).** Firecrawl keyless is
a free hosted tier that reports per-call `creditsUsed`. Exa's free MCP tier and
the Gemini grounding MCP **do not report usage or monetary cost → `UNKNOWN`**; the
Gemini key has Google billing enabled for the grounding entitlement. Therefore
`UNKNOWN` cost does **not** establish the calls were free. Correct framing: *no
billing configuration was changed, no plan purchased, no paid overage enabled* —
distinct from *no billable usage*. Observed usage preserved; no cost invented.

**3. Precise pause.** Exhausted: Exa `websearch` (free MCP tier) and Firecrawl
keyless MCP free rate limits. Remained: Gemini grounding and `webfetch`, but
neither substitutes for a discovery engine (grounded citations are redirect URLs
needing publisher confirmation; a grounded importer list proved partly wrong).
This is **provider free-quota exhaustion, not the request's numerical limits**
(12/40 queries, 11/120 sources). The run's `pauseReason` was corrected to
`ACCESS_BLOCKED` with a precise note.

**4. Resolution — explicit cost/tool permissions implemented.**
- Contract/form expose `FREE_ONLY` (default) and `METERED_APPROVED` with named
  providers + finite **call** limits, shown in the form and review summary.
  `FREE_ONLY` explains provider quotas can pause before the numerical limits;
  `METERED_APPROVED` states billable usage is permitted and monetary cost may be
  `UNKNOWN` (no euro cap).
- Pure `checkProviderCall` checks permissions/limits before a call; attempted
  calls (incl. retries/failures) count; counters persist in
  `checkpoint.providerUsage` for resume. Permissions (request) are separate from
  availability (counters). FREE_ONLY excludes potentially billable tools; credit
  ceilings are not offered; fallback guidance corrected (Gemini-grounded →
  `webfetch` is a valid candidate fallback); no new pause reasons.

## Closure

Human approved O-017 on 2026-09-17, including the real request-flow verification
and explicit cost/tool permissions. Archived here; `ops/current.md` reset. The
submitted request's policy and both research runs were preserved; no research was
resumed. Finalization commit: `feat: add product-independent research requests and
tool permissions` (see Git history). No new task started.
