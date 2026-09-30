# Task: Real outreach batch sending (paced, Sent-tracked, content-dumb)

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Send approved outreach batches with safe DB-backed pacing and exact Sent-folder
persistence. The send layer is content-dumb (only the frozen approved snapshot);
SMTP and Sent persistence are independent; nothing sends without an explicit
human start.

## Completion record

### State / data model

- New module `outreach-sender` (owner `outreach_outbound_messages`).
- `OutreachBatchStatus` gains `FAILED`; new `OutreachOutboundStatus`
  (`QUEUED | SENDING | SENT | FAILED | CANCELLED`) and `OutreachSentCopyStatus`
  (`PENDING | APPENDED | FAILED`).
- `outreach_batches` gains `paused`, `pacing_seconds`, `started_at`.
- `outreach_outbound_messages`: frozen snapshot (recipient/from/subject/text/html/
  language), queue/pacing (`queued_at`, `next_eligible_at`, `attempt_count`,
  `locked_until`), SMTP state (`smtp_submitted_at`, `message_id` unique,
  `provider_message_id`, `failure_code`), independent Sent state
  (`sent_copy_status`, attempts, error, `sent_copy_appended_at`). `draft_id`
  unique → one SMTP per immutable version.
- Migrations `20260925200000_outreach_send`,
  `20260925210000_outreach_outbound_from_name` (additive).

### Worker / scheduler design

- DB queue is the source of truth. `processDue(limit)` claims due QUEUED rows via
  CAS lease, processes **at most one per mailbox per tick**, sends, then pushes
  the mailbox's remaining queue out by the pacing interval.
- In-process trigger `OutreachSendScheduler` is env-gated
  (`OUTREACH_SEND_SCHEDULER_ENABLED`, default **off**); manual
  `POST .../run-due` for controlled testing.

### Idempotency strategy

- `draft_id` unique (one outbound per approved version) and `message_id` unique.
- Approval is per immutable version; only `approval_status = APPROVED` prepared
  drafts are queued. A CAS lease + status transitions prevent duplicate SMTP
  across retries, restarts and concurrent workers.
- A restart resumes from the persisted `next_eligible_at` queue.

### Sent-folder discovery/append

- `email-accounts` gained `OutboundMailPort.sendMultipart` (builds raw MIME once,
  returns the exact serialized bytes) and `InboundMailPort.appendToSent`.
- The Sent mailbox is discovered via IMAP special-use `\Sent`
  (`selectSentMailbox`), then bounded common names — never a fixed assumption.
- The same serialized MIME is SMTP-submitted and IMAP-appended.
- Sent copy failure is tracked separately; the row remains `SENT`.

### UI

- The batch review section now shows send state (approved, pending, queued, sent,
  failed, Sent-copy failures, pacing interval, next scheduled send) and explicit
  **Start sending** / **Pause** / **Resume** / **Run due now** / **Retry Sent
  copies (no resend)** actions, with a note that approval ≠ start and the
  scheduler is off by default.

### Tests / verification

- New API tests: `outreach-send-mime.spec.ts` (raw MIME multipart/plain,
  determinism, non-ASCII headers, `\Sent` discovery) and
  `outreach-send-api.spec.ts` (real DB, fake SMTP/IMAP): only approved batches
  start; only approved versions queue; first due sends while the next is delayed
  by the interval; Message-ID persisted; same raw appended to Sent; restart/
  repeat ticks cannot duplicate; Sent-append failure keeps `SENT` and copy-retry
  never calls SMTP; pause/resume; batch completion; post-approval edit → DRAFT and
  not queued.
- Contracts **82**, API **234**, database **17**, web **176** (final full-suite
  numbers on the committed tree may vary slightly).
- typecheck/lint/build, `verify-docs`, `verify.sh`, `git diff --check` — to be
  reported in the completion report.

### Live verification procedure (explicit authorization required)

1. Create a disabled-scope batch for a **temporary/controlled** recipient, approve
   it, then `POST .../start-sending`.
2. `POST .../run-due` **exactly once** (limit 1) with an authorized sender mailbox.
3. Confirm: send-state `sent=1`; the outbound row has `smtp_submitted_at` and
   `provider_message_id`; `sent_copy_status = APPENDED`; the message appears in
   the mailbox's `\Sent` folder with the same Message-ID.
4. Do not run another message until authorization; the scheduler stays off.

### Known limitations

- The worker is a bounded manual/interval tick; no BullMQ worker app.
- Pacing is per sender mailbox (calendar seconds), an operational safeguard, not
  a spam-filtering guarantee.
- The batch "pending" count is approved-drafts-without-an-outbound; batch scope
  remains one opportunity (many batches allowed).
