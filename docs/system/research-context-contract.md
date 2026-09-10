# Research Context Contract (Canonical)

**Status:** Canonical, live (business contract). Reconciled with implemented
reality through T-006.
**Schema version literal:** `research_context_v1`
**Supersedes:** `docs/redesign/research-context-contract.md`.
**Companion:** `architecture.md`, `module-map.md`, `data-governance.md`.
**Implementation companion (does not restate this contract):**
`soft/docs/contracts/research-context.v1.md`.

**Implemented today (T-006):** `GET /opportunities/:opportunityId/research-context`
returns a **current assembled** `research_context_v1` payload carrying
`schemaVersion` and the Opportunity's `contextVersion`. It is **not yet** an
immutable or research-run snapshot; freezing exact context is a future
ResearchRun/snapshot capability (§3, §8). Redaction (PENDING/RESTRICTED) and
SUPERSEDED omission are mandatory and already enforced at assembly time.

This is the **single, versioned contract** by which the Market Researcher (and
later other research modules) obtains everything it needs about an opportunity —
without ever receiving product descriptions, specifications, or facts through
prompts or uploaded files.

---

## 1. Invariant

> The Market Researcher receives only `taskId` and `opportunityId`. It is a
> **context consumer**, never a context builder, and never a product-data author.

Consequences:

- No product description, spec sheet, or fact is passed in a prompt, file, or
  request body to the researcher.
- The researcher obtains its inputs by calling this contract (DI in-process, or
  REST as an external worker).
- The central system — not the researcher — decides which facts are safe to
  assert.
- The researcher never creates or mutates `product_facts`; it produces sourced
  claims/findings and clarification requests only (§10).

---

## 2. Two Identity Inputs + Scope from Task

| Field | Meaning |
|---|---|
| `taskId` | The routed unit of work (from `control-plane`), carrying execution/audit linkage and **research scope**. |
| `opportunityId` | The business object everything is scoped to. |

```typescript
interface TaskScope {
  targetMarketIds: string[];   // non-empty: exactly which target markets to research
  country?: string;            // optional single-country focus
  industry?: string;           // optional single-industry focus
}
```

Rules: `scope.targetMarketIds` must be non-empty for a market-research task; the
scope is stored on the `Task` at creation time and read from the Task, never
from a prompt.

---

## 3. Endpoints

```text
GET  /opportunities/:opportunityId/research-context        ?version=<n>   # active if omitted
POST /opportunities/:opportunityId/research-runs                          # body: { taskId, budgets? }
GET  /opportunities/:opportunityId/research-runs                          # list runs for this opportunity
GET  /opportunities/:opportunityId/research-runs/:runId                   # single run + its context version
```

- `GET .../research-context` returns the active context, or the frozen snapshot
  `?version=N`.
  - **Implemented (T-006):** without `?version`, it returns the **current
    assembled** context (`frozenAt` = assembly time, `contextVersion` = the
    Opportunity's current revision). `?version=N` and frozen snapshots are
    **not implemented yet**.
- `POST .../research-runs` freezes the current context into a new version,
  creates a `research_runs` record bound to that version and `taskId`, and
  returns `{ runId, contextVersion }`.
  - **Planned:** this is the future immutable context-freeze capability for audit
    and reproducibility. It is not implemented in the current slice.
- `GET .../research-runs` lists runs (id, contextVersion, status, timestamps).
  - **Planned.**

---

## 4. Contract Version vs. Context Revision

| Concept | Field | Meaning | Owner |
|---|---|---|---|
| Contract/schema version | `schemaVersion` | Shape of this DTO; breaking changes bump it | Design authority (this doc) |
| Context revision | `contextVersion` | Monotonic snapshot number for one opportunity | `control-plane` (freeze) |

```typescript
const SCHEMA_VERSION = 'research_context_v1';
```

Every payload carries `schemaVersion: "research_context_v1"`; a consumer must
refuse a payload whose `schemaVersion` it does not recognise.

---

## 5. The `ResearchContext` DTO

```typescript
interface ResearchContext {
  schemaVersion: 'research_context_v1';
  contextVersion: number;
  frozenAt: string;                       // ISO-8601

  scope: TaskScope;

  opportunity: {
    id: string; name: string; objective: string; status: string;
    priority?: string; deadline?: string;
  };

  product: { id: string; name: string; category: string };

  // NOTE: the implemented `Offer` is a concrete sellable product form (variant).
  // Per-opportunity commercial terms (quantity/price/delivery/…) are deferred;
  // this block is the target shape once those land.
  offer: {
    id: string; quantity?: string; unit?: string; currentLocation?: string;
    price?: string; minimumOrder?: string; availabilityDate?: string;
    deliveryTerms: string[]; certifications: string[];
  };

  facts: {
    confirmed: AssertableFact[];   // CONFIRMED + OPERATIONAL — safe to assert
    pending: RedactedFact[];       // status PENDING — treat as UNKNOWN
    restricted: RedactedFact[];    // visibility RESTRICTED — treat as UNKNOWN (value redacted)
    // SUPERSEDED facts are deliberately ABSENT — audit history only (§6)
  };

  unknowns: string[];

  targetMarkets: Array<{
    id: string; countries: string[]; industries: string[]; companyTypes: string[];
    buyerTitles: string[]; requirements: string[]; exclusions: string[];
  }>;

  priorResearchRuns: Array<{
    runId: string; contextVersion: number; status: string;
    completedAt?: string; summary?: string;
  }>;

  existingCompanies: Array<{
    id: string; name: string; domain?: string; country?: string; status: string;
  }>;

  approvedKnowledge: {
    customerProfile?: {
      id: string; version: number; industries: string[]; companyTypes: string[];
      countries: string[]; positiveSignals: string[]; negativeSignals: string[];
      requiredAttributes: string[];
    };
    buyerPersonas: Array<{
      id: string; version: number; jobTitles: string[]; departments: string[];
      painPoints: string[]; buyingMotivations: string[];
    }>;
    valuePropositions: Array<{
      id: string; version: number; positioning: string; benefits: string[];
      differentiators: string[]; approvedClaims: string[]; forbiddenClaims: string[];
    }>;
  };

  humanDecisions: Array<{
    id: string; subject: string; decision: 'ACCEPTED' | 'REJECTED';
    reason?: string; sourceIds: string[]; decidedAt: string; decidedBy: string;
  }>;
}
```

---

## 6. Fact Shapes and the Implemented Status/Visibility Model

The implemented `product_facts` schema has **two orthogonal dimensions**:

- `status` ∈ `PENDING | CONFIRMED | SUPERSEDED` (assertability / versioning);
- `visibility` ∈ `OPERATIONAL | RESTRICTED` (value exposure).

Assembly mapping (normative):

| Implemented row | Context bucket | Value present? | Researcher treatment |
|---|---|---|---|
| `status = CONFIRMED`, `visibility = OPERATIONAL` | `confirmed[]` (`AssertableFact`) | Yes + evidence metadata | **May assert as fact.** |
| `status = PENDING`, `visibility = OPERATIONAL` | `pending[]` (`RedactedFact`) | No | Surface as **UNKNOWN**. |
| `visibility = RESTRICTED` (any status) | `restricted[]` (`RedactedFact`) | No | Surface as **UNKNOWN**. |
| `status = SUPERSEDED` | **absent entirely** | — | Audit history only; excluded. |

### 6.1 Assertable fact (CONFIRMED + OPERATIONAL)

```typescript
interface AssertableFact {
  id: string; subject: 'PRODUCT' | 'OFFER' | 'OPPORTUNITY'; subjectId: string;
  key: string; status: 'CONFIRMED'; version: number; value: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confirmedAt: string; asOf: string;
  evidence: ResolvedSource[]; explanation?: string;
}
```

### 6.2 Redacted fact (PENDING or RESTRICTED)

```typescript
interface RedactedFact {
  id: string; subject: 'PRODUCT' | 'OFFER' | 'OPPORTUNITY'; subjectId: string;
  key: string; status: 'PENDING' | 'RESTRICTED'; version: number;
  // NO value field — always absent/redacted
  explanation: string;
}
```

Redacted facts expose **only** `key`, `status`, and `explanation`.

### 6.3 Resolved source metadata (self-contained evidence)

```typescript
interface ResolvedSource {
  id: string; title: string; publisher: string; url: string; retrievalDate: string;
}
```

`AssertableFact.evidence` is a **resolved** list (full metadata), not bare IDs, so
the context is auditable without a second lookup.

---

## 7. Market Researcher Usage Rules (normative)

1. Only CONFIRMED (+ OPERATIONAL) facts may be asserted.
2. PENDING and RESTRICTED facts are surfaced as unknowns; values are never
   invented or interpolated.
3. SUPERSEDED facts never appear and are excluded from reasoning.
4. Any question without a CONFIRMED fact produces `UNKNOWN`, not a guess.
5. The researcher never proposes product facts; it files clarification requests.
6. The researcher may produce sourced market claims/findings (via `evidence` and
   `research-records`) and clarification requests — its only write surfaces.

---

## 8. Versioning Rules

- **Fact versioning (planned):** append-only — a change creates a new row with
  `version = prev + 1` and marks the previous `SUPERSEDED`. The current fact for
  `(subject, subjectId, key)` is the highest non-superseded version.
- **Context versioning:** `contextVersion` is the monotonic revision of one
  Opportunity's assembled context. Implemented (T-006) as
  `Opportunity.contextVersion`, incremented (with the triggering write, in one
  transaction) when a target market is attached and when a relevant
  product/offer fact is created. `GET .../research-context` reports the current
  revision.
- **Frozen snapshots (planned):** each `POST .../research-runs` will freeze the
  then-current assembled context into a `research_contexts` snapshot at a new
  version; a `research_runs` row binds to exactly one version for audit and
  reproducibility. `contextVersion` (revision) is independent of
  `schemaVersion` (contract).

---

## 9. Assembly and Ownership

`ResearchContextService` is a **cross-cutting read-model assembler** owned by
`control-plane`. It composes the context from each module's read/query service:

| Context section | Assembled from |
|---|---|
| scope | `control-plane` Task scope |
| opportunity / targetMarkets | `opportunities` workspace + target-market read service |
| product / offer | `products-and-offers` read service |
| facts (CONFIRMED, resolved evidence) | `products-and-offers` facts query + `evidence` resolve |
| facts (PENDING / RESTRICTED, redacted) | `products-and-offers` facts query (key + explanation only) |
| unknowns | `products-and-offers` + `opportunities` |
| priorResearchRuns | `market-researcher` run query service |
| existingCompanies | `lead-discoverer` company query service |
| approvedKnowledge | `knowledge` query service (versioned) |
| humanDecisions | `approvals` decision query service |

Redaction is enforced at assembly time (on both DI and REST paths): PENDING and
RESTRICTED values are stripped and SUPERSEDED facts omitted before the DTO is
returned.

---

## 10. Product-Data Authoring Path (closed loop, human/trusted-source only)

```text
(a) Human entry:
    human → products-and-offers.enterFact(...) → Fact{ status: PENDING }

(b) Trusted internal product-data source:
    trusted source → products-and-offers.ingestFact(...) → Fact{ status: PENDING }
            ↓
    approvals.createRequest(subject: fact, proposedValue, sourceIds)
            ↓
    human confirm → approvals.apply → products-and-offers.confirmFact(...) → CONFIRMED
    human reject  → fact dropped or returned to PENDING (recorded decision)
```

The researcher is excluded from this path. On a product-data gap it files a
**clarification request**:

```typescript
interface ClarificationRequest {
  id: string; opportunityId: string; researchRunId: string;
  question: string; relatedFactKeys: string[];
  status: 'OPEN' | 'ANSWERED' | 'DISMISSED'; createdAt: string;
}
```

---

## 11. What This Prevents

- Prompt-injection/drift from passing free-text product descriptions per run.
- The researcher inventing a price, origin, or certification that is actually
  RESTRICTED or PENDING.
- Researcher-authored product facts.
- Accidental full-scope research (scope resolved from the Task).
- Non-self-contained contexts (assertable facts carry resolved evidence).
- Divergent in-process vs. worker behaviour (one DTO, one authorization, one
  schema version).
- Non-reproducible research (every run bound to a frozen context version).

---

## 12. Implemented vs. Planned

| Element | State |
|---|---|
| `Product`, `Offer` (sellable variant), `ProductFact`, `TargetMarket`, `Opportunity`, `OpportunityTargetMarket`, `ResearchRun`, `ResearchRunTargetMarket` tables | **implemented** (T-004) |
| `status`/`visibility` fact model + CHECK constraints | **implemented** (T-004) |
| `ResearchContextService` assembly/redaction + `GET /opportunities/:id/research-context` (current assembled context) | **implemented** (T-006) |
| `research_contexts` frozen snapshots, research-run endpoints, Task scope, knowledge/approvals/companies/human-decision sections | **planned** |
| Per-opportunity commercial terms (`offer` price/quantity/delivery block), fact append-only versioning | **planned** |

The implementation-level view (Zod location, redaction enforcement, test
expectations) lives in `soft/docs/contracts/research-context.v1.md`; it links
back to this canonical contract and does not restate it.
