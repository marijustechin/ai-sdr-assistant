# Task: Sender profiles, product assignment and drafting integration (O-021 extension)

**Status:** DONE

**Archived:** 2026-09-22

**Parent:** O-021

## Objective

Reusable sender profiles + optional product assignment; drafting resolves the
assigned active profile identity automatically. SMTP password encrypted at rest
and never exposed; identity-only profiles usable; explicit assignment; drafts
snapshot the non-secret identity and version on identity change. No sending.

## Files created/changed

- `packages/database/prisma/schema.prisma` — `SenderProfile`,
  `SenderProfileStatus`, `SmtpTlsMode`; `products.sender_profile_id`;
  `outreach_drafts.sender_profile_id` + `sender_snapshot`; back-relations.
- `packages/database/prisma/migrations/20260922100000_add_sender_profiles/migration.sql` (new).
- `packages/contracts/src/sender-profiles.ts`, `products.ts` (senderProfileId), `outreach.ts` (sender inputs removed), `index.ts`.
- `apps/api/src/modules/sender-profiles/**` (new: secret-box, repository, service, controller, module), `app.module.ts`.
- `apps/api/src/modules/products-and-offers/**` — assignment validation/mapping/response; import `SenderProfilesModule`.
- `apps/api/src/modules/outreach-drafter/**` — resolve profile, snapshot, blocked guidance, versioning.
- `apps/api/test/{sender-profiles-api.spec.ts,outreach-drafts-api.spec.ts,helpers/database.ts}`, `packages/database/test/helpers/database.ts`, `packages/contracts/test/{sender-profiles-contracts.spec.ts,outreach-contracts.spec.ts,contracts.spec.ts}`.
- Web: `apps/web/lib/sender-profiles/**`, `apps/web/lib/api/sender-profiles{,-actions}.ts`, `apps/web/components/sender-profiles/sender-profile-form.tsx`, settings pages, `nav-items.ts`, product form/pages/libs, `lib/outreach/display.ts`, `components/leads/outreach-draft-list.tsx`.
- Docs: `soft/docs/{data-model,data-ownership,security}.md`, `soft/.env.example`.

## Schema/migration impact

Additive `20260922100000_add_sender_profiles` (table + two enums + product/draft
columns). Pre-migration backup taken. Applied to `ai_sdr` and `ai_sdr_test_api`;
`prisma migrate status` clean. Rollback: drop the table/enum + columns.

## Endpoint/contract impact

- `POST/GET /sender-profiles`, `GET/PATCH /sender-profiles/:id` (guarded; redacted reads).
- `POST/PATCH /products` accept optional `senderProfileId`; response includes it.
- `PrepareOutreachDraftSchema` no longer accepts a sender identity (resolved from the profile).
- `CreateSenderProfileSchema`, `UpdateSenderProfileSchema`, `SenderProfileResponseSchema`.

## Verification

- Contracts pass (incl. sender-profile + product/outreach changes).
- API **81 passed** (14 files) — sender CRUD/disable, encrypted storage +
  redacted reads + preserve/replace/clear, missing-key 503, invalid SMTP,
  identity-only drafting, missing/disabled profile blocking, idempotency,
  identity-version vs password-only (no new version), stale sender warning,
  history preserved.
- Web **104 passed** (20 files); `-r typecheck`/`lint` clean; `verify.sh` 60/0;
  production build exit 0 (settings routes built).
- Dashboard: Settings → Sender profiles empty state; product selector shows
  "Not assigned" + no-profiles hint; lead draft section renders guidance with
  links and no send button. No real profile/assignment created; the three
  existing blocked drafts are preserved.

## Known limitations

- No transport/sending, follow-ups or inbox (out of scope).
- `SENDER_SECRETS_KEY` is not yet provisioned in any environment (operator
  supplies it before saving SMTP passwords); identity-only profiles work now.
- Real drafts for the three leads remain `BLOCKED` until the operator assigns a
  profile; retry is agent-driven (no worker).
- The scaffolding fallback uses English when a mapped language is unavailable;
  the observed-activity text is interpolated as recorded.

## Decisions / blockers

- Recorded in `docs/system/decisions.md` (2026-09-22).
- No blockers. Not committed/pushed (per task).
