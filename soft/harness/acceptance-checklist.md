# Acceptance Checklist

The agent must confirm **every applicable item** before archiving a task.

## Scope and invariants

- [ ] Scope stayed within `tasks/current.md` (no broadening).
- [ ] No module wrote another module's tables.
- [ ] No raw DB writes outside typed repositories/services.
- [ ] `packages/database` is the only schema/migration owner (if schema touched).
- [ ] No `../legacy/**` modified.

## Safety

- [ ] No unverified product fact asserted.
- [ ] No automatic target-market mutation, outreach send, or commercial
      commitment.
- [ ] Restricted fact values never exposed (in code, logs, or tests).
- [ ] No secrets, personal data, or production credentials in code/fixtures/logs.
- [ ] No chain-of-thought / model reasoning stored.

## Correctness

- [ ] Migration check performed (or "not needed" recorded).
- [ ] Mandatory tests for the task type ran (see `docs/testing.md` §2).
- [ ] `scripts/verify.sh` ran and passed (or failures are recorded + justified).
- [ ] Commands and outcomes recorded in the completion record.

## Record

- [ ] Archived task contains the original task + full completion record.
- [ ] `tasks/current.md` reset to the empty template (only after successful
      archival).
- [ ] No next task auto-started.
