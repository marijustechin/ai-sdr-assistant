# Task: Password mailbox SMTP/IMAP verification (OAuth rollback)

**Status:** COMPLETE (ready for human review — no live connection performed)

## Objective

Roll back the uncommitted Microsoft OAuth2 work and retain only provider-neutral,
password-authenticated SMTP/IMAP functionality. Password auth remains the working
path; no live send or mailbox read is performed.

## Completion record

### 1. Files created/changed

**Removed (Microsoft OAuth2)**
- API: `application/microsoft-oauth.service.ts`, `domain/pkce.ts`,
  `infrastructure/email-oauth-flow.repository.ts`; OAuth endpoints, config,
  schema (OAuth columns/table/`EmailOauthStatus`), contracts and tests.
- Web: `microsoft-connection-panel.tsx`, `app/api/oauth/microsoft/callback/route.ts`.
- Docs: `soft/docs/microsoft-oauth.md`; Microsoft sections in
  decisions/module-map/data-governance/project-state/security/data-model;
  `MICROSOFT_OAUTH_*` in `.env.example`.
- Migration `20260922140000_add_email_account_oauth` (deleted; DB objects and its
  `_prisma_migrations` row removed).

**Kept / adapted (provider-neutral)**
- `apps/api/src/modules/email-accounts/domain/mailbox-transport.ts` — password-only
  SMTP/IMAP option builders (host/port/TLS/auth).
- `apps/api/src/modules/email-accounts/application/mailbox-verifier.service.ts` —
  bounded `verifySmtp`, `verifyImap` (INBOX + ≤3 headers), `testSend`; redacted errors.
- `presentation/email-accounts.controller.ts` — `POST .../verify-smtp`,
  `.../verify-imap`, `.../test-send` (`confirm: true`); CRUD unchanged.
- `infrastructure/email-accounts.repository.ts` — `findPasswordCiphertexts`.
- Contracts: `MailboxVerificationResponseSchema`, `MailboxTestSendSchema`,
  `MailboxTestSendResponseSchema`; removed `authKind`/`EmailAuthKind`.
- Web: `features/manage-email-account/mailbox-verification-panel.tsx`,
  `server.ts` (server-only verify client), verification Server Actions, barrel.
- Deps kept: `nodemailer`, `imapflow`, `@types/nodemailer`.

**Schema / migration**
- Removed `EmailAccount.authKind` and enum `EmailAuthKind`; new additive migration
  `20260922160000_drop_email_auth_kind`.

**Tests**
- New: `test/mailbox-transport.spec.ts`,
  `test/email-accounts-verify-api.spec.ts`.
- Removed: `test/email-accounts-oauth-*.spec.ts`.
- `test/helpers/database.ts` reverted (no flow table); `test/global-setup.ts`
  retains the documented `TEST_DB_SKIP_MIGRATE` escape hatch.

### 2. Migration

`20260922160000_drop_email_auth_kind` (additive; drops the reserved column/enum).
Applied to dev `ai_sdr` and test `ai_sdr_test_api` via `psql` (Device Guard blocks
the Prisma schema-engine) and recorded in `_prisma_migrations`. The OAuth
migration and its artifacts were removed from both databases.

### 3. Endpoints/contracts

- `POST /email-accounts/:id/verify-smtp` / `verify-imap` → `{ ok, detail }`.
- `POST /email-accounts/:id/test-send` `{ to, confirm: true }` → `{ ok, detail, messageId }`.
- `EmailAccountResponseSchema` no longer has `authKind`/OAuth fields.

### 4. Commands run and results

- `contracts test` → 9 files / 57 tests passed.
- `api test` (with `TEST_DB_SKIP_MIGRATE=1`) → 18 files / 103 tests passed.
- `web test` → 26 files / 138 tests passed.
- `-r typecheck` and `-r lint` → all Done.
- `scripts/verify.sh` → 60 passed / 0 failed.
- production build → exit 0.

### 5. Test/verification evidence

Provider-neutral builders (587 STARTTLS, 465 SSL/TLS, 993 SSL/TLS, username
fallback, bound/timeout, unconfigured rejection); verification endpoints refuse a
missing password (409 `mailbox_credentials_missing`), an unconfigured transport
(400 `mailbox_not_configured`), an unknown account (404), and an unconfirmed test
send (400); password ciphertext storage + redaction; no live connection opened.

### 6. Known limitations

- No live SMTP/IMAP verification or send performed; the human confirms exact
  hosted settings and runs the bounded actions from the account page.
- `TEST_DB_SKIP_MIGRATE=1` remains needed on this Device-Guard-blocked host.

### 7. Decisions/blockers

- Decision recorded in `docs/system/decisions.md` (2026-09-22: password-only
  mailbox auth; reserved auth kind removed).
