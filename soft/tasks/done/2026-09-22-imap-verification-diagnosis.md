# Task: Live IMAP verification diagnosis + staged instrumentation

**Status:** COMPLETE (ready for human review)

## Objective

Diagnose the live IMAP verification failure for the sapiensmetric mailbox, safely
instrument the verification path to distinguish TCP/TLS/auth/INBOX-open/fetch/
timeout, and ensure an empty mailbox still verifies successfully.

## Live finding

After instrumenting and restarting the dev API with the current code, the live
bounded IMAP verification **succeeded**:

- `POST /email-accounts/86f79b11-…/verify-imap` →
  `{ "ok": true, "detail": "IMAP authenticated; INBOX opened; examined 1 message header(s)." }`
- `POST …/verify-smtp` → `{ "ok": true, "detail": "SMTP authenticated (mail.sapiensmetric.eu:465, SSL/TLS)." }`

The account uses `mail.sapiensmetric.eu:993` SSL/TLS with `credentials_shared = true`
(IMAP reuses the SMTP username/password; no separate IMAP password is stored).

**No failing stage could be reproduced** with the current code, so there is no
confirmed stage to name. The response now reports the exact stage if a failure
recurs. Two concrete defects that could previously have produced a non-transport
"failure" were already addressed in the preceding task (bodyless POST sending
`content-type: application/json` → spurious API 400) and the stale dev API process
running pre-rollback code (now restarted).

## Changes

- **`apps/api/src/modules/email-accounts/domain/imap-diagnostics.ts` (new, pure):**
  `classifyImapConnectError` (authentication / timeout / tls / tcp / connect),
  `safeErrorCode` (short code only, never a message), `sampleFetchRange` (null for
  an empty mailbox, otherwise `1:min(exists,3)`).
- **`application/mailbox-verifier.service.ts`:** IMAP verification is now staged:
  1. TCP vs TLS probe (`node:net` + `node:tls`, bounded 10s) — distinguishes
     TCP/connect from TLS negotiation before any protocol data;
  2. `ImapFlow.connect()` → authentication (classified via `authenticationFailed`
     / timeout / cert / net codes);
  3. `getMailboxLock('INBOX')` → `inbox_open`;
  4. bounded header fetch → `header_fetch`.
  Failures return `"IMAP verification failed at <stage> (<code>)."` with a short
  safe code only. **An empty mailbox returns success** (no fetch range).
  No passwords, ciphertext, stack traces, or raw provider responses are logged or
  returned.
- **`shared/api/errors.ts`:** safe mappings for `imap_not_configured` /
  `smtp_not_configured` (400).

## Tests / verification

- New `apps/api/test/imap-diagnostics.spec.ts` (auth/tcp/tls/timeout/generic
  classification, code redaction, empty-mailbox range).
- API 19 files / 109 tests, contracts 9 / 57, web 27 / 146 — all pass.
- `typecheck`, `lint` clean; production build exit 0; `verify.sh` 60/0.
- Live: SMTP and IMAP verification both succeed (bounded; no send, no content
  stored; ≤3 headers).

## Constraints honoured

- No change to configured host/port/TLS settings; no mail sent; nothing committed
  or pushed.
