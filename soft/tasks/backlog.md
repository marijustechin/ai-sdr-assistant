# Backlog

Ordered list of upcoming tasks. Only one is ever active (`tasks/current.md`).
The agent must not start these without a new `tasks/current.md`.

## Next (candidate, in priority order)

1. **`packages/database` foundation** — establish the single Prisma schema +
   migration chain and direct Prisma client boundary (no business tables beyond
   the first slice). Depends on: nothing. Ref: `docs/architecture.md` §6, `docs/data-ownership.md` §5.
2. **First vertical slice** — `Product`, `ProductFact`, `Opportunity`,
   `OpportunityOffer`, `TargetMarket`, `Task`, `Execution`, `Activity`,
   `Source`, `Claim`, and `ResearchContextService` (no AI/search/BullMQ/UI).
   Ref: `docs/contracts/research-context.v1.md`.
3. **`control-plane` + `evidence` modules** — task/execution/activity routing and
   source/claim persistence with validation. Ref: `docs/module-boundaries.md` §1, §5.
4. **`approvals` + `knowledge`** — human approval gate and versioned knowledge.
   Ref: `docs/module-boundaries.md` §14, §4.
5. **`research-records` + `market-researcher`** — first AI vertical + BullMQ.
   Ref: `docs/module-boundaries.md` §6, §7, §15.
6. **Discovery & intelligence** — `lead-discoverer` → `lead-evaluator` →
   `company-intelligence` → `contact-discovery`.
7. **Outreach + inbox** — `outreach-drafter`, then `inbox-intelligence`.

## Blocked / deferred

- Worker process (`apps/worker`) — deferred until a long-running operation
  justifies it.
- External integrations (search providers, email) — deferred; adapters behind
  interfaces only.

## Historical note

Prior research and planning live in `../legacy/` (non-live). Import decisions
are their own future task, not implied by anything here.
