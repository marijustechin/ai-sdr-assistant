# Task: Password mailbox SMTP/IMAP verification — READY_FOR_HUMAN_REVIEW

**Status:** READY_FOR_HUMAN_REVIEW
**Type:** delegation (implementation complete; awaiting human review)
**Scope:** `soft/` implementation + canonical docs

## Objective

Roll back the (uncommitted) Microsoft OAuth2 work and keep only provider-neutral,
password-authenticated SMTP/IMAP functionality: bounded connection verification, a
bounded IMAP read, a bounded single-recipient test send, and secret redaction.
The model is simply: EmailAccount → SMTP + IMAP config → encrypted password →
sender identities.

## Deliverables

- Removed: Microsoft OAuth flow/PKCE/state, OAuth callback route, OAuth
  service/repository, token persistence, OAuth columns/table/enum,
  `MICROSOFT_OAUTH_*` env, Microsoft connection UI/status, Microsoft docs/tests.
- Kept/adapted: `nodemailer` + `imapflow`, `domain/mailbox-transport.ts`
  (password builders), `application/mailbox-verifier.service.ts` (bounded
  `verify-smtp` / `verify-imap` / `test-send`), contracts for the verification
  result + confirmed test send, and the web verification panel + Server Actions.
- New migration `20260922160000_drop_email_auth_kind` (removes the reserved
  `auth_kind` column and `EmailAuthKind` enum).

## Acceptance criteria

- [x] No Microsoft/OAuth schema, code, env, or docs remain.
- [x] Password SMTP/IMAP verification works in code + tests (no live connection run).
- [x] Secrets are never returned/logged; failures are short redacted codes.
- [x] Tests/typecheck/lint/verify/build green.

## Verification

- contracts 57, API 103, web 138 tests pass; verify.sh 60/0; build exit 0.

## Blockers / notes

- No live send/read performed.
- Prisma schema-engine is blocked by Device Guard on this host; the migration was
  applied via `psql` and recorded. Tests run with `TEST_DB_SKIP_MIGRATE=1`
  (default unchanged).

## Completion record

Implementation complete 2026-09-22; workspace READY_FOR_HUMAN_REVIEW. No
commit/push. Full detail: `soft/tasks/done/2026-09-22-mailbox-password-verification.md`.

## Follow-up (same review scope)

- Mailbox verification **feedback**: per-action `idle | pending | success | error`
  state for SMTP, IMAP and test send (emerald-300 verified button, destructive
  error button, safe detail), and a fix for the spurious generic 400 caused by
  bodyless POSTs sending `content-type: application/json`. See
  `soft/tasks/done/2026-09-22-mailbox-verification-feedback.md`.
- **IMAP verification diagnosis**: staged instrumentation (TCP/TLS probe then
  auth/INBOX/fetch classification, safe codes only) and empty-mailbox hardening;
  live SMTP + IMAP verification both succeed. See
  `soft/tasks/done/2026-09-22-imap-verification-diagnosis.md`.
