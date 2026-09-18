# Task: Source-backed business contacts for shortlisted leads

**Status:** DONE

**Archived:** 2026-09-18

**Parent:** O-020 — Source-backed business contacts for shortlisted leads

## Objective

Implement the smallest complete, product-independent slice that stores public
business contacts for the companies behind shortlisted leads — each with its own
provenance — and surfaces a Contacts section on the lead detail page. Isolated
synthetic testing only.

## Files created/changed

- `packages/database/prisma/schema.prisma` — `Contact`, `ContactSource`,
  `ContactType`, `ContactUsability`, `ContactDeliverability`; back-relations on
  `Company` and `SourceReference`.
- `packages/database/prisma/migrations/20260918140000_add_contacts/migration.sql` (new).
- `packages/contracts/src/contacts.ts` (new), `packages/contracts/src/index.ts`.
- `apps/api/src/modules/contact-discovery/**` (new module), `apps/api/src/app.module.ts`.
- `apps/api/src/modules/evidence/application/evidence.service.ts` — non-run
  `getOrCreateSource`.
- `apps/api/src/modules/lead-discoverer/{application,infrastructure}` — `getCompany` / `findCompany`.
- `apps/api/test/{contacts-api.spec.ts,contact-normalize.spec.ts}`, `apps/api/test/helpers/database.ts`, `packages/database/test/helpers/database.ts`.
- `packages/contracts/test/contacts-contracts.spec.ts`.
- Web: `apps/web/lib/contacts/**`, `apps/web/lib/api/{contacts.ts,contacts-actions.ts}`,
  `apps/web/components/leads/{contact-list.tsx,contact-usability-form.tsx,copy-button.tsx}`,
  lead detail page.
- Docs: `soft/docs/{data-model,data-ownership}.md`.

## Schema/migration impact

Additive `20260918140000_add_contacts` (`contacts`, `contact_sources`, three
enums; owner `contact-discovery`). Applied to `ai_sdr` and `ai_sdr_test_api`;
`prisma migrate status` clean. Rollback: drop `contact_sources`, `contacts`, and
the three enums.

## Endpoint/contract impact

- `POST /companies/:companyId/contacts` (idempotent; provenance required)
- `GET  /companies/:companyId/contacts`
- `PATCH /companies/:companyId/contacts/:contactId` (usability/deliverability)
- Contracts: `CreateContactSchema`, `UpdateContactSchema`, `ContactTypeSchema`,
  `ContactUsabilitySchema`, `ContactDeliverabilitySchema`.

## Commands run and results

- `pnpm --dir soft db:migrate` / `db:generate` → applied/generated.
- `pnpm --dir soft --filter @ai-sdr/contracts test` → pass.
- `pnpm --dir soft --filter @ai-sdr/api test` → **67 passed** (12 files; incl. 6 contacts API + 4 normalization tests).
- `pnpm --dir soft --filter web test` → **99 passed** (18 files; incl. contact display tests).
- `pnpm --dir soft -r typecheck` / `-r lint` → clean.
- `bash scripts/verify.sh` → **60 passed, 0 failed**.

## Verification evidence

- Persistence + provenance: a contact stores the value as published and its own
  source URL, retrieval date and excerpt.
- Deduplication: identical resubmission is idempotent; the same value published
  on a second source adds a second `contact_sources` row (no overwrite).
- General vs named person: distinct types; a named person keeps the published
  title; different people are separate contacts; no invented values.
- Unusable handling: `PATCH` marks `UNUSABLE` with a reason, restore clears it,
  provenance retained.
- API protection: `x-internal-api-key` required (401 without); unknown fields and
  channel-less contacts 400; unknown company 404.
- Dashboard: the lead detail page renders the **Contacts** section with an
  honest empty state; live API shows 0 contacts for the real company; all
  integration/unit verification used synthetic data.

## Known limitations

- Deliverability is recorded as a state (`NOT_VERIFIED` default); no verification
  is performed here.
- One provenance row per (contact, source); the UI lists sources flat.
- The lead detail page fetches contacts for the lead's company (company-scoped),
  not per opportunity.
- No live contact search was performed (deliberately out of scope); the real UI
  is an empty state.

## Decisions / blockers

- `contact_sources` is implemented under `contact-discovery` for this slice
  (planned owner was `evidence`); `source_references` remains `evidence`-owned
  and is reused via a non-run `getOrCreateSource`. Recorded in
  `docs/system/decisions.md` (2026-09-18) and `docs/system/data-governance.md`.
- No blockers. Not committed/pushed (per task).
