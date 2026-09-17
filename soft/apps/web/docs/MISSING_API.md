# Pending API dependencies (web admin)

The web admin talks to the internal API (`soft/apps/api`). This document records
what the UI still needs but the API does not expose, plus deferred architectural
questions. **No backend code was changed** by the task that updated this file.

All business endpoints require the `x-internal-api-key` header
(`apps/api/src/security/internal-api-key.guard.ts`). Errors are JSON:
`{ "error": string, "message"?: string }`. The key is used only server-side (see
`lib/api/client.ts`).

---

## Implemented product API used by the web app

| Method | Path | Purpose | UI |
|---|---|---|---|
| `POST` | `/products` | Create a product | `/products/new` |
| `GET` | `/products` | List products (most recently updated first) | `/products` |
| `GET` | `/products/:productId` | Read one product | `/products/[id]` |
| `PATCH` | `/products/:productId` | Partial update | `/products/[id]` |

Request/response bodies use the shared contracts: `CreateProductSchema`,
`UpdateProductSchema`, and `ProductResponseSchema`. The product lifecycle is
`DRAFT | ACTIVE | ARCHIVED`.

Other existing product-domain endpoints (`POST /products/:productId/offers`,
`POST /product-facts`) are not used by the current UI.

---

## Read-only Research results dashboard

The research view is read-only and requires **no new endpoint or schema change**.
It uses only existing reads:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/products/:productId/offers` | label offers by name |
| `GET` | `/products/:productId/opportunities` | opportunities + attached target markets |
| `GET` | `/opportunities/:id/research-runs` | run list (summaries) |
| `GET` | `/opportunities/:id/research-runs/:runId` | run detail: scope, checkpoint, queries |
| `GET` | `.../:runId/evidence` | evidence text/status/retrieval + source URL |
| `GET` | `.../:runId/claims?includeHistory=true` | current claims, or full history |
| `GET` | `.../:runId/offerings` | structured, evidence-linked company offerings |

The **offerings** view is now the primary browsing surface: company/product,
recorded location vs market served, application/treatment/dimensions, original
price wording with currency/unit, VAT/basis/sample enums, and `matchType`
(`EXACT_MATCH` / `ADJACENT` / `SUBSTITUTE` / `UNKNOWN`), each with its source and
linked CURRENT finding. `POST .../offerings` exists but is the **population**
path (manager/researcher), not used by the read-only UI; it is idempotent by a
per-run fingerprint and requires provenance.

Real gaps (documented, not worked around):

- **Structured usage/limits are not persisted.** The checkpoint schema is
  `{ coverage, pendingFollowUps, notes }`; discovery/retrieval counters live only
  in the free-text `notes`. The dashboard shows the recorded notes **verbatim**
  and states that structured usage fields are not available. It never parses
  counters or assumes an unrecorded cost is `0`.
- **Run scope** (target markets) is resolved from the opportunity's attached
  markets returned by `GET /products/:id/opportunities`. There is no dedicated
  run-scope read endpoint, and none is needed.
- **Filters** use only fields the API returns (claim type, confidence, evidence
  stance, lifecycle). No filter exists for price, geography, or application
  because those are not structured fields.
- **Prices** are not extracted from statements/evidence. Recorded price text
  (units/currency/VAT/sample-vs-full-product wording) is displayed verbatim; no
  normalisation or calculation is performed.

---

## Market research request flow (implemented 2026-09-17)

| Method | Path | Purpose | UI |
|---|---|---|---|
| `POST` | `/research-requests` | Submit a request (creates a `QUEUED` run) | `/products/[id]/research/new` |
| `GET` | `/research-requests?status=QUEUED` | Queued requests for discovery | `/products/[id]/research` |
| `GET` | `/research-requests/:runId` | Persisted parameters + product context | researcher intake (not shown) |

The form loads the product identity from the API (the operator never repeats a
description) and submits `productId` + validated `parameters` + an idempotency
`requestKey` generated per form instance. The button says "Submit research
request"; the result is shown as **"Queued — waiting for researcher"**. No
research runs automatically, and internal Offer/Opportunity ids never appear in
the UI.

---

## Deferred / future architectural decisions (NOT approved)

These are open questions, not planned schema changes.

### ProductFact read path (for a future specifications editor)

- Specifications are `ProductFact` records. `POST /product-facts` exists, but
  there is **no read endpoint** and facts are not included in the product
  response, so the UI cannot display them.
- A specifications editor would need either
  `GET /product-facts?productId=<uuid>` returning
  `{ id, key, valueText, valueNumeric, unit, status, visibility }[]`, or the
  product read response including its facts.
- Until then, the New/Edit product forms intentionally do not write
  specifications: that would create records the UI could not show and leave a
  partial write if one call failed.

### Product research state

- Research is **run-scoped** (`ResearchRun.status`), reached via
  Opportunity → Offer → Product. `Product` has no research-status field.
- A request can now be created from a product
  (`/products/[id]/research/new`), but the product page still has no single
  aggregated research-status field: status is read from each run. A product-level
  indicator would need a persisted field (schema change) or a derived read model;
  it is not implemented.

### Product ↔ TargetMarket association

- Targets are `opportunities`-owned (`TargetMarket`) with no product-level link.
  Target-market mutation is human-approved.
- A future association needs a defined model and write endpoint; no shape is
  assumed.

### `PAUSED` product lifecycle

- The contract/domain is `DRAFT | ACTIVE | ARCHIVED`. A `PAUSED` product
  lifecycle is deliberately not modeled. If wanted, it is a schema + contract
  change with a migration.

### Not planned for the first Product module

- `DELETE /products/:id`
- search, filtering, pagination, sorting controls

---

## Behavior without the deferred items

- `/products`, `/products/new`, and `/products/[id]` are fully functional for
  list → create → open → edit → change lifecycle.
- Specifications, research status, target markets, offers, and leads are not
  shown because the domain does not persist product-level data for them.
