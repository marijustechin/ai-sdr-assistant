# Research Context Contract — Implementation Companion (v1)

**Canonical contract:** [`docs/system/research-context-contract.md`](../../../docs/system/research-context-contract.md)
(repository root). This file does **not** restate the contract; it records the
implementation-level notes for the `soft/` workspace.
**Schema version literal:** `research_context_v1`
**Status:** Implementation companion (the canonical contract is owned by
`docs/system/`).

---

## What this file owns

- the literal `SCHEMA_VERSION` value and where it is defined in code (planned:
  `soft/packages/contracts`);
- how redaction is enforced in implementation (`ResearchContextService`,
  planned, in `control-plane`);
- the DI-vs-REST parity requirement for workers;
- implementation test expectations (see [`../testing.md`](../testing.md) §2).

## Constraints the implementation MUST honor

These are normative and come from the canonical contract:

- Research modules receive **only** `taskId` + `opportunityId`.
- Facts: only `status = CONFIRMED` **and** `visibility = OPERATIONAL` are
  asserted; `PENDING` and `RESTRICTED` are redacted; `SUPERSEDED` is absent.
- `status` and `visibility` are **separate dimensions** (implemented schema:
  `PENDING | CONFIRMED | SUPERSEDED` plus `OPERATIONAL | RESTRICTED`).
- Every payload carries `schemaVersion: 'research_context_v1'`; consumers refuse
  unknown versions.
- Asserted facts carry **resolved** evidence metadata, not bare source IDs.
- Redaction happens **at assembly time**, on both the DI and REST paths.

## Planned implementation surfaces

| Concern | Location | State |
|---|---|---|
| Zod schemas + shared types | `soft/packages/contracts` | planned |
| Context assembler + redaction | `control-plane` `ResearchContextService` | planned |
| `GET /opportunities/:id/research-context` | `soft/apps/api` | planned |
| `POST`/`GET /opportunities/:id/research-runs` | `soft/apps/api` | planned |
| `research_contexts` snapshot | `soft/packages/database` | planned |
| `research_runs` (+ scope join) | `soft/packages/database` | **implemented** (T-004) |
| `product_facts` status/visibility | `soft/packages/database` | **implemented** (T-004) |

## Tests

Per [`../testing.md`](../testing.md) §2, a context-assembly test must prove:
SUPERSEDED facts absent; PENDING/RESTRICTED values redacted; `schemaVersion`
present; only CONFIRMED+OPERATIONAL facts asserted with resolved evidence.

See [`../data-model.md`](../data-model.md) for the implemented schema behind the
fact model.
