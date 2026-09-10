# Market Research Harness

**Status:** Design / operating procedure. Not yet implemented in code.
**Audience:** Researchers and the future `MarketResearchService` implementer.

This document defines a proportional, reusable harness for running sourced market research. It is the contract that a later CLI-first `MarketResearchService` must implement. It is intentionally independent of any single opportunity; each run is a *versioned manifest* that plugs into this harness.

---

## 1. Pipeline Overview

```text
input snapshot  →  controlled research  →  evidence validation  →  report + source register
      →  human review  →  decision record
```

1. **Input snapshot** — freeze the opportunity facts (and unknowns) so a run is reproducible.
2. **Controlled research** — bounded queries, page fetches, and time, against an explicit source policy.
3. **Evidence validation** — every claim is typed (FACT / INFERENCE / UNKNOWN) and assigned confidence + citation.
4. **Report + source register** — human-readable Markdown report + machine-readable CSV register.
5. **Human review** — accept/reject gates; target-market suggestions never mutate data automatically.
6. **Decision record** — accepted/rejected decisions are logged with reasoning and sources.

---

## 2. Versioned Run Manifest

Each research run is described by a manifest committed alongside its outputs.

```yaml
runId: thermo-abachi-europe-2026-09-09   # unique, slug-style
opportunity: Thermo Abachi cladding (STS 3D, 20 mm, 80 mm cover, Europe, B2B)
language: en                              # launch language
generatedAt: 2026-09-09T00:00:00Z
researcher: <name or "manual">
harnessVersion: 1.0.0

confirmedFacts:
  product: Thermo Abachi / Thermo Ayous cladding
  profile: STS 3D
  thicknessMm: 20
  coverageWidthMm: 80
  region: Europe
  focus: B2B
  buyerGroups:
    - sauna manufacturers
    - sauna installers/contractors
    - specialist timber distributors
    - interior and wall-panel manufacturers

unknowns:            # must stay UNKNOWN unless a source says otherwise
  - stock quantity and location
  - product origin
  - delivery availability and terms
  - price and MOQ
  - lengths, tolerances, grades, packaging, finishes
  - certifications, sourcing, legality, traceability
  - thermal-performance claims
  - samples and customer projects

researchQuestions:   # the specific questions this run answers
  - product naming by country (Thermo Abachi / Thermo Ayous / Ayous / Obeche)
  - priority countries and buyer segments
  - suppliers and competing products
  - comparable dimensions/profiles/applications
  - public prices (retail/list separated from B2B)
  - associations, directories, trade fairs, terminology
  - risks, market gaps, recommended target-market suggestions

budgets:
  maxQueries: 30
  maxPages: 15
  maxMinutes: 60
  maxSources: 40
stopConditions:
  - any budget exhausted
  - all researchQuestions answered at MEDIUM confidence or better
  - 3 consecutive queries return zero new unique sources
```

Rules:
- A run is immutable once published. Corrections create a new `runId`, never a silent edit.
- The manifest records what was **not** found, not only what was found.

---

## 3. Research Boundaries and Source Policy

### 3.1 Research boundaries

- Only public, non-login web sources.
- No outreach, no contact of prospects, no sending of any kind.
- No scraping of login-gated or ToS-restricted content (Kompass/Fordaq/Europages must not be scraped; use only indexed snippets or public pages).
- Historic prospect batches may only **guide search terminology** or **suggest companies for re-validation**. They are never evidence.

### 3.2 Source policy (allowed source types)

| Source type | Allowed? | Notes |
|---|---|---|
| Species/database reference (e.g. Wood Database, TRADA) | Yes | Species identity, properties |
| Encyclopaedia (Wikipedia) | Yes, INFERENCE/context only | Never a sole FACT source for commercial claims |
| Supplier/merchant product pages | Yes | Dimensions, profiles, prices, certifications |
| Trade association pages | Yes | Terminology, member directories, standards |
| Government / trade-data sources | Yes | Import/export, EUTR context |
| Trade-fair / directory listings | Yes | Exhibitor/terminology |
| News / press releases | Yes, dated | Market signals |

Prohibited: paid/marketing-only claims without a retrievable page; unverifiable forum anecdotes; the historic KD-lumber prospect batches as *evidence*.

### 3.3 Query / page / time budgets and stop conditions

- Budgets are defined per-run in the manifest (§2). Defaults: 30 queries, 15 page fetches, 60 minutes, 40 sources.
- **Stop conditions** take precedence: stop early when budgets are hit or questions are answered.
- Each query and page fetch is logged (query text, engine, timestamp, status) so the run is auditable.

---

## 4. Source and Claim Schema

### 4.1 Source register (CSV) columns

```
source_id, title, publisher, url, source_type, retrieval_date, accessed_via, status, notes
```

- `source_id` — stable slug, e.g. `S01`.
- `status` — `OK` | `FETCH_FAILED` | `LINK_ROT` | `BLOCKED`.
- `accessed_via` — `direct_fetch` | `search_snippet` | `historical_note`.

### 4.2 Claim schema

Every material finding carries:

```
claim_id, text, claim_type, confidence, source_ids, price_basis, notes
```

- `claim_type` — one of:
  - **FACT** — directly stated by a retrieved source and dated.
  - **INFERENCE** — reasonable conclusion from FACTs, labelled as such.
  - **UNKNOWN** — explicitly not established; must not be answered with a guess.
- `confidence` — `HIGH` | `MEDIUM` | `LOW` (coarse, not a pretend-precise number).
- `source_ids` — references into the source register. A claim with no source is `UNKNOWN`.

### 4.3 Citation and confidence requirements

- **HIGH confidence** requires ≥1 primary source retrieved this run (a supplier/product/association page), dated.
- **MEDIUM confidence** = secondary source (encyclopaedia, reputable directory) or primary source with caveats.
- **LOW confidence** = single secondary source, or inference from multiple weaker sources.
- A claim without a retrievable URL is `UNKNOWN`, never FACT.
- No chain-of-thought is stored. Store: evidence, decisions, inputs, outputs, limitations.

---

## 5. Price-Capture and Price-Normalisation Rules

1. **Separate price basis always.** Record `retail/list` vs `B2B/trade` explicitly. Never conflate them.
2. A price is only a FACT if the source states the number, the currency, the unit, and (ideally) the date. Record `price_basis` and the "as of" date verbatim.
3. **Normalisation is derived, never stated as fact.** If converting to a common unit (e.g. £/m²), store the original number AND the derived number, and mark the derived number `INFERENCE` with the exchange-rate/date assumption.
4. **VAT handling** — record whether a price is incl./excl. VAT. Never silently add or remove VAT.
5. **Non-comparable products** — prices for different species, thicknesses, or profiles are recorded but flagged `NOT_COMPARABLE`; they are never averaged into the target product's price.
6. **No B2B price found → leave `price_basis: B2B` as UNKNOWN.** Do not invent a discount factor.

---

## 6. Treatment of Non-Comparable Products

- Products differing in species, thermal treatment, thickness, profile, or region are captured for context but are **not** comparable evidence for the target product.
- They may be used to establish: price *ranges* (clearly labelled), terminology, market structure, and competitor landscape.
- The report must have a dedicated "non-comparable" section so they are never mistaken for the target product.

---

## 7. Partial Result, Failure and Retry Rules

- **Partial results are the norm.** A run with some failed fetches still publishes its findings, with failures recorded in the register (`FETCH_FAILED`, `LINK_ROT`, `BLOCKED`).
- **Selective retry** — retry temporary failures (HTTP 429, 5xx, timeouts) once; do not retry permanent 404s or blocked sources.
- **Idempotency** — re-running must update/append, not duplicate. Source register dedupes on `url`.
- A run never discards already-validated facts because another part failed.

---

## 8. Human Acceptance / Rejection Gates

1. Research produces **target-market suggestions** (e.g. `ADD_COUNTRY`, `ADD_INDUSTRY`). These are `PENDING` until a human accepts/rejects them.
2. **Suggestions never mutate data automatically.** Acceptance is an explicit, logged action.
3. Every accepted suggestion is recorded as a **decision record** with: decision text, source_ids, reason, reviewer, timestamp.
4. Rejected suggestions are kept (with reason) so the review trail is complete.
5. Report "findings" and "recommendations" are visually separated: findings are sourced; recommendations are human decisions.

---

## 9. Reproducible Test Fixtures and Validation Checks (for the implementation)

When the `MarketResearchService` is implemented, it must be testable against these fixtures:

1. **Fixture: valid source** — a minimal valid source row (all required columns). Assert it validates.
2. **Fixture: claim with missing source** — assert the validator rejects a FACT claim with no `source_ids`.
3. **Fixture: UNKNOWN claim** — assert a claim with `claim_type: UNKNOWN` cannot carry a price or a source.
4. **Fixture: price normalisation** — `£57.70 + VAT per m²` and `£67.30 + VAT per m²` (WRC) — assert the two are stored separately and the WRC one is flagged `NOT_COMPARABLE`.
5. **Fixture: stop-condition** — a run config with `maxQueries: 2` must stop after 2 queries and report a `BUDGET_EXHAUSTED` status.
6. **Fixture: partial failure** — one `FETCH_FAILED` source plus one `OK` source; assert the run publishes with `PARTIALLY_SUCCEEDED` and does not drop the `OK` source.
7. **Fixture: retry rule** — assert HTTP 429 is retried once and HTTP 404 is not retried.
8. **Fixture: no-silent-mutation** — assert that producing a `TargetMarketSuggestion` never changes the target market until an explicit accept call is made.
9. **Fixture: no chain-of-thought** — assert the persisted model has no `reasoning`/`thought` field.

---

## 10. Outputs Produced by a Run

1. **Report** (`docs/research/<runId>-<opportunity>.md`) — human-readable, sourced.
2. **Source register** (`docs/research/<runId>-source-register.csv`) — machine-readable.
3. **Manifest** — embedded at the top of the report (or a sidecar file) for reproducibility.
4. **Decision records** — appended when suggestions are accepted/rejected.
