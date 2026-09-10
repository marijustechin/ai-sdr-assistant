# Redesign — Research Context Contract

**Status:** Proposal. No code written.
**Companion:** `architecture.md`, `module-boundaries.md`, `data-ownership.md`, `task-and-execution-model.md`.

This document defines the **single, versioned contract** by which the Market Researcher (and, later, other research modules) obtains everything it needs about an opportunity — without ever receiving product descriptions, specifications, or facts through prompts or uploaded files.

---

## 1. Invariant

> The Market Researcher receives only `taskId` and `opportunityId`. It is a **context consumer**, never a context builder, and never a product-data author.

Consequences:

- No product description, spec sheet, or fact is passed in a prompt, file, or request body to the researcher.
- The researcher obtains its inputs by calling the Research Context contract (DI in-process, or REST as an external worker).
- The central system — not the researcher — decides which facts are safe to assert.
- The researcher never creates or mutates `product_facts`. It produces sourced market claims/findings and clarification requests only (see §10).

---

## 2. The Two Identity Inputs + Scope from Task

| Field | Meaning |
|---|---|
| `taskId` | The routed unit of work (from `control-plane`), carrying execution/audit linkage and **research scope**. |
| `opportunityId` | The business object everything is scoped to. |

The worker receives only these two IDs. It resolves **research scope** from the `Task`:

```typescript
interface TaskScope {
  targetMarketIds: string[];   // non-empty: exactly which target markets to research
  country?: string;            // optional single-country focus
  industry?: string;           // optional single-industry focus
}
```

Rules:

- `scope.targetMarketIds` must be non-empty for a market-research task. The researcher must **not** research every target market by accident.
- If `country` or `industry` is set, research is further narrowed; if absent, the scope is the union of the listed target markets.
- The scope is stored on the `Task` at creation time by `control-plane` (or the requesting caller). The researcher reads it from the Task, never from a prompt.

---

## 3. Endpoints

```text
GET  /opportunities/:opportunityId/research-context        ?version=<n>   # active if omitted
POST /opportunities/:opportunityId/research-runs                          # body: { taskId, budgets? }
GET  /opportunities/:opportunityId/research-runs                          # list runs for this opportunity
GET  /opportunities/:opportunityId/research-runs/:runId                   # single run + its context version
```

Semantics:

- **`GET .../research-context`** returns the *active* context by default; `?version=N` returns the frozen snapshot N (reproducibility).
- **`POST .../research-runs`** freezes the current context into a new version, creates a `research_runs` record bound to that version (and the `taskId`), and returns `{ runId, contextVersion }`. The researcher is then invoked with `(taskId, opportunityId)`.
- **`GET .../research-runs`** lists runs (id, contextVersion, status, timestamps) — for "what has already been researched".

---

## 4. Contract Version vs Context Revision

Two distinct version concepts, never conflated:

| Concept | Field | Meaning | Owner |
|---|---|---|---|
| **Contract / schema version** | `schemaVersion` | The shape of this DTO. Breaking changes bump this. | Design authority (this document) |
| **Context revision** | `contextVersion` | A monotonic snapshot number for one opportunity's frozen context. | `control-plane` (freeze action) |

The contract version is a **literal** for this design:

```typescript
const SCHEMA_VERSION = 'research_context_v1';
```

Every `ResearchContext` payload carries `schemaVersion: "research_context_v1"`. A consumer (researcher) must refuse to parse a payload whose `schemaVersion` it does not recognise. `contextVersion` may change independently of `schemaVersion`.

---

## 5. The `ResearchContext` DTO

```typescript
interface ResearchContext {
  schemaVersion: 'research_context_v1';   // contract/schema version (see §4)
  contextVersion: number;                 // context revision (see §4)
  frozenAt: string;                       // ISO-8601

  scope: TaskScope;                       // resolved from the Task (see §2)

  opportunity: {
    id: string;
    name: string;
    objective: string;
    status: string;
    priority?: string;
    deadline?: string;
  };

  product: {
    id: string;
    name: string;
    category: string;
  };

  offer: {
    id: string;
    quantity?: string;
    unit?: string;
    currentLocation?: string;
    price?: string;
    minimumOrder?: string;
    availabilityDate?: string;
    deliveryTerms: string[];
    certifications: string[];
  };

  facts: {
    confirmed: AssertableFact[];   // value + evidence metadata — safe to assert
    pending: RedactedFact[];       // key + explanation only — treat as UNKNOWN
    restricted: RedactedFact[];    // key + explanation only — treat as UNKNOWN (value redacted)
    // SUPERSEDED facts are deliberately ABSENT — audit history only (§6)
  };

  unknowns: string[];               // explicit open questions with no confirmed answer

  targetMarkets: Array<{
    id: string;
    countries: string[];
    industries: string[];
    companyTypes: string[];
    buyerTitles: string[];
    requirements: string[];
    exclusions: string[];
  }>;

  priorResearchRuns: Array<{
    runId: string;
    contextVersion: number;
    status: string;
    completedAt?: string;
    summary?: string;
  }>;

  existingCompanies: Array<{
    id: string;
    name: string;
    domain?: string;
    country?: string;
    status: string; // DISCOVERED | QUALIFIED | REJECTED | ...
  }>;

  approvedKnowledge: {
    customerProfile?: {
      id: string;
      version: number;
      industries: string[];
      companyTypes: string[];
      countries: string[];
      positiveSignals: string[];
      negativeSignals: string[];
      requiredAttributes: string[];
    };
    buyerPersonas: Array<{
      id: string;
      version: number;
      jobTitles: string[];
      departments: string[];
      painPoints: string[];
      buyingMotivations: string[];
    }>;
    valuePropositions: Array<{
      id: string;
      version: number;
      positioning: string;
      benefits: string[];
      differentiators: string[];
      approvedClaims: string[];
      forbiddenClaims: string[];
    }>;
  };

  humanDecisions: Array<{
    id: string;
    subject: string;          // e.g. "target_market_suggestion"
    decision: 'ACCEPTED' | 'REJECTED';
    reason?: string;
    sourceIds: string[];
    decidedAt: string;
    decidedBy: string;
  }>;
}
```

---

## 6. The Fact shapes and typed statuses

### 6.1 Assertable fact (CONFIRMED only)

```typescript
interface AssertableFact {
  id: string;
  subject: 'PRODUCT' | 'OFFER' | 'OPPORTUNITY';
  subjectId: string;
  key: string;                 // e.g. "origin", "thickness_mm", "profile"
  status: 'CONFIRMED';
  version: number;             // monotonic per (subject, subjectId, key)
  value: string;               // always present for CONFIRMED
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confirmedAt: string;         // ISO-8601 — when the fact was confirmed
  asOf: string;                // ISO-8601 — the point in time the fact is true "as of"
  evidence: ResolvedSource[];  // resolved source metadata, not just IDs (§6.3)
  explanation?: string;
}
```

### 6.2 Redacted fact (PENDING / RESTRICTED)

```typescript
interface RedactedFact {
  id: string;
  subject: 'PRODUCT' | 'OFFER' | 'OPPORTUNITY';
  subjectId: string;
  key: string;
  status: 'PENDING' | 'RESTRICTED';
  version: number;
  // NO value field — always absent/redacted
  explanation: string;         // e.g. "awaiting human confirmation" | "commercially restricted"
}
```

PENDING and RESTRICTED facts expose **only** `key`, `status`, and `explanation`. Their value is never present in the ResearchContext payload.

### 6.3 Resolved source metadata (self-contained evidence)

```typescript
interface ResolvedSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievalDate: string;      // ISO-8601
}
```

Rule: `AssertableFact.evidence` is a **resolved** list of sources (full metadata). Source IDs alone are not sufficient — the context contract must be self-contained and auditable without a second lookup.

### 6.4 Status semantics

| Status | Exposed in ResearchContext? | Value present? | Market Researcher treatment |
|---|---|---|---|
| **CONFIRMED** | Yes (`confirmed[]`, as `AssertableFact`) | Yes, with evidence metadata | **May assert as a factual statement.** |
| **PENDING** | Yes (`pending[]`, as `RedactedFact`) | No (redacted) | Surfaced as **UNKNOWN**; must not be asserted or guessed. |
| **RESTRICTED** | Yes (`restricted[]`, as `RedactedFact`) | No (redacted) | Surfaced as **UNKNOWN**; must not be asserted or guessed. |
| **SUPERSEDED** | **No — absent entirely** | — | Kept in audit history only; never part of the context. |

---

## 7. Market Researcher Usage Rules (normative)

1. Only **CONFIRMED** facts may be used as factual assertions in findings and suggestions.
2. **PENDING** and **RESTRICTED** facts are exposed in the output as **unknowns** — the researcher must not invent or interpolate their values.
3. **SUPERSEDED** facts never appear in the context and are excluded from reasoning entirely.
4. Any research question without a CONFIRMED fact produces `UNKNOWN`, not a guess.
5. The researcher **never proposes product facts**. If it discovers something that looks like a product-data gap, it files a **clarification request** (§10), not a fact.
6. The researcher may produce **sourced market claims/findings** (via `evidence` and `research-records`) and **clarification requests** — these are its only write surfaces.

---

## 8. Versioning Rules

### Fact versioning

- A fact is **append-only**: every change creates a new row with `version = prev + 1` and marks the previous `SUPERSEDED`.
- The "current" fact for a `(subject, subjectId, key)` is the highest version that is not `SUPERSEDED`.
- SUPERSEDED rows live in audit history only and are **excluded** from the `ResearchContext` assembly.

### Context versioning

- Each `POST .../research-runs` **freezes** the assembled context (current facts, knowledge versions, target markets, prior runs, companies, decisions) into a `research_contexts` snapshot with a new monotonic `contextVersion`.
- A `research_runs` row is bound to exactly one `contextVersion` — making every run reproducible.
- Knowledge entities carry their own `version`; the context records which versions were active at freeze time.
- `contextVersion` (revision) is independent of `schemaVersion` (contract) — see §4.

---

## 9. Assembly and Ownership

`ResearchContextService` is a **cross-cutting read-model assembler** owned by `control-plane`. It composes the context by calling each module's read/query service:

| Context section | Assembled from (module service) |
|---|---|
| scope | `control-plane` Task scope |
| opportunity / targetMarkets | `opportunities` workspace + target-market read service |
| product / offer | `products-and-offers` read service |
| facts (CONFIRMED, with resolved evidence) | `products-and-offers` facts query service (typed/versioned) + `evidence` resolve |
| facts (PENDING / RESTRICTED, redacted) | `products-and-offers` facts query service (key + explanation only) |
| unknowns | `products-and-offers` (open fact keys) + `opportunities` (missing fields) |
| priorResearchRuns | `market-researcher` run query service |
| existingCompanies | `lead-discoverer` company query service |
| approvedKnowledge | `knowledge` query service (versioned) |
| humanDecisions | `approvals` decision query service |

The snapshot (`research_contexts`) and its freezing are owned by `control-plane`; the `research_runs` record is owned by `market-researcher`. See `data-ownership.md` §2 for the full table/owner list.

**Redaction is enforced at assembly time** by `ResearchContextService`: it strips values from PENDING/RESTRICTED facts and omits SUPERSEDED facts before the DTO is returned — on both the DI and REST paths.

---

## 10. Product-Data Authoring Path (closed loop, human/trusted-source only)

Product facts are **not** researcher-authored. Two authoring sources exist:

```text
(a) Human entry:
    human → products-and-offers.enterFact(...)  →  Fact{ status: PENDING } (or CONFIRMED if trusted entry + workflow)

(b) Trusted internal product-data source (integration):
    trusted source → products-and-offers.ingestFact(...)  →  Fact{ status: PENDING }
            ↓
    approvals.createRequest(subject: fact, proposedValue, sourceIds)
            ↓
    human confirm → approvals.apply → products-and-offers.confirmFact(...) → status: CONFIRMED
    human reject  → fact dropped or returned to PENDING (recorded decision)
```

The **Market Researcher is excluded from this path**. When it encounters a product-data gap or uncertainty, it files a **clarification request**:

```typescript
interface ClarificationRequest {
  id: string;
  opportunityId: string;
  researchRunId: string;
  question: string;          // e.g. "Is the origin country confirmed for this lot?"
  relatedFactKeys: string[]; // keys the question concerns (may be empty)
  status: 'OPEN' | 'ANSWERED' | 'DISMISSED';
  createdAt: string;
}
```

Clarification requests route to the human for resolution; the human then enters/confirms the fact through the authoring path. Only the human (or a trusted product-data source) moves a fact to CONFIRMED.

---

## 11. Example: what the researcher actually sees

```json
{
  "schemaVersion": "research_context_v1",
  "contextVersion": 4,
  "frozenAt": "2026-09-09T10:00:00Z",
  "scope": { "targetMarketIds": ["tm_1"], "country": null, "industry": null },
  "opportunity": { "id": "opp_1", "name": "Thermo Abachi cladding", "objective": "Find B2B buyers in Europe", "status": "ACTIVE" },
  "product": { "id": "prod_1", "name": "Thermo Abachi cladding", "category": "cladding" },
  "offer": { "id": "offer_1", "certifications": [], "deliveryTerms": [] },
  "facts": {
    "confirmed": [
      {
        "key": "thickness_mm", "value": "20", "status": "CONFIRMED", "version": 2,
        "confidence": "HIGH", "confirmedAt": "2026-09-08T09:00:00Z", "asOf": "2026-09-08T09:00:00Z",
        "evidence": [ { "id": "s_1", "title": "Product spec sheet", "publisher": "Internal", "url": "internal://specs/abachi", "retrievalDate": "2026-09-08" } ]
      },
      {
        "key": "coverage_width_mm", "value": "80", "status": "CONFIRMED", "version": 1,
        "confidence": "HIGH", "confirmedAt": "2026-09-08T09:00:00Z", "asOf": "2026-09-08T09:00:00Z",
        "evidence": [ { "id": "s_1", "title": "Product spec sheet", "publisher": "Internal", "url": "internal://specs/abachi", "retrievalDate": "2026-09-08" } ]
      }
    ],
    "pending":    [ { "key": "origin", "status": "PENDING", "version": 1, "explanation": "awaiting human confirmation" } ],
    "restricted": [ { "key": "price_per_m2", "status": "RESTRICTED", "version": 1, "explanation": "commercially restricted" } ]
  },
  "unknowns": ["lengths/tolerances", "grades", "packaging", "finishes", "certifications", "delivery terms"],
  "targetMarkets": [ { "id": "tm_1", "countries": [], "industries": ["sauna manufacturers"], "companyTypes": [] } ],
  "priorResearchRuns": [],
  "existingCompanies": [],
  "approvedKnowledge": { "buyerPersonas": [], "valuePropositions": [] },
  "humanDecisions": []
}
```

The researcher may assert "20 mm thickness" and "80 mm coverage". It must treat origin, price, lengths, grades, certifications, and delivery as UNKNOWN — and may file clarification requests rather than guessing.

---

## 12. What This Prevents

- Prompt-injection / drift from passing free-text product descriptions on every run.
- The researcher inventing a price, origin, or certification that is actually RESTRICTED or PENDING.
- Researcher-authored product facts (it can only produce claims/findings and clarification requests).
- Accidental full-scope research (scope is resolved from the Task, with non-empty `targetMarketIds`).
- Non-self-contained contexts (assertable facts carry resolved evidence metadata).
- Divergent behaviour between in-process and worker execution (one DTO, one authorization, one schema version).
- Non-reproducible research (every run is bound to a frozen context version).
