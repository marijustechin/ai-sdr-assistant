# AGENTS.md — Market Researcher Operating Harness

**Status:** Canonical operating harness (O-009, created 2026-09-15). The
minimum resumable-run persistence it mapped is implemented (T-007, 2026-09-15);
the harness itself remains a role contract, not application code.
**Role owner:** the **market researcher** — a human or agent operating in the
manager environment.
**Canonical authority:** root `AGENTS.md`, then
`docs/system/architecture.md`, `module-map.md`, `data-governance.md`,
`research-context-contract.md`, `research-toolchain.md`, then this directory.

This directory is the entry point for **running sourced market research** with
the verified manager toolchain. It is an **operating contract for a research
role**, not application source and not a business-data store.

---

## 1. What this is — and what it is not

- **It is** the instructions, evidence rules, coverage/stopping rules,
  persistence map, and verification procedure for a research run.
- **It is not** the `market-researcher` NestJS module. A **minimal persistence
  subset** of that module (run envelope + `research_queries`) plus the `evidence`
  module now exists under `soft/apps/api/src/modules/` (T-007); the module's
  research **execution** is not implemented. This harness must never be treated
  as, or implemented as, application code.
- **It is not** a business database. Live business state — sources, claims,
  research records, findings, runs — belongs in PostgreSQL, reached only through
  the API. Markdown/CSV here are instructions, decisions, or generated report
  templates only (`AGENTS.md` §3; `data-governance.md`).

## 2. Objective

Produce **commercially useful, sourced market intelligence** for one
opportunity: suppliers / manufacturers / distributors, product specifications,
public prices, pricing gaps, substitute and adjacent products, and market
observations — with every material claim backed by an original source URL,
retrieval date, supporting evidence, and a verification status.

> Finding a handful of companies, or executing a fixed number of queries, is
> **not** completion. Coverage and evidence quality are.

## 3. Hard rules (never violate)

1. **No invented data.** Never invent a company, source, claim, price, URL,
   date, or product fact. An unanswered question is `UNKNOWN`, not a guess.
2. **Fact authority.** Only `CONFIRMED` + `OPERATIONAL` facts from the Research
   Context may be asserted. `PENDING` and `RESTRICTED` facts are `UNKNOWN`;
   their values are never exposed, interpolated, or guessed. `SUPERSEDED` facts
   are absent and never reasoned about
   (`research-context-contract.md` §6–§7).
3. **Product facts are closed to the researcher.** The researcher never creates
   or mutates `product_facts`. On a product-data gap it files a clarification
   request, not a fact.
4. **No business-state mutation.** Never mutate target markets, companies, or
   contacts; never send outreach; never make a commercial commitment. Findings
   and suggestions are proposals until a human approves them.
5. **Evidence vs inference.** Every material claim is separated into observed
   evidence or labelled inference; no chain-of-thought is stored
   (`AGENTS.md` §3, `evidence-and-outputs.md`).
6. **No parallel store.** Do not persist research as a Markdown/CSV database. If
   the API cannot persist an output, record the gap and pause; do not substitute
   Markdown for PostgreSQL (`persistence-boundary.md`).
7. **Spend only what the request permits.** The request stores a `costPolicy`:
   - `FREE_ONLY` — use only tools with an established free tier (Exa, Firecrawl);
     exclude potentially billable tools whose free usage cannot be established
     (`UNKNOWN` cost is not proof of free use). Free provider quotas are finite
     and external, so a run can pause on provider-quota exhaustion **before** the
     request's numerical limits are reached.
   - `METERED_APPROVED` — only the named providers, only within their finite call
     limits; attempted calls (including retries and failures) count, so check
     before each call and persist the counters for resume.
   Never purchase a plan or enable paid overage beyond the request's permission,
   and never promise a euro spending cap. Unknown tool cost stays `UNKNOWN`,
   never `0` (`coverage-and-stopping.md` §5–§6, `research-toolchain.md` §6).

## 4. The run loop (start here)

```text
opportunityId
  → intake: GET /opportunities/:id/research-context        (implemented)
  → plan: countries, languages, synonyms, applications,
          supplier types, channels                          (operating-manual.md §4)
  → discover → retrieve → verify (iterate)                  (operating-manual.md §5–§7)
  → persist sources + evidence + claims + evidence-linked offerings
  → checkpoint: persist run state + coverage + follow-ups   (persistence-boundary.md)
  → coverage check → stop/pause/follow-up                   (coverage-and-stopping.md)
  → report: coverage matrix + gaps + suggestions            (operating-manual.md §8)
```

**Resuming:** a run resumes from its persisted checkpoint (run id, context
version, coverage matrix, source/evidence/claim ids) through the API (T-007).
If a required output is genuinely unpersistable, follow
`persistence-boundary.md` — do not invent a store.

**Queued requests (operator-submitted).** A run may arrive as a research request
configured in the dashboard. Discover it with `GET /research-requests?status=QUEUED`,
read its persisted parameters and product context with
`GET /research-requests/:runId`, then claim it exactly once with
`PATCH .../research-runs/:runId { "status": "RUNNING" }` before executing — see
`operating-manual.md` §9. The operator supplies no ids, descriptions, or files;
the exact prompt is recorded there.

## 5. Supporting instructions

| File | Purpose |
|---|---|
| [`operating-manual.md`](operating-manual.md) | Intake, planning, iterative discovery, tool selection/fallback, source verification, checkpoints, recovery, reporting |
| [`evidence-and-outputs.md`](evidence-and-outputs.md) | Claim/source requirements, price-capture and normalisation rules, required separations, commercial output categories |
| [`coverage-and-stopping.md`](coverage-and-stopping.md) | Coverage matrix, depth, follow-up, stop/pause conditions, budgets, cost honesty |
| [`persistence-boundary.md`](persistence-boundary.md) | Every input/output/checkpoint mapped to API capability, with the delivered persistence schema/API recorded in §4 |
| [`contact-discovery.md`](contact-discovery.md) | Source-backed business contacts for **shortlisted** leads: prerequisites, procedure, provenance rules, separation from a completed research run, and cost/tool authorization |
| [`outreach-drafting.md`](outreach-drafting.md) | Preparing an evidence-backed **initial outreach draft** for an eligible lead: recipient selection, supported content, missing-information handling, idempotent persistence, and the autonomy/sending boundary |
| [`verification-walkthrough.md`](verification-walkthrough.md) | Synthetic, non-live walkthrough proving the harness and marking executable-now vs requires-implementation |

Canonical companions outside this directory:
`docs/system/research-toolchain.md` (tools, auth, selection, limits),
`docs/system/research-context-contract.md` (the input contract),
`docs/system/data-governance.md` (table ownership),
`legacy/docs/market-research-harness.md` (historical input — informs, never
authoritative).

## 6. Completion report (every run)

A run reports: objective and scope; context version used; coverage matrix with
explicit gaps; evidence with retrieval dates and verification status; claims
separated into evidence/inference and exact-match/substitute; prices with
original values, units, VAT treatment, and any derivation; unvisited vs rejected
candidates; suggestions and clarification requests; stop reason; and tool usage
with cost marked `UNKNOWN` where unobservable. Persist what the API supports and
state what it does not (`persistence-boundary.md`).
