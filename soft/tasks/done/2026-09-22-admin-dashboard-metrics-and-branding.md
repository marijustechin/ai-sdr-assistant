# Task: Admin dashboard metrics + branding (O-024)

**Status:** COMPLETE (ready for human review)

## Objective

Two-part admin polish: (1) integrate the approved AI SDR Assistant branding
(monogram in the shell, favicon via Next metadata); (2) replace placeholder
Dashboard metrics with real persisted counts from an appropriate read-only
endpoint. No sending/polling and no changes to existing business data.

## Completion record

### 1. Files created/changed

**Contracts**
- New `packages/contracts/src/dashboard.ts` (`DashboardSummarySchema`) + `index.ts`.
- New test `packages/contracts/test/dashboard-contracts.spec.ts`.

**API (owner count methods — each module reads its own table only)**
- `products-and-offers/{infrastructure,application}`: `countProductsByLifecycle`.
- `market-researcher/{infrastructure,application}`: `countRunsByStatus` / `countRuns`.
- `lead-discoverer/{infrastructure,application}`: `countLeads`.
- `outreach-drafter/{infrastructure,application}`: `countDraftsByPreparationStatus` / `countDrafts`.

**API (new read-only composition module)**
- `apps/api/src/modules/dashboard/{application/dashboard.service.ts,presentation/dashboard.controller.ts,dashboard.module.ts}`.
- `apps/api/src/app.module.ts`.
- New test `apps/api/test/dashboard-api.spec.ts`.

**Web**
- New `lib/branding.ts`; `lib/dashboard/metrics.ts`; `lib/api/dashboard.ts`.
- `app/layout.tsx` (favicon via `metadata.icons`); removed the legacy placeholder
  `app/favicon.ico` so the approved asset is authoritative;
  `components/dashboard/sidebar.tsx` and `dashboard-shell.tsx` (monogram replaces
  the "AS" placeholder); `components/dashboard/stat-card.tsx` (placeholder prop
  removed); `app/(dashboard)/page.tsx` (real metrics + error/not-configured
  handling).
- New tests `lib/branding.test.ts`, `lib/dashboard/metrics.test.ts`; `lib/api/boundary.test.ts` extended.

**Docs**
- `soft/apps/web/docs/MISSING_API.md` (new endpoint documented).
- `docs/system/{decisions.md,module-map.md,data-governance.md,architecture.md,project-state.md}`.

### 2. Migration

Not needed — no schema change. The dashboard endpoint is read-only aggregation.

### 3. Endpoints/contracts

- Added `GET /dashboard/summary` (guarded) → `DashboardSummarySchema`.
- No changes to existing endpoints/contracts.

### 4. Commands run and results

- `pnpm --dir soft --filter @ai-sdr/contracts test` → 9 files, 56 passed.
- `pnpm --dir soft --filter @ai-sdr/api exec vitest run test/dashboard-api.spec.ts` → 5 passed.
- `pnpm --dir soft --filter web test` → 26 files, 131 passed.
- `pnpm --dir soft -r typecheck` → all projects Done.
- `pnpm --dir soft -r lint` → all Done.
- `bash soft/scripts/verify.sh` → 60 passed, 0 failed.
- `pnpm --dir soft build` → exit 0.
- Live check: `GET /dashboard/summary` returned real counts; `/` rendered the four
  cards with real values and the favicon `<link rel="icon" type="image/webp">`.

### 5. Test/verification evidence

Zero and non-zero counts; product lifecycle filtering (active ≠ all); research
run total vs completed; leads and drafts from a real drafting flow; secret-free
response; schema shape/negative rejections; card derivation (rendering seam,
including singular/plural hints); branding asset paths + WEBP magic + layout
`metadata.icons` + monogram usage and removal of the "AS" placeholder.

### 6. Known limitations

- Draft `total` counts persisted draft records (append-only/versioned), matching
  the domain model; it is not "distinct leads with a draft".
- No dark mode exists in the UI; the transparent monogram is rendered as-is on the
  light sidebar/header.
- WebP is not a supported App Router **file-convention** icon type
  (`.ico/.jpg/.jpeg/.png/.svg` only), so the approved favicon is wired through the
  `metadata.icons` API. The legacy tracked placeholder `app/favicon.ico` was
  removed so only the approved asset is emitted (`git status` shows the deletion,
  uncommitted).
- The wordmark (caption) asset is retained but not wired: the existing two-line
  brand text is cleaner at the sidebar width.
- No loading skeleton (none exists elsewhere in the admin UI); the page streams
  per request.

### 7. Decisions/blockers

- Decision recorded in `docs/system/decisions.md` (2026-09-22, dashboard
  composition module + metric definitions). Deliberately omitted metrics:
  conversion, sends, replies, revenue, pipeline value (not implemented). No
  blockers.
