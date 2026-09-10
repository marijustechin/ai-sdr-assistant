# Ops Backlog — Root Manager

Ordered upcoming **manager** tasks. Only one is active (`ops/current.md`). The
agent must not start any of these without a new `ops/current.md`.

## Next (candidate, priority order)

1. **Confirm remote + baseline commit policy** — decide the remote URL and the
   commit scope now that the root manager workspace exists; delegate the
   baseline commit to the programmer loop or perform it as an explicit
   human-approved manager action. Depends on: O-001. Ref:
   `docs/system/project-state.md`; `soft/tasks/done/2026-09-10-commit-push-foundation-baseline-superseded.md`.
2. **Delegate the first functional slice: Catalogue + Research Context API** —
   write a single `soft/tasks/current.md` task (products-and-offers +
   opportunities + control-plane skeleton + `ResearchContextService` +
   `GET /opportunities/:id/research-context`). Depends on: remote/commit policy.
   Ref: `docs/system/research-context-contract.md`, `docs/system/module-map.md`.
3. **Knowledge + Approvals human gate** — delegate once the first slice lands.
4. **Research-records + Market Researcher (+ jobs/worker)**.
5. **Discovery & intelligence** (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
6. **Outreach + inbox**.

## Blocked / deferred

- Repository baseline commit/push — blocked by the missing remote and the
  superseded T-005 (see `docs/system/project-state.md`).
- Production deployment — deferred.
- External integrations (search providers, email) — deferred.

## Historical note

`docs/redesign/**` and `legacy/**` are historical/superseded and non-live.
They inform terminology and design but are never the current authority.
