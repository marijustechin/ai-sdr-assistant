# O-022 — Email accounts + sender-profile refactor (pre-send)

**Status:** COMPLETE — READY_FOR_HUMAN_REVIEW
**Type:** delegation
**Scope:** repository root (manager records) + delegated implementation in `soft/`

## Objective

Separate technical mailbox transport from sender identity: introduce
`email_accounts` (SMTP + IMAP, encrypted secrets), make `sender_profiles`
identity-only with an optional `email_account_id`, keep product assignment at the
SenderProfile level, and reference the account on outreach drafts. Architecture
refactor only — no sending, no mailbox polling, no reply matching, no worker, no
scheduling.

## Inputs / references

- `AGENTS.md`; `docs/system/{module-map.md,data-governance.md,decisions.md,architecture.md}`
- `docs/system/research-harness/{AGENTS.md,outreach-drafting.md}`
- Human approval (2026-09-22) of the O-022 proposal.

## Steps

- [x] Record the decision in `docs/system/{decisions.md,module-map.md,data-governance.md,architecture.md}`.
- [x] Delegate one bounded implementation task to `soft/tasks/current.md`.
- [x] Implement the refactor + additive migration + Settings UI + tests + docs sync.
- [ ] Human review / acceptance.

## Deliverables

- `soft/packages/database`: `EmailAccount` + enums; migration `20260922120000_add_email_accounts`.
- `soft/packages/contracts`: `email-accounts.ts`; sender-profile contracts slimmed.
- `soft/apps/api`: `email-accounts` module; shared `security/secret-box.ts` (`EMAIL_SECRETS_KEY`); sender-profiles + outreach-drafter refactor.
- `soft/apps/web`: Settings → Email accounts; sender-profile mailbox selector; SMTP opt-in/autofill safeguards moved; errors message.
- Docs: `soft/docs/{data-model,data-ownership,security}.md`, `soft/.env.example`; root canonical docs + `project-state.md`.
- Task record: `soft/tasks/done/2026-09-22-email-accounts-sender-profile-refactor.md`.

## Acceptance criteria

- [x] `email_accounts` owns SMTP **and** IMAP config, `credentialsShared`, `authKind`/`provider`, `status`; encrypted secrets via `EMAIL_SECRETS_KEY`; reads expose only configured booleans.
- [x] `sender_profiles` identity-only + optional `email_account_id` (many → one); no transport columns.
- [x] Product assignment unchanged (`products.sender_profile_id`); no credentials on products.
- [x] `outreach_drafts.email_account_id` added; credential/account-only changes do not re-version.
- [x] Settings → Email accounts CRUD; sender-profile form gains a selector and loses SMTP; explicit opt-in + autofill safeguards preserved on the account form.
- [x] Additive migration only (no reset); tests/docs/ownership updated.

## Out of scope

- Sending, transport execution, IMAP connections/polling, reply matching,
  workers/schedulers, message/thread tables.

## Verification

- Contracts 53, API 89, Web 121 tests pass; typecheck + lint clean; `verify.sh` 60/0; production build exit 0.
- Live read-only smoke: new routes `[]`, settings pages 200, 3 leads + 3 drafts preserved.

## Rollback/blocked conditions

- Drop `email_accounts`/enums, re-add `sender_profiles.smtp_*` (rollback note in the migration). No blockers.

## Completion record

Completed 2026-09-22. Implementation delegated and returned; all mandatory checks
green; no commit/push (awaiting human review). Full detail in the programmer
archive `soft/tasks/done/2026-09-22-email-accounts-sender-profile-refactor.md`.
