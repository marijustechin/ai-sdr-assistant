# Task: Controlled send-test preview for outreach drafts/batches

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-29
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Add a human-triggered **send-test preview** so an operator can visually verify how
a real outreach batch will look before starting it. Test copies go to explicitly
supplied allowlisted test recipients only; the real draft recipient is never
contacted and production batch/send state is never advanced.

## Allowed scope

- `outreach-sender` (test-delivery tracking + test-preview endpoints).
- `email-accounts` MIME/port (optional diagnostic headers).
- Contracts, web batch-review surface, additive migration, docs.

## Prohibited scope

- Any change to the production content-dumb send path.
- Live email to the real recipients; automatic sending; scheduler enablement.
- Committing/pushing; product facts; target-market/contact mutation.

## Architecture references

- `docs/system/module-map.md` §23 (`outreach-sender`), `docs/system/decisions.md`
  (controlled send-test preview), `docs/system/data-governance.md`,
  `docs/system/research-harness/outreach-drafting.md`.

## Completion record

### Safety (non-negotiable)

- Test copies are sent to **explicitly supplied allowlisted test recipients
  only** (`OUTREACH_TEST_RECIPIENT_ALLOWLIST` = `m.smiginas@gmail.com`,
  `info@alfasis.eu`, fixed for this controlled verification; enforced server-side
  → `400 test_recipient_not_allowed`). A non-allowlisted recipient never sends.
- A test never contacts the real draft recipient, never sets a draft/batch to
  `SENT`, never creates/consumes a production `outreach_outbound_messages` row,
  never changes `APPROVED/QUEUED/SENDING/SENT` state, never consumes the pacing
  schedule, never marks the real recipient contacted, and never changes an
  outreach decision. The batch remains exactly as it was (e.g. `DRAFT`).

### Content preserved

- The test copy uses the draft's actual prepared content: sender/From identity,
  Reply-To, canonical subject, plain-text body, HTML body, structured
  signature/logo, and the same raw-MIME construction. Only the transport `To` is
  overridden. Nothing is regenerated.
- Non-visible diagnostic headers: `X-AI-SDR-Test: true`,
  `X-AI-SDR-Original-Recipient: <real>`, `X-AI-SDR-Draft-Id: <id>`,
  `X-AI-SDR-Batch-Id: <id>`. An optional `subjectPrefix` is supported; it is
  **off by default**, so the real subject is preserved verbatim.

### State / data model

- New `outreach_test_deliveries` table + `OutreachTestDeliveryStatus`
  (`SENT | FAILED`); frozen from/subject/bodies, `original_recipient`,
  `test_recipient`, unique `message_id`, independent Sent-copy state, and
  `raw_message` (exact MIME for Sent-copy retry). Additive migration
  `20260929112046_outreach_test_deliveries`.
- `buildRawMime`/`OutboundMultipartSpec` accept optional extra headers (CR/LF
  stripped); production callers unchanged.

### Endpoints

- `GET  /opportunities/:id/outreach-batches/:batchId/test-preview`
- `POST /opportunities/:id/outreach-batches/:batchId/test-preview`
- `POST /opportunities/:id/outreach-batches/:batchId/test-preview/retry-sent-copy`

### Sent folder

- Uses the same SMTP + IMAP path as production; the exact submitted MIME is
  appended to the sender mailbox Sent folder. A test Sent-copy failure is
  recorded and never triggers another SMTP submission.

### UI

- A compact "Send test preview (controlled verification)" panel on the batch
  review surface: intended recipients shown, allowlist recipients, choose one
  representative draft or all generated drafts, optional subject prefix, an
  explicit acknowledgement checkbox, and recent test deliveries with Sent-copy
  state. The batch/send state is unchanged by design.

### Tests / verification

- API (`outreach-send-api.spec.ts`, fake SMTP/IMAP + real DB): preview is
  read-only; ALL sends 2 test copies to the allowlisted recipient only (never the
  real recipient), diagnostic headers + unchanged subject, same bytes appended to
  Sent, zero production outbound rows, batch stays `DRAFT`, drafts unchanged;
  optional prefix applied; non-allowlisted recipient rejected with no send;
  Sent-copy failure keeps the test `SENT` and copy retry never re-SMTPs.
- Contracts: allowlist pinned; ALL/SELECTED scope rules; recipient/prefix rules.
- Web: form parsing (acknowledgement required, recipient parsing, ALL/SELECTED).
- Full suite + typecheck/lint/build/`verify-docs`/`verify.sh`/`git diff --check`
  reported in the completion report.

## Verification commands

- `pnpm -r typecheck && pnpm -r lint && pnpm -r build && pnpm -r test`
- `node scripts/verify-docs.mjs`
- `bash soft/scripts/verify.sh`
- `git diff --check`

## Rollback / blocked conditions

- Rollback: `prisma migrate` restores nothing destructive (additive only); the
  test-preview endpoints and panel can be removed without touching production
  send state. No production data was created.
- Blocked: no live send was performed; the first controlled live verification
  requires a separate explicit human authorization.
