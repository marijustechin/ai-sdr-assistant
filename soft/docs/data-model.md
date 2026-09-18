# Data Model — Core Commercial Domain

> **Canonical source:** table ownership and write rules live at the repository
> root in [`docs/system/data-governance.md`](../../docs/system/data-governance.md).
> This file is the implementation-local description of the implemented schema;
> the root canonical document wins on ownership/write rules.

**Status:** Live (established by T-004; extended by T-006 and T-007).
**Companion:** `architecture.md`, `data-ownership.md`, `security.md`,
`contracts/research-context.v1.md`.

This document describes the central PostgreSQL data model for the core
commercial domain, its relationships, table ownership, and the boundary between
`ProductFact` (canonical product facts) and future research findings.

---

## 1. Conceptual model

```text
Product 1 ──── N Offer ──── N Opportunity N ──── M TargetMarket
   │             │                │                    ▲
   └─ ProductFact ┘                └── ResearchRun ─────┘
        (exactly one subject)          N ──── M (scope join)
                                        │
                                        ├── ResearchQuery            (discovery log)
                                        │
                                        └── Evidence ── N ── M ── Claim
                                              │  (claim_evidence)   │
                                              └── SourceReference ──┘
                                                  (deduplicated by URL)
```

- A **Product** is stored once and is the canonical product identity.
- An **Offer** is a concrete sellable form (variant) of exactly one Product.
- A **ProductFact** is a single structured, typed fact about exactly one
  Product *or* one Offer (never both, never neither).
- An **Opportunity** is the commercial work unit, bound to exactly one Offer.
- An **Opportunity** targets multiple **TargetMarket**s through an explicit
  join.
- A **ResearchRun** records that market research was requested/executed for one
  Opportunity, scoped to target markets through an explicit join, with a
  lifecycle/pause status and a resumable checkpoint.
- A **ResearchQuery** is a single discovery/search query issued during a run.
- A **SourceReference** is a discovered source (deduplicated by URL); an
  **Evidence** row is a factual observation extracted from a source during a
  run; a **Claim** is a conclusion derived from evidence, linked through
  **ClaimEvidence**.

---

## 2. Tables, responsibilities, and ownership

| Model | Table | Purpose | Write owner |
|---|---|---|---|
| `Product` | `products` | Canonical product identity (name, scientific/common naming, description, lifecycle). | `products-and-offers` |
| `Offer` | `offers` | Concrete sellable product form; belongs to one `products`. | `products-and-offers` |
| `ProductFact` | `product_facts` | One structured fact about one Product or one Offer. | `products-and-offers` |
| `TargetMarket` | `target_markets` | country/region + market segment (deduplicated). | `opportunities` |
| `Opportunity` | `opportunities` | Commercial work unit; belongs to one `offers`. | `opportunities` |
| `OpportunityTargetMarket` | `opportunity_target_markets` | Join `opportunities` ↔ `target_markets`. | `opportunities` |
| `ResearchRun` | `research_runs` | Auditable record that market research ran (or was requested) for one Opportunity: lifecycle + pause + checkpoint + validated request parameters (`request_parameters`) and idempotency key (`request_key`); a research request is a `QUEUED` run. | `market-researcher` |
| `ResearchRunTargetMarket` | `research_run_target_markets` | Target-market scope of a `ResearchRun`. | `market-researcher` |
| `ResearchQuery` | `research_queries` | A discovery/search query issued during a `ResearchRun`. | `market-researcher` |
| `SourceReference` | `source_references` | A discovered source; deduplicated by URL. | `evidence` |
| `Evidence` | `evidence` | A factual observation extracted from a source during a run. | `evidence` |
| `Claim` | `claims` | A research conclusion derived from evidence. | `evidence` |
| `ClaimEvidence` | `claim_evidence` | Claim↔evidence link with a stance. | `evidence` |
| `ResearchOffering` | `research_offerings` | Structured, evidence-linked company offering (provenance + idempotent fingerprint); verbatim `price_text` plus an optional explicit `price_amount_numeric` (recorded only when the source states it; never parsed from prose or converted). | `evidence` |
| `Company` | `companies` | A potential-buyer organisation (minimal identity: name, website, country); deduplicated by a deterministic `identity_key` (normalized name + country). | `lead-discoverer` |
| `OpportunityCompany` | `opportunity_companies` | An opportunity-scoped candidate buyer linked to research evidence; separate observed facts vs buyer-fit hypothesis, explicit unknowns / next step, and an operator `review_status` (`UNREVIEWED \| SHORTLISTED \| REJECTED` + reason); deduplicated per opportunity. | `lead-discoverer` |
| `Contact` | `contacts` | Public business contact for a company (general vs named person; email/phone/contact-page URL; original values + dedup-normalized columns; usability + published-vs-deliverability). | `contact-discovery` |
| `ContactSource` | `contact_sources` | Contact provenance: a `source_references` row (deduplicated by URL) + retrieval date + supporting excerpt; many per contact. | `contact-discovery` |

Every model carries a `/// @owner <module>` tag in `schema.prisma` (§5 of
`data-ownership.md`). Cross-boundary writes go through the owning module's
application service — no module writes another module's table.

---

## 3. Key fields

### 3.1 `Product`

- `name` (required) — canonical identity.
- `scientificName` (optional) — scientific or common naming.
- `description` (optional) — free-text description (canonical data, not a
  prompt).
- `category` (optional) — high-level product category (added in T-006 for the
  research-context `product.category` field).
- `lifecycleStatus` — `ProductLifecycleStatus`: `DRAFT | ACTIVE | ARCHIVED`.

### 3.2 `Offer`

- `name` (required) — e.g. "Thermo Abachi STS 3D" (an Offer of "Abachi").
- `commercialStatus` — `OfferStatus`: `DRAFT | ACTIVE | INACTIVE | ARCHIVED`.

### 3.3 `ProductFact`

- `key` (required), `valueText` / `valueNumeric` (at least one required),
  `unit` (optional), `status` (`FactStatus`: `PENDING | CONFIRMED | SUPERSEDED`),
  `visibility` (`FactVisibility`: `OPERATIONAL | RESTRICTED`), `sourceLabel`,
  timestamps.
- **Subject rule:** a fact belongs to exactly one of `productId` / `offerId`.
  Enforced by CHECK constraint `product_facts_exactly_one_subject_check`.
- **Value rule:** a fact carries at least a textual or numeric value. Enforced
  by CHECK constraint `product_facts_has_value_check`.

### 3.4 `TargetMarket`

- `country` (required) — a country **or** region identifier (deliberate
  simplification; e.g. `"LT"` or `"DACH"`).
- `segment` (required) — market segment (e.g. `"sauna manufacturers"`).
- Unique compound constraint on `(country, segment)` prevents accidental
  duplicates.
- `lifecycleStatus` — `TargetMarketStatus`: `ACTIVE | INACTIVE | ARCHIVED`.

### 3.5 `Opportunity`

- `name` (required), `offerId` (required FK).
- `objective` (optional) — free-text commercial objective (added in T-006 for
  the research-context `opportunity.objective` field).
- `contextVersion` (int, default 1) — monotonic revision of the Opportunity's
  **operational research context**. Incremented (with the triggering write, in
  one transaction) when a target market is attached and when a relevant
  product/offer fact is created. Distinguishes the context **revision** from the
  contract `schemaVersion`.
- `lifecycleStatus` — `OpportunityStatus`: `DRAFT | ACTIVE | CLOSED | ARCHIVED`.

### 3.6 `ResearchRun`

- `status` — `ResearchRunStatus`: `QUEUED | RUNNING | PAUSED | COMPLETED | FAILED | CANCELLED`.
- `pauseReason` — `ResearchRunPauseReason`: `BUDGET_EXHAUSTED | ACCESS_BLOCKED |
  CONTEXT_CHANGED | DIMINISHING_RETURNS | NEEDS_HUMAN`. **Separate from
  `status`**: a reason is never encoded as a status, and `FAILED` uses
  `errorCode`/`errorNote` instead. `PAUSED`/`pauseReason` are cleared on resume.
- `pauseNote`, `checkpoint` (JSONB), `checkpointAt` — nullable; the checkpoint
  holds run-scoped progress (coverage + pending follow-ups), not a workflow.
- `requestedAt` (default now), `startedAt`, `finishedAt` (nullable).
- `errorCode` / `errorNote` (nullable) — failure-safe code or note.
- `contextVersion` (int) — the research-context revision this run is bound to.
- **Never** stores LLM chain-of-thought, credentials, or scraped pages.

### 3.7 `ResearchQuery`

- `queryText` (required), `provider` (nullable), `status`
  (`ResearchQueryStatus`: `PENDING | RUNNING | SUCCEEDED | FAILED`),
  `executedAt`, `resultCount`, `errorCode`/`errorNote` (nullable), `createdAt`.
- Belongs to exactly one `ResearchRun` (cascade delete).

### 3.8 `SourceReference`

- `url` (required, **unique** — the same source is never stored twice),
  `title`, `publisher`, `sourceType` (nullable), timestamps.
- Holds source metadata only; page content is never stored.

### 3.9 `Evidence`

- `evidenceText` (required) — the quoted/paraphrased observation.
- `verificationStatus` (`EvidenceVerificationStatus`: `VERIFIED | UNVERIFIED`)
  — `UNVERIFIED` (a lead) stays distinguishable from `VERIFIED`.
- `retrievedAt` (nullable) — when the source was fetched.
- `sourceReferenceId` (FK, restrict) and `researchRunId` (FK, cascade).
- Structurally separate from `Claim`: evidence is an observation, a claim is a
  conclusion.

### 3.10 `Claim` / `ClaimEvidence`

- `Claim`: `type` (`ClaimType`: `FACT | INFERENCE | UNKNOWN`), `statement`
  (required), `confidence` (`ClaimConfidence`: `HIGH | MEDIUM | LOW`),
  `researchRunId` (FK, cascade).
- `ClaimEvidence`: `claimId` + `evidenceId` (compound-unique) with
  `stance` (`ClaimEvidenceStance`: `SUPPORTS | REFUTES | CONTEXT`), so one
  claim may rest on many evidence records and conflicting evidence stays
  explicit.
- **Claim correction lifecycle (separate dimension).** `Claim.lifecycleStatus`
  (`ClaimLifecycleStatus`: `CURRENT | RETRACTED | REPLACED`, default `CURRENT`),
  plus `correctionReason`, `correctedAt`, and `replacedByClaimId` (self-FK,
  `ON DELETE SET NULL`). A retraction or replacement never edits or deletes the
  original statement or its evidence links; it records why and when, and (for a
  replacement) which claim supersedes it. `lifecycleStatus` is kept distinct
  from `type` (FACT/INFERENCE/UNKNOWN) and from
  `EvidenceVerificationStatus`. Current claim reads exclude non-`CURRENT` claims
  by default; history is retrievable explicitly.
- Cross-row rules that Prisma cannot express are enforced in
  `evidence` module services: a `FACT`/`INFERENCE` claim requires ≥1 evidence
  link, an `UNKNOWN` claim carries none, all linked evidence must belong to
  the same run, a correction must target a `CURRENT` claim of the same run, a
  replacement must itself be `CURRENT`, and replacement chains must not cycle.

### 3.11 `ResearchOffering`

- A structured, evidence-linked company offering observed during a run:
  company / location / market served, product, application, treatment,
  dimensions, price text (original wording) with currency/unit, and explicit
  enums `vatStatus` (`INCLUDED | EXCLUDED | NOT_STATED | UNKNOWN`),
  `priceBasis` (`RETAIL_LIST | TRADE_B2B | UNKNOWN`), `sampleKind`
  (`SAMPLE | FULL_PRODUCT | UNKNOWN`) and `matchType`
  (`EXACT_MATCH | ADJACENT | SUBSTITUTE | UNKNOWN`).
- **Provenance is mandatory:** `sourceReferenceId` + `evidenceId` (restrict),
  optional `claimId` (`SET NULL`). Service-enforced: the evidence must belong to
  the run, its source must match, and a linked claim must be `CURRENT` in the
  same run.
- **No inference:** an unrecorded field is stored `null` and its enum `UNKNOWN`;
  nothing is derived from prose by the UI. `fingerprint` is a deterministic
  per-run key (unique) so re-importing the same observation cannot duplicate a
  record. Run deletion cascades; sources/evidence are preserved by `RESTRICT`.

### 3.12 `Company` / `OpportunityCompany` (potential-buyer shortlist)

- `Company` is a minimal potential-buyer identity only: `name` (display),
  `normalizedName`, optional `website`/`country`, and a unique `identityKey`
  (`normalizedName` + normalized country, joined by U+001F). It is **not** a CRM
  record; no contacts, ownership, demand or score. The first-seen display name is
  stable (a later case/whitespace variant of the same identity does not overwrite
  it).
- `OpportunityCompany` is an opportunity-scoped candidate. Observed facts
  (`observedActivityText`, `observedRoles` — a multi-valued observed-role list)
  are stored separately from the buyer-fit hypothesis
  (`buyerFitHypothesisText`); `unknownsText` and `nextVerificationStepText` are
  explicit. `reviewStatus` (`UNREVIEWED | SHORTLISTED | REJECTED`) with
  `reviewReason`/`reviewedAt` is operator-owned and a **separate dimension** from
  provenance.
- **Agent qualification (separate from operator review):**
  `agentQualificationStatus`
  (`NOT_ASSESSED | QUALIFIED | NEEDS_MORE_EVIDENCE | DISQUALIFIED`) plus
  `agentQualificationReason`/`agentAssessedAt`. Recording a qualification writes
  **only** these agent columns and never the `review_*` fields. `QUALIFIED`
  means product-fit suitability for contact discovery, not confirmed demand or
  purchasing intent. `eligibleForContactDiscovery` is computed on read: not
  human-rejected, **not stale**, AND (agent-qualified OR human-shortlisted). A
  replaced/retracted supporting claim sets `agentQualificationStale` (a prior
  qualification must be reassessed) and removes eligibility; re-qualifying while
  stale is refused. An explicit human `REJECTED` always wins.
- **Provenance is mandatory:** `sourceReferenceId` (derived from the evidence),
  `evidenceId` (restrict), optional `claimId` (`SET NULL`). Service-enforced: the
  run must belong to the opportunity, the evidence must belong to the run, and a
  linked claim must be `CURRENT`. A claim later replaced/retracted sets
  `needsReview` on read (the raw review state is never silently overwritten), and
  shortlisting is rejected while the claim is not `CURRENT`.
- **Deduplication:** `dedupKey` (unique) = `opportunityId` + `identityKey`, plus
  `@@unique([opportunityId, companyId])`; a repeated submission upserts (no
  duplicate) and refreshes the observed/hypothesis fields without changing the
  operator review state.

### 3.13 `Contact` / `ContactSource` (source-backed contacts)

- `Contact` is a public business contact for a `Company`: `contactType`
  (`GENERAL_COMPANY | NAMED_PERSON`), optional `email` / `phone` /
  `contactPageUrl`, and, for a named person, `personName` + `personJobTitle`
  (title only alongside a published name). Values are stored exactly as
  published; `normalizedEmail`/`normalizedPhone` exist only for deduplication and
  are never written back to the operator.
- `usabilityStatus` (`USABLE | UNUSABLE` + optional `unusableReason`) sets a
  contact aside without deleting it; `deliverabilityStatus`
  (`NOT_VERIFIED | VERIFIED | UNKNOWN`) distinguishes "published on a source"
  from a separately established deliverability result; `unknownsText` records
  what is not established.
- `ContactSource` holds provenance: `sourceReferenceId` (a `source_references`
  row, deduplicated by URL and owned by `evidence`), `retrievedAt`, and
  `excerptText`; `@@unique([contactId, sourceReferenceId])` makes a repeated
  submission idempotent, and many sources accumulate per contact.
- **Deduplication/identity:** a hashed `dedupKey` from company + type + strongest
  normalized channel (+ normalized name for a person), unique. A repeated
  submission upserts; adding the same value from a new source attaches a new
  `ContactSource` rather than overwriting.
- **No research-run coupling:** contacts reference neither `research_runs` nor
  run evidence; a source reference is get-or-created through the `evidence`
  service without run scope. Run deletion therefore cannot affect contacts, and
  contact discovery never reopens a run.

---

## 4. Constraints that Prisma cannot express

These are enforced in the initial migration SQL (hand-authored `ALTER TABLE …
ADD CONSTRAINT`), because Prisma's schema language cannot declare them:

| Constraint | Table | SQL name |
|---|---|---|
| Exactly one subject (Product XOR Offer) | `product_facts` | `product_facts_exactly_one_subject_check` |
| At least one value (text or numeric) | `product_facts` | `product_facts_has_value_check` |

Re-running `prisma migrate dev` after editing these by hand would not re-add
them (Prisma does not diff CHECK constraints), so any future change to these
rules must be added as a new hand-authored migration.

---

## 5. Identifiers, timestamps, and conventions

- **UUID** primary keys (`@default(uuid())` → PostgreSQL `uuid`).
- **UTC** timestamps stored as `timestamptz(6)` via `@db.Timestamptz(6)`.
- Enums map to PostgreSQL native enum types.
- Tables/columns are mapped with `@map` to snake_case; join tables `a_b`.

---

## 6. Boundary: ProductFact vs future research findings

- `ProductFact` is **canonical product data** — authored only by humans or a
  trusted internal product-data source (see
  `contracts/research-context.v1.md` §10). It is *not* research output.
- Research findings (what a researcher *observed* in the market) are persisted in
  the `evidence`-owned tables added by T-007 — `source_references`, `evidence`,
  `claims`, `claim_evidence` — and the run-scoped `research_queries`. Structured
  `research_records` / `research_findings` (owned by `research-records`) remain
  planned and are out of scope here.
- A research module **never** writes `product_facts`. If it discovers a product
  data gap it files a clarification request instead of inventing a fact.
- Fact versioning/append-only (`SUPERSEDED`) semantics from
  `contracts/research-context.v1.md` §8 are planned; T-004 stores the `status`
  column but defers the append-only versioning mechanics to the
  `products-and-offers` module task.

## 7. Research persistence boundary (T-007)

The research store keeps three things apart on purpose:

- **Discovery** (`research_queries`) — what was asked and with which tool; a
  search snippet is discovery, not evidence.
- **Evidence** (`evidence` + `source_references`) — an observation extracted
  from a fetched, deduplicated source, with a retrieval date and a verification
  status.
- **Conclusions** (`claims` + `claim_evidence`) — assertions derived from
  evidence, with type/confidence and an explicit per-evidence stance.

A generic `search_results` table is deliberately **not** modelled. Domain-
specific observations (e.g. price observations) are expected to reference
`evidence` later rather than expanding this foundation now.
