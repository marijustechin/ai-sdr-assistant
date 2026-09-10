# Data Model — Core Commercial Domain

> **Canonical source:** table ownership and write rules live at the repository
> root in [`docs/system/data-governance.md`](../../docs/system/data-governance.md).
> This file is the implementation-local description of the implemented schema;
> the root canonical document wins on ownership/write rules.

**Status:** Live (established by T-004).
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
```

- A **Product** is stored once and is the canonical product identity.
- An **Offer** is a concrete sellable form (variant) of exactly one Product.
- A **ProductFact** is a single structured, typed fact about exactly one
  Product *or* one Offer (never both, never neither).
- An **Opportunity** is the commercial work unit, bound to exactly one Offer.
- An **Opportunity** targets multiple **TargetMarket**s through an explicit
  join.
- A **ResearchRun** records that market research was requested/executed for one
  Opportunity, scoped to target markets through an explicit join.

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
| `ResearchRun` | `research_runs` | Auditable record that market research ran for one Opportunity. | `market-researcher` |
| `ResearchRunTargetMarket` | `research_run_target_markets` | Target-market scope of a `ResearchRun`. | `market-researcher` |

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
- `lifecycleStatus` — `OpportunityStatus`: `DRAFT | ACTIVE | CLOSED | ARCHIVED`.

### 3.6 `ResearchRun`

- `status` — `ResearchRunStatus`: `QUEUED | RUNNING | COMPLETED | FAILED | CANCELLED`.
- `requestedAt` (default now), `startedAt`, `finishedAt` (nullable).
- `errorCode` / `errorNote` (nullable) — failure-safe code or note.
- `contextVersion` (int) — the research-context revision this run is bound to.
- **Never** stores LLM chain-of-thought, credentials, or scraped pages.

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
- Research findings (what a researcher *observed* in the market) will live in
  `research_records` / `research_findings` (owned by `research-records`), with
  sources in `source_references` / `claims` (owned by `evidence`). Those tables
  are **not** part of T-004 and are deliberately out of scope here.
- A research module **never** writes `product_facts`. If it discovers a product
  data gap it files a clarification request instead of inventing a fact.
- Fact versioning/append-only (`SUPERSEDED`) semantics from
  `contracts/research-context.v1.md` §8 are planned; T-004 stores the `status`
  column but defers the append-only versioning mechanics to the
  `products-and-offers` module task.
