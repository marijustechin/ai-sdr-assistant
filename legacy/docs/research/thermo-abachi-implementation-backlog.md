# Thermo Abachi — Implementation Backlog

**Status:** design only. No code written.
**Purpose:** describe the smallest next coding slice and the backlog behind it, aligned with the canonical architecture (`ai-sdr-assistant-mvp-plan-v2.md` §8.2) and the harness contract (`docs/market-research-harness.md`).

---

## 0. Context and Constraints

- The canonical plan already specifies a `MarketResearchService` (v2 §8.2) with explicit inputs/outputs and a "produce suggestions, not silent mutations" rule.
- The harness (this task) adds the operating contract: versioned manifest, source/claim schema (FACT / INFERENCE / UNKNOWN), price-normalisation rules, partial-result and retry rules, human review gates, and reproducible test fixtures.
- No generic agent framework. No chain-of-thought storage. Store evidence, decisions, inputs, outputs, limitations.

---

## 1. The Smallest Next Coding Slice (do this first)

**Goal:** a CLI-first `MarketResearchService` that, given an input snapshot, produces a sourced, structured market-research output with source persistence, validation, partial results, and human review — for one opportunity.

### 1.1 In scope for this slice

1. **Input snapshot** — a plain typed object matching the harness manifest `confirmedFacts` / `unknowns` / `budgets` / `researchQuestions`. Persisted (JSON) for reproducibility.
2. **Source persistence** — a `SourceReference` record (id, title, publisher, url, source_type, retrieved_at, status, accessed_via, notes) and a `Claim` record (id, text, claim_type, confidence, source_ids, price_basis, notes).
3. **Structured output** — `MarketResearchOutput` per v2 §8.2, extended with `claims`, `unknowns`, `limitations`, and a pointer to the source register.
4. **Validation** — reject FACT claims without sources; reject UNKNOWN claims carrying a price; enforce the source/claim schema from the harness.
5. **Partial results** — a `PARTIALLY_SUCCEEDED` status when some sources fail but validated findings exist; failures logged per source.
6. **Human review** — target-market suggestions returned as `PENDING`, with an explicit accept/reject action that writes a decision record; suggestions never mutate the target market automatically.
7. **CLI entrypoints** — deterministic commands (see §1.3). No web UI, no queue in this slice.

### 1.2 Explicitly out of scope for this slice

- Any web search/fetch automation (LLM/network calls are faked behind an interface; real adapters come later).
- Company discovery, qualification, contacts, outreach.
- Database migrations beyond the minimal research tables.
- Background jobs (BullMQ/Redis).
- REST API and web interface.

### 1.3 Proposed CLI surface (aligned with v2 §13)

```bash
npm run cli -- research:run <opportunity-id> [--target-market <id>]
npm run cli -- research:report <run-id>
npm run cli -- research:claims <run-id>
npm run cli -- research:unknowns <run-id>
npm run cli -- suggestion:accept <suggestion-id>
npm run cli -- suggestion:reject <suggestion-id>
npm run cli -- research:register <run-id>   # emit CSV
```

---

## 2. Proposed Minimal Type Contracts (sketch, not implementation)

```typescript
type ClaimType = 'FACT' | 'INFERENCE' | 'UNKNOWN';
type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
type PriceBasis = 'RETAIL_LIST' | 'B2B_TRADE' | 'NOT_COMPARABLE' | 'UNKNOWN';

interface SourceReference {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: string;       // SPECIES_REFERENCE | SUPPLIER_WEBSITE | TRADE_ASSOCIATION | ...
  retrievedAt: Date;
  accessedVia: 'DIRECT_FETCH' | 'SEARCH_SNIPPET' | 'HISTORICAL_NOTE';
  status: 'OK' | 'FETCH_FAILED' | 'LINK_ROT' | 'BLOCKED';
  notes?: string;
}

interface Claim {
  id: string;
  runId: string;
  text: string;
  claimType: ClaimType;
  confidence: Confidence;
  sourceIds: string[];
  priceBasis?: PriceBasis;
  notes?: string;
}

interface ResearchRun {
  id: string;
  opportunityId: string;
  manifest: ResearchManifest;   // confirmedFacts, unknowns, budgets, questions, harnessVersion
  status: 'SUCCEEDED' | 'PARTIALLY_SUCCEEDED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  limitations: string[];
}
```

**No `reasoning` / `thought` / `chainOfThought` field anywhere.**

---

## 3. Backlog (ordered)

| # | Item | Depends on | Notes |
|---|---|---|---|
| 1 | Research domain types + validation (source/claim schema) | — | Harness §4, §9 fixtures 1–4 |
| 2 | `ResearchRun` + manifest persistence (Prisma) | 1 | Harness §2; minimal tables only |
| 3 | `MarketResearchService.run()` with fake research adapter | 1, 2 | v2 §8.2; no real network in this slice |
| 4 | Partial-result + stop-condition + retry logic | 3 | Harness §3.3, §7; fixtures 5–7 |
| 5 | `TargetMarketSuggestion` accept/reject + decision record | 2 | Harness §8; fixture 8 (no silent mutation) |
| 6 | CSV source-register export | 2 | Harness §4.1 |
| 7 | CLI commands (`research:*`, `suggestion:*`) | 3, 5, 6 | v2 §13 |
| 8 | Test suite against harness fixtures | 3, 4, 5 | Harness §9 |
| 9 | Real `SearchProvider` + `WebPageFetcher` adapters | 3 | v2 §10, §16; second slice |
| 10 | Background job wrapper (BullMQ) | 9 | v2 §12; later slice |

---

## 4. Definition of Done for the first slice

- `research:run` produces a persisted run with sourced claims and explicit unknowns.
- A FACT claim without a source is rejected by validation.
- A failing source yields `PARTIALLY_SUCCEEDED`, never data loss.
- Suggestions are `PENDING` and only change the target market after an explicit accept.
- No chain-of-thought field exists in the schema.
- The harness test fixtures (§9 of `market-research-harness.md`) pass.

---

## 5. Preconditions Before Coding Starts

1. Confirm the canonical architecture remains `ai-sdr-assistant-mvp-plan-v2.md` (no drift).
2. Reconcile the `soft/apps/api` Prisma schema with v2 (Product `category: string` + `origin?`, fix generator output path) — see `document-baseline-audit.md` §3.
3. Confirm `soft/` is the implementation workspace (or start a fresh NestJS scaffold).
