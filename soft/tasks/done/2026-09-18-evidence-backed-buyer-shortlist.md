# Task: Evidence-backed potential buyer shortlist (Leads)

**Status:** DONE

**Archived:** 2026-09-18

## Objective

Implement the smallest complete, product-independent slice that turns existing
research evidence into a reviewable, opportunity-scoped potential-buyer
shortlist surfaced in the product's Leads tab (O-019).

## Completion record

### Files created/changed

- `packages/database/prisma/schema.prisma` — `Company`, `OpportunityCompany`,
  `LeadReviewStatus`; back-relations on `Opportunity`, `SourceReference`,
  `Evidence`, `Claim`.
- `packages/database/prisma/migrations/20260918090000_add_companies_opportunity_leads/migration.sql` (new).
- `packages/contracts/src/leads.ts` (new), `packages/contracts/src/index.ts`.
- `apps/api/src/modules/lead-discoverer/**` (new module: `domain/identity.ts`,
  `domain/types.ts`, `infrastructure/lead.repository.ts`,
  `application/lead-discoverer.service.ts`, `presentation/leads.controller.ts`,
  `lead-discoverer.module.ts`); `apps/api/src/app.module.ts`.
- `apps/api/test/leads-api.spec.ts` (new); `apps/api/test/helpers/database.ts`;
  `packages/database/test/helpers/database.ts`.
- `packages/contracts/test/leads-contracts.spec.ts` (new).
- Web: `apps/web/lib/leads/{types.ts,display.ts,display.test.ts}` (new),
  `apps/web/lib/api/{leads.ts,leads-actions.ts}` (new),
  `apps/web/components/leads/{lead-status-badge.tsx,leads-list.tsx,lead-review-form.tsx}` (new),
  `apps/web/app/(dashboard)/products/[id]/leads/page.tsx` +
  `.../leads/[opportunityId]/[leadId]/page.tsx` (new),
  `apps/web/components/products/product-section-nav.tsx`.
- Docs: `soft/docs/data-model.md`, `soft/docs/data-ownership.md`; root
  `docs/system/data-governance.md`, `docs/system/project-state.md`,
  `docs/system/decisions.md`.

### Migration applied

`20260918090000_add_companies_opportunity_leads` — additive (`companies`,
`opportunity_companies`, `LeadReviewStatus`). Applied to `ai_sdr` and
`ai_sdr_test_api`; `prisma migrate status` clean. Rollback: drop the two tables
and the enum; no existing table/column changed.

### Endpoints / contracts

- `POST /opportunities/:opportunityId/leads` (idempotent create/resubmit)
- `GET  /opportunities/:opportunityId/leads`
- `GET  /opportunities/:opportunityId/leads/:leadId`
- `PATCH /opportunities/:opportunityId/leads/:leadId` (review status/reason)
- Contracts: `CreateLeadSchema`, `UpdateLeadReviewSchema`, `LeadReviewStatusSchema`,
  `LeadObservedRoleSchema`. All routes guarded by `x-internal-api-key`.

### Commands run and results

- `pnpm --dir soft db:migrate` → migration applied; `pnpm --dir soft db:generate` → client generated.
- `pnpm --dir soft --filter @ai-sdr/contracts build && test` → **35 passed**.
- `pnpm --dir soft --filter @ai-sdr/api test` → **56 passed** (10 files), incl. 7 new leads tests.
- `pnpm --dir soft --filter web test` → **92 passed** (17 files), incl. new `display.test.ts`.
- `pnpm --dir soft -r typecheck` → clean; `pnpm --dir soft -r lint` → clean.
- `bash scripts/verify.sh` (Git Bash) → **60 passed, 0 failed**.

### Population (via the API, run `9e4e6d02…` evidence only)

Three `UNREVIEWED` candidates created for opportunity
`8e1e12b2-5ce2-4159-88d5-4562ab5d76da`:

| Lead | Company | Country | Roles | Evidence | Claim |
|---|---|---|---|---|---|
| `c1c1c083-d428-4b18-843d-3f7712edf4d6` | MB Pirties meistrai | Lithuania | DESIGNER, INSTALLER, BUILDER | `7904ff50…` | CURRENT |
| `1d369e1f-91b7-44dc-9490-e2b11084e643` | After 7 OÜ | Estonia | BUILDER, INSTALLER | `6b88f5e6…` | CURRENT |
| `52d65d45-ae66-402a-98a7-52d0e986134c` | SIA E`VITA (svetnica.lv) | Latvia | BUILDER, INSTALLER | `ad9f2f0f…` | CURRENT |

No research offering was force-converted into a lead; only companies with an
evidence-backed buyer-fit rationale were included.

### Verification evidence

- Dedup: resubmitting the same company with different case/whitespace returned
  the same lead id and kept the count at 3.
- Review: `PATCH` → `SHORTLISTED` recorded reason + `reviewedAt`; `PATCH` →
  `UNREVIEWED` cleared them; final state is all `UNREVIEWED`.
- Provenance: each lead returns its evidence, source URL + retrieval date, and
  CURRENT claim; a replaced supporting claim sets `needsReview` and blocks
  shortlisting (covered by the integration test).
- Dashboard flow: `GET /products/<id>/leads` (200) renders all three candidates;
  the detail page (200) renders observed activity, buyer-fit hypothesis,
  supporting evidence and the review control; the product page links to Leads.

### Known limitations

- No `lead-evaluator`/`qualification_records`; review status only
  (`UNREVIEWED | SHORTLISTED | REJECTED`) — no scoring, no qualification fields.
- No contact discovery (deliberately the next slice); no email; no outreach.
- Candidate evidence/claim provenance is single-evidence per lead; multiple
  supporting evidence items are not modelled yet.
- A lead has no update/delete endpoint beyond the review action; observed/
  hypothesis fields refresh only via a resubmission.
- One-off data fix applied to a company display name during verification
  (identity unchanged; the one-off resubmit raced the hot-reload before the
  repository was changed to preserve the first-seen name).

### Decisions / blockers

- Bounded `lead-discoverer` slice now owns `companies` and
  `opportunity_companies`; recorded in `docs/system/decisions.md` (2026-09-18).
- No blockers. Not committed/pushed (per task).
