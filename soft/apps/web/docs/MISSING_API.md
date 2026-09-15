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
- A product-level research indicator needs a decision: a persisted field
  (schema change) or a derived read model on a read endpoint. The UI shows none.

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
