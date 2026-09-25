# O-024 — Admin dashboard metrics + branding

**Task ID:** O-024
**Status:** ACCEPTED — committed
**Completed:** 2026-09-22
**Commit:** 2f7d479
**Type:** delegation
**Scope:** `soft/` implementation + canonical docs

> Reconciliation note (2026-09-25, O-026): no manager archive was written for
> this task before the next task began; it existed only in `ops/current.md` and
> `ops/backlog.md`. This record was reconstructed during the O-026
> documentation-state reconciliation from the programmer archive, the committed
> code, and git history. It is not a contemporaneous record.

## Objective

Replace Dashboard placeholders with real persisted counts through a read-only
composition module, and integrate the approved branding (monogram in the shell,
favicon via Next metadata).

## Deliverables

- New read-only `dashboard` composition module (`GET /dashboard/summary`, owns
  no tables); counts come from each owning module's application service
  (`products-and-offers`, `market-researcher`, `lead-discoverer`,
  `outreach-drafter`).
- Admin shell branding: monogram replaces the placeholder "AS" square; favicon
  wired through Next `metadata.icons`.
- No new schema/migration.

## Acceptance criteria

- [x] Dashboard shows real persisted counts; no cross-module table access.
- [x] Branding integrated from the approved assets; no sending/polling metrics
  shown because those capabilities do not exist.
- [x] Tests/typecheck/lint/build/verify green.

## Verification

- Recorded in `soft/tasks/done/2026-09-22-admin-dashboard-metrics-and-branding.md`.

## Completion record

Accepted/committed to `main` as `2f7d479`
(`feat(web): add live dashboard metrics and branding`). The FSD-light frontend
foundation it built on is `e9a7f71` (archived as
`soft/tasks/done/2026-09-22-fsd-light-foundation-and-o023-slices.md`).
