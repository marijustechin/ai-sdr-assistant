# Task: Mailbox verification feedback + action-state separation (web)

**Status:** COMPLETE (ready for human review — no live connection performed)

## Objective

Give clear, per-action results for Verify SMTP / Verify IMAP / Send test message,
and fix the spurious generic "The API rejected the request as invalid." message.

## Root cause of the misleading 400

`/email-accounts/:id/verify-smtp` and `.../verify-imap` are **bodyless POSTs**, but
the shared API client always sent `content-type: application/json`. The API
(Fastify) rejects an empty JSON body with `400`, which mapped to the generic
"invalid request" text; the test send sends a body, so it worked. Separately, the
panel used one shared `busy`/`message` for all actions, so results could bleed
between SMTP/IMAP/send.

## Changes

- `shared/api/client.ts`: only send `content-type: application/json` when a body
  is present (fixes bodyless POSTs). Added header tests.
- `shared/api/errors.ts`: specific, safe mappings for `mailbox_not_configured`,
  `invalid_email_account_configuration` (400) and `mailbox_credentials_missing`
  (409); 404 text generalised to "The requested item was not found.".
- `features/manage-email-account/verification-state.ts` (new, pure): per-action
  `idle | pending | success | error` state + button/detail derivation.
- `features/manage-email-account/mailbox-verification-panel.tsx`: independent
  state for SMTP, IMAP and send; pending disables only its own button and shows
  "Verifying…"; success shows an emerald-300 button + "SMTP verified"/"IMAP
  verified" with a small success message; error shows a destructive button and
  the returned safe detail. UI-session state only (never persisted).

## Tests / verification

- Web: 27 files / 146 tests pass (new `verification-state.test.ts` covers idle,
  pending, success, error and SMTP/IMAP independence; `errors.test.ts` and
  `client.test.ts` extended).
- `typecheck`, `lint` clean; production build exit 0; `verify.sh` 60/0.

## Notes

- Backend behaviour and redaction rules unchanged; no live connection run.
