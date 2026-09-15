# Verification Walkthrough (Synthetic, Non-Live)

**Status:** Canonical operating harness (O-009). Entry point:
[`AGENTS.md`](AGENTS.md).

> **This walkthrough is entirely synthetic.** No live search was run, no network
> request was made, and no database row was written. Every ID, company, price,
> URL, and date below is a placeholder, and `*.invalid` domains are
> non-resolvable by design. Nothing here is a business record, a source, or a
> claim about any real market. The purpose is to prove the harness's decision
> logic and to mark which steps run today and which need implementation.

> **Update (T-007, 2026-09-15):** research-result persistence is now implemented
> (run + queries + sources/evidence/claims + checkpoint + pause/resume), and
> Steps 3–8 below have been reconciled to that reality. The decision-logic proof
> is unchanged.

---

## Synthetic inputs

```text
opportunityId : 11111111-1111-4111-8111-111111111111   (EXAMPLE)
contextVersion: 7
targetMarket  : 22222222-2222-4222-8222-222222222222   (EXAMPLE)
                country "Exampleland", segment "example segment"
context facts : confirmed: []                          (none assertable)
                pending  : [{ key: "pack_size" }]      → UNKNOWN
                restricted: []
unknowns      : ["origin", "price_unit"]
```

---

## Step 1 — Start from an opportunity ID (intake)

**Action:** `GET /opportunities/1111.../research-context` with the internal key
(idempotent read; no write).

**Expected:** payload with `schemaVersion = "research_context_v1"` and
`contextVersion = 7`.

**Checks:**
- version recognised → proceed; an unknown version would stop the run;
- `scope.targetMarketIds` non-empty → scope recorded;
- `facts.confirmed` is empty → **no product property may be asserted**;
- `facts.pending` `pack_size` and `unknowns` seeded into the run's open
  questions as `UNKNOWN`.

**Status: executable now** (the endpoint is implemented).

## Step 2 — Plan

**Action:** build the coverage matrix rows from `targetMarket` and columns
suppliers / distributors / specifications / prices / substitutes / market
observations. Plan query families in the market's local language plus product
synonyms.

**Status: executable now** (the toolchain is verified;
`docs/system/research-toolchain.md`). No query is actually run in this
walkthrough.

## Step 3 — Missing specification

**Scenario:** the plan needs `pack_size` to interpret a price. The context has
`pack_size` as a **PENDING** fact.

**Harness decision:**
- treat `pack_size` as `UNKNOWN`; do **not** infer it from a supplier's page and
  do **not** present any value;
- file a **clarification request** (`question`, `relatedFactKeys: ["pack_size"]`)
  for the product-data owner;
- record the affected price cell as `PARTIAL` pending an answer.

**Status: NOT executable now.** Filing a clarification request has no surface —
`clarification_requests` is planned (`persistence-boundary.md` O10); the
`market-researcher` module exists only as the run-envelope subset (T-007). Record
the question in the run checkpoint and pause with `NEEDS_HUMAN`.

## Step 4 — Blocked source

**Scenario:** a candidate's product page at `https://supplier.example.invalid/`
returns a consent/login wall. `webfetch` is incomplete; one `firecrawl_scrape`
fallback also returns the wall.

**Harness decision:**
- retry the **temporary** failure at most once, then stop;
- record the source as `BLOCKED` (no fabricated content);
- do **not** substitute the search snippet or model knowledge for the page;
- queue a follow-up (alternative page, datasheet PDF, different source) and mark
  the cell `PARTIAL` with the named access obstacle.

**Status: executable now** for detection and for persisting the retrieval outcome
(record it on the `research_queries` row and/or the checkpoint; a per-source
fetch-status column is not modelled — see `evidence-and-outputs.md` §1.1).

## Step 5 — Price with an ambiguous unit

**Synthetic source:** `https://supplier.example.invalid/product` states
`"12.50 EUR per board"` and does **not** state the board dimensions, VAT
treatment, or pack size.

**Harness decision:**

| Field | Recorded |
|---|---|
| original value | `12.50` |
| currency | `EUR` |
| stated unit | `per board` |
| dimensions | **UNKNOWN** |
| VAT | **not stated** |
| pack size | **UNKNOWN** (pending fact) |
| basis | **not stated** (retail/listing page; B2B unknown) |
| normalisation | **not performed** — conversion inputs unknown |
| evidence verification | `UNVERIFIED` (page fetched; unit ambiguous) |
| claim type | `UNKNOWN` |
| follow-up | find dimensions/VAT, or a second source |

The Price is **not** converted to €/m², not treated as a B2B price, and not
averaged with any substitute.

**Status: executable now** as a decision and as persistence — the observation is
stored as `evidence` (`UNVERIFIED`, ambiguous unit) and the conclusion as an
`UNKNOWN`/`INFERENCE` claim with confidence (`POST .../evidence`, `.../claims`).

## Step 6 — Pause

**Scenario:** the run has persisted a source, evidence, and several claims, then
reaches a declared query/page budget limit; it must stop and stay resumable.

**Harness decision:** pause with `status = PAUSED` and a separate `pauseReason`
(e.g. `BUDGET_EXHAUSTED`). The lifecycle status and the reason are separate
dimensions: `PAUSED` says the run has stopped but is resumable; the reason says
why. Save the checkpoint (coverage + pending follow-ups) through the run API. Do
**not** write the sources/claims into Markdown/CSV as a business store.

**Status: executable now** (`PATCH .../research-runs/:runId`).

## Step 7 — Resume

**Scenario:** a fresh session reloads the run; the opportunity's
`contextVersion` has advanced `7 → 8` (a target market or fact changed).

**Harness decision (normative — context-change rule):**
- a recorded context that has advanced is **stale**, and no frozen snapshot
  exists to reconstruct it (`research_contexts` is planned, O3);
- therefore the run is **not** silently rebased: pause with `status = PAUSED` and
  `pauseReason = CONTEXT_CHANGED`, and require an explicit human decision —
  start a new run, or explicitly acknowledge the change (a recording action);
- if the versions matched instead, resume with `status = RUNNING` and a cleared
  `pauseReason`, continuing from the unvisited frontier and open gaps;
- re-running must **append, not duplicate**: dedupe sources by canonical URL and
  claims by subject+key.

**Status: executable now** — the run, checkpoint, and persisted queries/sources/
evidence/claims are reloaded through the API, and the `CONTEXT_CHANGED` block is
enforced by `PATCH` (T-007).

## Step 8 — Report with explicit coverage gaps (template, synthetic)

A DB-backed report generator is **not available** yet (`persistence-boundary.md`
O12), so this is the *shape* the harness produces from the persisted records,
filled with placeholders only.

```text
Run: EXAMPLE-RUN-001   Opportunity: 1111... (EXAMPLE)
Context version: 8     Scope: Exampleland / example segment
Status: PAUSED          Pause reason: BUDGET_EXHAUSTED

Coverage matrix
  dimension        status    evidence / gap
  suppliers        PARTIAL   1 unvisited candidate; 1 BLOCKED source
  distributors     GAP       no local-language results yet
  specifications   GAP       pack_size PENDING (clarification filed)
  prices           PARTIAL   1 ambiguous unit price; normalisation impossible
  substitutes      GAP       not yet searched
  market observ.   PARTIAL   terminology candidate unverified

Sources: 1 persisted (S01)   Evidence: 1 (UNVERIFIED)
Claims : 2 persisted (1 UNKNOWN, 1 INFERENCE)
Unvisited: 1   Rejected: 0   Blocked: 1 (consent wall)
Suggestions: none   Clarifications: 1 (pack_size)
Stop/pause reason: BUDGET_EXHAUSTED
Tool usage: no calls made in this walkthrough; cost UNKNOWN
```

**Status: DB-backed report generation is NOT executable now (O12); the records
it would read are persisted.** The template and the gap-reporting logic are
exercised here.

---

## Acceptance scenario (delivered, T-007)

> **IMPLEMENTED.** This scenario is exercised by the API integration test
> `soft/apps/api/test/research-api.spec.ts`; the calls below exist today. All
> values are synthetic placeholders.

The scenario in `persistence-boundary.md` §2, step by step:

| # | Step | API call | Observed result |
|---|---|---|---|
| 1 | Start a run for the opportunity | `POST /opportunities/1111.../research-runs` body `{}` | `201 { id, contextVersion: 7, status: "RUNNING", targetMarketIds: [...] }` |
| 2 | Record the context version used | `GET .../research-runs/:runId` | run carries `contextVersion = 7` |
| 3a | Record a discovery query | `POST .../research-runs/3333.../queries` body `{ queryText, provider?, status?, resultCount? }` | `201` query on the run |
| 3b | Persist a source | `POST .../research-runs/3333.../sources` body `{ url, title?, publisher?, sourceType? }` | `201 { id, url }` (URL-deduped) |
| 3c | Persist evidence (extracted observation) | `POST .../evidence` body `{ url, evidenceText, verificationStatus: "VERIFIED", retrievedAt }` | `201` evidence with its source |
| 3d | Persist a supported claim linked to evidence | `POST .../claims` body `{ type: "FACT", statement, confidence, evidence: [{ evidenceId, stance }] }` | `201` claim with `evidence` links |
| 4 | Save a checkpoint | `PATCH .../research-runs/3333...` body `{ checkpoint: { coverage: [...], pendingFollowUps: [...] } }` | `200` run with `checkpoint` + `checkpointAt` |
| 5a | Pause | `PATCH ...` body `{ status: "PAUSED", pauseReason: "BUDGET_EXHAUSTED" }` | `200` run `status=PAUSED`, `pauseReason=BUDGET_EXHAUSTED` |
| 5b | Resume in a **fresh session** | `GET .../research-runs/3333...` + `GET .../sources|evidence|claims` | run returns `contextVersion`, `pauseReason`, `checkpoint`, queries; sources/evidence/claims read back — **no conversation history, no Markdown** |
| 5c | Resume, context unchanged | `PATCH ...` body `{ status: "RUNNING" }` | `200` run `status=RUNNING`, `pauseReason=null` |
| 5d | Resume, context changed | `PATCH ...` body `{ status: "RUNNING" }` | `409 { error: "context_changed" }`; the run is persisted `PAUSED`/`CONTEXT_CHANGED`, not silently rebased. Acknowledge with `{ status: "RUNNING", contextVersion: <current> }` |

The scenario is complete only when 5b–5c succeed with the versions equal, and
5d blocks (not silently rebases) when they differ.

---

## Executable now vs requires implementation

| Step | Executable now | Still requires implementation |
|---|---|---|
| Intake: read Research Context, check `schemaVersion` | ✅ `GET .../research-context` (impl) | — |
| Scope from context target markets | ✅ | Task-scoped `scope` (Task table, later) |
| Plan (countries/languages/synonyms/types/channels) | ✅ toolchain | — |
| Discovery / retrieval / verification | ✅ Exa / Gemini / webfetch / Firecrawl | — |
| Record discovery queries | ✅ `POST .../queries` (impl) | — |
| Persist sources / evidence / claims | ✅ `POST .../sources\|evidence\|claims` (impl) | — |
| Start run / record context version | ✅ run endpoints (impl) | frozen `research_contexts` snapshot (O3, later) |
| Pause (`status = PAUSED` + `pauseReason`) | ✅ `PATCH .../:runId` (impl) | — |
| Save checkpoint (coverage + pending follow-ups) | ✅ run `checkpoint` (impl) | — |
| Resume in a fresh session from the run | ✅ run read + evidence/claim reads (impl) | — |
| Context change on resume → `CONTEXT_CHANGED` block | ✅ `PATCH` guard (impl) | frozen snapshot to relax the rule (O3, later) |
| Missing spec → UNKNOWN + clarification request | UNKNOWN rule ✅ | `clarification_requests` (later) |
| Suggestions / structured research records | — | `target_market_suggestions`, `research-records` (later) |
| Report with coverage gaps | gap logic ✅ | DB-backed report generation (O12, later) |

**Conclusion:** intake, planning, discovery, retrieval, verification,
separation, stop/pause **decision logic**, and the **minimum resumable-run
persistence** are executable today (T-007). Structured `research-records`,
target-market suggestions, clarification requests, frozen `research_contexts`
snapshots, and DB-backed report generation remain separate later tasks.
