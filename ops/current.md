# O-024 — Admin dashboard metrics + branding

**Status:** READY_FOR_HUMAN_REVIEW
**Type:** delegation
**Scope:** repository root (manager records) + delegated implementation in `soft/`

## Objective

Polish the admin dashboard: integrate the three approved branding assets
(monogram in the shell, favicon via Next metadata) and replace placeholder
Dashboard figures with real persisted counts from a read-only summary endpoint
that respects module ownership.

## Inputs / references

- `AGENTS.md`; `docs/system/{module-map.md,data-governance.md,architecture.md,project-state.md,decisions.md}`
- Human request (2026-09-22) with the two goals and metric list.
- Branding assets: `soft/apps/web/public/branding/*.webp`.

## Steps

- [x] Inspect Dashboard/shell and the products/research/leads/drafts services + contracts.
- [x] Add per-owner count reads and a new read-only `dashboard` composition module.
- [x] Integrate branding (monogram + favicon) using the assets as-is.
- [x] Add tests and update docs.
- [ ] Human review / acceptance.

## Deliverables

- `soft/packages/contracts/src/dashboard.ts`; `soft/apps/api/src/modules/dashboard/*`;
  owner count methods; `soft/apps/api/test/dashboard-api.spec.ts`.
- `soft/apps/web`: `lib/branding.ts`, `lib/dashboard/metrics.ts`, `lib/api/dashboard.ts`,
  shell/page wiring (monogram + favicon via `metadata.icons`; removed the legacy
  placeholder `app/favicon.ico`), tests.
- Docs + task record `soft/tasks/done/2026-09-22-admin-dashboard-metrics-and-branding.md`.

## Acceptance criteria

- [x] Monogram replaces the "AS" placeholder in sidebar/header; brand text kept; favicon wired via `metadata.icons`; assets used unchanged.
- [x] Dashboard cards show real counts: active products (lifecycle `ACTIVE`), research runs (+completed), leads, outreach drafts.
- [x] Read-only `GET /dashboard/summary` owns no tables and aggregates through owner services; no cross-module DB access.
- [x] Zero/error/not-configured behavior; no secrets; no new schema.
- [x] Tests/typecheck/lint/verify/build green.

## Out of scope

- Sending, SMTP/IMAP, polling, inbox, O-023 behavior; conversion/sends/replies/revenue metrics; new branding assets.

## Verification

- Contracts 56, API dashboard spec 5, web 131 tests pass; typecheck/lint clean;
  `verify.sh` 60/0; production build exit 0; live summary + favicon verified.

## Rollback/blocked conditions

- Remove `DashboardModule`/endpoint and revert the shell/page; branding is additive. No blockers.

## Completion record

Completed 2026-09-22; all mandatory checks green; workspace
READY_FOR_HUMAN_REVIEW. No commit/push. Full detail in the programmer archive.
