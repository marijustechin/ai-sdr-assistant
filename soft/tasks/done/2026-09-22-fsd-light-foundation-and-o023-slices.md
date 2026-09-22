# Task: FSD-light foundation + O-023 prerequisite slices

**Status:** COMPLETE (ready for human review)

## Objective

Establish the FSD-light structure before O-023: Phase 1 (aliases, test
collection, boundary enforcement, `shared/` kernel) and Phase 2 for the three
slices O-023 needs (email-account, sender-profile, outreach-draft). No behavior or
API-contract change; no O-023/O-024 functionality.

## Completion record

### 1. Files created/changed (moves)

**Phase 1 — `shared/` kernel**
- `lib/utils.ts` → `shared/lib/utils.ts`
- `lib/format.ts` + `.test.ts` → `shared/lib/`
- `lib/nav.ts` + `.test.ts` → `shared/lib/`
- `lib/branding.ts` + `.test.ts` → `shared/lib/`
- `lib/env.ts` → `shared/config/env.ts`
- `lib/api/client.ts` + `.test.ts` → `shared/api/`
- `lib/api/errors.ts` + `.test.ts` → `shared/api/`
- `lib/api/boundary.test.ts` → `shared/api/boundary.test.ts` (rewritten)
- `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs` (aliases, collection,
  `no-restricted-imports` for `@/app`).

**Phase 2 — slices**
- email-account: `lib/email-accounts/{types,display,display.test}.ts` →
  `entities/email-account/`; `lib/email-accounts/{payload,payload.test}.ts` →
  `features/manage-email-account/`; `lib/api/email-accounts.ts` read/write split →
  `entities/email-account/api.ts` + `features/manage-email-account/api.ts`;
  `lib/api/email-accounts-actions.ts` → `features/manage-email-account/actions.ts`;
  `components/email-accounts/email-account-form.tsx` →
  `features/manage-email-account/form.tsx`; added `index.ts` barrels.
- sender-profile: analogous split into `entities/sender-profile/` +
  `features/manage-sender-profile/`.
- outreach-draft: `lib/outreach/*` + `lib/api/outreach.ts` +
  `components/leads/outreach-draft-list.tsx` → `entities/outreach-draft/`
  (entity only; no write feature).

### 2. Migration

Not needed (frontend-only; no schema change).

### 3. Endpoints/contracts

None changed. Route paths unchanged; API calls unchanged.

### 4. Commands run and results

- Phase 1: web test **26 files / 138 tests** (baseline 26/131; +7 from the
  expanded boundary test); typecheck/lint/build clean; `verify.sh` 60/0.
- Phase 2: web test **26 files / 138 tests** (no drops); moved tests confirmed
  collected under `entities/` + `features/`; typecheck/lint/build clean;
  `verify.sh` 60/0.
- Live smoke: `/settings/email-accounts[/new]`, `/settings/sender-profiles[/new]`
  → 200; lead detail page (moved `OutreachDraftList`) → 200 with "Outreach draft".

### 5. Verification evidence

Test counts before/after are equal at every phase (26/138 after the boundary-test
expansion); Vitest output lists
`entities/{email-account,sender-profile,outreach-draft}/display.test.ts` and
`features/{manage-email-account,manage-sender-profile}/payload.test.ts`.
Boundary rules: entity read APIs are `server-only`, feature action files are
`"use server"`, client modules never import server-only API/config/entity-read,
`entities/` never import `@features`/`@widgets`, `features/` never import
`@widgets`, `shared/` never imports a layer, and nothing imports `@/app`.

### 6. Known limitations

- Transitional: product, research, lead, contact and dashboard widgets remain in
  `components/` + `lib/` (intentionally out of scope). `components/ui` is treated
  as shared by role, not yet moved.
- `lib/api/actions.ts` still mixes product + research-request actions until those
  slices migrate.
- No transitional re-export shims were used; all kernel consumers were updated.

### 7. Decisions/blockers

- Layering + public-API conventions documented in
  `soft/apps/web/docs/frontend-architecture.md`. No blockers.
