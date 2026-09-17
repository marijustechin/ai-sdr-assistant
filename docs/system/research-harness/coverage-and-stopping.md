# Depth, Coverage, and Stopping Rules

**Status:** Canonical operating harness (O-009). Entry point:
[`AGENTS.md`](AGENTS.md).

---

## 1. Coverage matrix

A run is managed by a **coverage matrix**, not a raw company count. The matrix
crosses the run's scope with the evidence dimensions and records a status and the
best evidence found for each cell.

Suggested axes (adapt to the opportunity):

- **Rows — markets:** each `targetMarketId` (country/region × segment) in scope.
- **Columns — evidence dimensions:** suppliers/manufacturers; distributors;
  product specifications; public prices; substitutes; market observations
  (terminology, channels, regulation).
- **Application slice —** where both are in scope, slice each market by
  application segment (**sauna/bathhouse**, **exterior/facade**). Both are core;
  neither substitutes for the other, they are not averaged together, and each
  segment's importance is an evidenced finding whose priority adapts by country.

Cell status values:

| Status | Meaning |
|---|---|
| `COVERED` | At least one verified source supports the cell's evidence. |
| `PARTIAL` | Some evidence, with a named gap (e.g. price only ambiguous, only one supplier type). |
| `GAP` | No verified evidence; a reason is recorded (no local-language results, access blocked, out of scope). |
| `NOT_IN_SCOPE` | Deliberately excluded; the exclusion is stated. |

The matrix is the run's map: it drives the next queries and it is what the
completion report explains. A cell moves only on **verified** evidence.

## 2. Depth

Depth is judged per cell, not globally:

- Prefer a **small number of verified, primary-sourced** entries over a large
  list of unvisited names.
- A market is not "covered" because a SERP returned names; it is covered when
  the relevant evidence dimensions have fetched, dated sources.
- Follow named leads far enough to establish (or reject) exact-match status
  before broadening to new query families.
- Do **not** set a universal company-count threshold. Scope, market breadth, and
  the number of supplier types and channels determine what "enough" means; the
  threshold is chosen per run and justified, not assumed.

## 3. Follow-up investigation

Two categories always earn a follow-up:

1. **Promising findings** — a verified seller, an unusual price, a new synonym,
   an association/directory, a certification, or a channel that could open more
   of the market. Follow-ups extend coverage rather than re-confirming what is
   already known.
2. **Contradictory findings** — sources that disagree. Log both, then attempt to
   resolve via an independent source. If unresolvable, report the conflict as an
   explicit gap; never average or silently prefer one side.

## 4. Stop / pause conditions

Stop, complete, or pause a run when any of these holds — and state which.
**Lifecycle status and pause reason are separate dimensions:** a pause sets
`status = PAUSED` **plus** a `pauseReason`; a reason is never encoded as a
status. Completion sets `status = COMPLETED` even when coverage gaps remain
(partial coverage is a checkpoint property, not a status). See
`persistence-boundary.md` §3.

- **Coverage achieved** — every in-scope cell is `COVERED` with verified
  evidence and no follow-up is material. Complete (`status = COMPLETED`).
- **Diminishing useful discoveries** — assessed **per coverage area** (one
  market × application segment × evidence dimension cell), not globally: when an
  area stops returning new unique verified evidence after its bounded effort,
  stop *that area* and continue the others. Pause/complete with
  `pauseReason = DIMINISHING_RETURNS` (or complete) only when the remaining
  in-scope areas are exhausted or a budget/access limit is reached.
- **Unresolved access problem** — a source class is blocked (paywall, consent
  wall, login, ToS restriction) such that further effort cannot verify the
  claim. Pause with `pauseReason = ACCESS_BLOCKED` and the named obstacle; do
  not scrape login-gated or ToS-restricted content.
- **Run budget reached** — a declared budget limit (queries, pages, sources,
  minutes) is hit. Pause with `pauseReason = BUDGET_EXHAUSTED` and publish
  partial results.
- **Persistence failure** — a run record genuinely cannot be written through the
  API (transient outage). Pause with `pauseReason = NEEDS_HUMAN` and record the
  gap; never divert business state into Markdown. (The earlier
  `AWAITING_PERSISTENCE` reason retired when the persistence slice landed,
  T-007.)
- **Context changed since the run started** — the opportunity's current
  `contextVersion` differs from the run's. Pause with
  `pauseReason = CONTEXT_CHANGED` and require explicit human direction; never
  silently rebase (`persistence-boundary.md` §3).

Stopping is not failure. A paused run preserves its checkpoint, its sources,
its validated claims, and its coverage matrix with gaps, so it can resume.

## 5. Budgets

- Budgets are declared per run (queries, page fetches, sources, minutes) and are
  the run's own limits; defaults from the historical harness are a starting
  point, not a rule (`legacy/docs/market-research-harness.md` §2-§3).
- Stop conditions take precedence over "completing" a budget: stop early when
  coverage is achieved.
- Respect provider quota discipline (`research-toolchain.md` §6): one retry on
  a rate-limit notice, short inter-call delays, no aggressive retry loops, no
  purchased plans, no paid overages.
- **Cost/tool permissions are part of the budget.** The request stores a
  `costPolicy`: `FREE_ONLY` permits only tools with an established free tier;
  `METERED_APPROVED` permits named providers within finite call limits. Check
  permissions and limits *before* each call; count **attempted** calls (retries
  and failures included) against the limit and persist the counters in the run
  checkpoint (`providerUsage`) so a resume cannot exceed it.
- Provider **permissions** (what the request allows) are separate from provider
  **availability** (current quota/health), which is temporary and observed at run
  time.
- **Credit ceilings only where consumption is controllable.** A call-count limit
  is always enforceable; a credit limit is a hard ceiling only where pre-call
  consumption can be controlled. A provider that reports usage only *after* the
  call (e.g. keyless Firecrawl credits) cannot be held to a strict credit
  ceiling.
- **Numerical limits ≠ provider quotas.** The request's numerical limits
  (queries/sources/minutes/countries) and provider free quotas are independent;
  provider-quota exhaustion can pause a run before the numerical limits are
  reached.

## 6. Cost honesty

- Tool usage and cost that the tools do not report remain **`UNKNOWN`** — never
  recorded as `0`. Exa usage/cost and the Gemini MCP's model/token cost are
  not observable today; Firecrawl keyless reports `creditsUsed` per call.
- Report the usage that *is* observable (e.g. Firecrawl credits), and mark the
  rest `UNKNOWN` with why.
- **`UNKNOWN` cost is not proof of free usage.** When a tool reports no
  usage/cost, record `UNKNOWN` (never `0`) and do not state that the calls were
  free.
- Keep **"no billing configuration changed / no plan purchased / no overage
  enabled"** distinct from **"no billable usage"**: the former is within our
  control, the latter is not provable when the tool reports nothing.
- **Do not promise a hard euro spending cap.** No current tool exposes a
  controllable monetary budget; bound `METERED_APPROVED` usage by approved call
  counts instead.
- The remaining budget/balance is not a spend target; do not spend to a balance.
