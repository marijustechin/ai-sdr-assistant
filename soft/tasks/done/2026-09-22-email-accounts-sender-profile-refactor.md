# Task: Email accounts + sender-profile refactor (O-022)

**Status:** COMPLETE (ready for human review)

## Objective

Introduce `email_accounts` (SMTP + IMAP, encrypted secrets), make
`sender_profiles` identity-only with an optional `email_account_id`, add
`outreach_drafts.email_account_id`, move the SMTP opt-in/autofill safeguards and
the 503 message to the Email-account form, and add Settings → Email accounts.
Architecture refactor only; no sending/polling/matching/worker.

## Completion record

### 1. Files created/changed

**Database / schema**
- `packages/database/prisma/schema.prisma`: new `EmailAccount` model + enums
  `EmailAccountStatus`/`EmailAuthKind`; renamed `SmtpTlsMode` → `EmailTlsMode`;
  dropped `sender_profiles.smtp_*`; added `sender_profiles.email_account_id` and
  `outreach_drafts.email_account_id` (+ relations/indexes).
- `packages/database/prisma/migrations/20260922120000_add_email_accounts/migration.sql`
  (additive; includes a manual rollback note).

**Contracts**
- New `packages/contracts/src/email-accounts.ts` (+ `index.ts` export).
- `packages/contracts/src/sender-profiles.ts`: identity-only + `emailAccountId`; SMTP removed.
- Tests: `packages/contracts/test/email-accounts-contracts.spec.ts` (new); `sender-profiles-contracts.spec.ts` (rewritten).

**API**
- New `apps/api/src/modules/email-accounts/**` (domain/infrastructure/application/presentation/module).
- `apps/api/src/security/secret-box.ts` (moved from `sender-profiles/domain`; `EMAIL_SECRETS_KEY`).
- `apps/api/src/modules/sender-profiles/**` (identity-only; validates the account reference).
- `apps/api/src/modules/outreach-drafter/**` (records `emailAccountId`; transport-only changes do not re-version; account-change stale note).
- `apps/api/src/app.module.ts`.
- Tests: `apps/api/test/email-accounts-api.spec.ts` (new); `sender-profiles-api.spec.ts` + `outreach-drafts-api.spec.ts` (updated); `test/helpers/database.ts`.

**Web**
- New `lib/email-accounts/{types,payload,payload.test,display,display.test}.ts`,
  `lib/api/email-accounts{,-actions}.ts`,
  `components/email-accounts/email-account-form.tsx`,
  `app/(dashboard)/settings/email-accounts/{page,new/page,[id]/page}.tsx`.
- `lib/sender-profiles/*` (identity + `emailAccountId`; SMTP removed), sender-profile form (mailbox selector, no SMTP), settings pages pass account options.
- `lib/api/errors.ts` (`EMAIL_SECRETS_KEY` message), `lib/outreach/types.ts`.

**Docs**
- `soft/docs/{data-model.md,data-ownership.md,security.md}`, `soft/.env.example`.
- Root canonical: `docs/system/{decisions.md,module-map.md,data-governance.md,architecture.md,project-state.md}` and `docs/system/research-harness/outreach-drafting.md`.

### 2. Migration

Applied (additive, no reset): `20260922120000_add_email_accounts` to dev `ai_sdr`
and (via test global-setup) `ai_sdr_test_api`. No backfill was needed — no live
`sender_profiles` rows existed. Rollback note is in the migration file.

### 3. Endpoints/contracts

- Added: guarded `POST/GET /email-accounts`, `GET/PATCH /email-accounts/:id` (redacted reads; write-only passwords).
- Changed: `POST/PATCH /sender-profiles` accept optional `emailAccountId`; response exposes `emailAccountId` and no SMTP fields.
- Drafts include `emailAccountId`.

### 4. Commands run and results

- `pnpm --dir soft db:migrate` → applied `20260922120000_add_email_accounts`; `db:generate` → OK.
- `pnpm --dir soft --filter @ai-sdr/contracts test` → 8 files, 53 passed.
- `pnpm --dir soft --filter @ai-sdr/api test` → 15 files, 89 passed.
- `pnpm --dir soft --filter web test` → 24 files, 121 passed.
- `pnpm --dir soft -r typecheck` → all 4 projects Done.
- `pnpm --dir soft -r lint` → all Done.
- `bash soft/scripts/verify.sh` → **60 passed, 0 failed** (run with a Windows→POSIX `node`/`pnpm` shim because the harness shell is WSL and the toolchain is Windows; no shim is committed).
- `pnpm --dir soft build` → exit 0; Next.js build lists `/settings/email-accounts[/new|/[id]]`.
- Live read-only smoke (restarted the dev API at :3003 with the new code): `GET /email-accounts` → `[]`, `GET /sender-profiles` → `[]`; web pages `/settings/email-accounts`, `/settings/email-accounts/new`, `/settings/sender-profiles`, `/settings/sender-profiles/new` → 200; the 3 real leads (MB Pirties meistrai / After 7 OÜ / SIA E`VITA) and their 3 drafts preserved with `emailAccountId = null`.

### 5. Test/verification evidence

Covered: credential-free account without the key; AES-256-GCM encryption of SMTP
and IMAP passwords (ciphertext `v1.`, never plaintext); preserve/replace/clear;
shared-credential rejection (contract on create, service on update); incomplete
triplet rejection; redacted reads; `503 secrets_key_not_configured` only when a
password is saved; sender-profile account-reference validation; product
assignment regression; draft idempotency (credential-only and account-swap changes
do not re-version; identity change does); web payload autofill safeguards
(transport fields omitted while off; shared IMAP credentials omitted).

### 6. Known limitations

- No sending, no IMAP connection/polling, no reply matching, no worker/scheduler
  (out of scope by design). `outbound_messages`/`inbound_messages`/`email_threads`
  are future tasks.
- OAuth2 is reserved (`authKind`/`provider`) but not implemented.
- Switching an account to `credentialsShared` while it still has stored IMAP
  credentials is rejected (clear them first) — deliberate and tested.

### 7. Decisions/blockers

- Decision recorded in `docs/system/decisions.md` (2026-09-22). No blockers.
