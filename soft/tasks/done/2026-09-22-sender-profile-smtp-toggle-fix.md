# Task: Sender-profile SMTP toggle + 503 error mapping (fix)

**Status:** DONE

**Archived:** 2026-09-22

**Parent:** O-021 (sender profiles extension)

## Problem

Creating an identity-only sender profile in the UI failed with the generic "The
sender profile could not be saved." The API returned **503
`secrets_key_not_configured`**, which only happens when a **password** is
submitted and no `SENDER_SECRETS_KEY` is configured. The web form paired the From
email with a `type="password"` field, so a browser/password-manager autofill
populated the SMTP password, and `describeApiError` did not map `http_503`, so the
cause was hidden. Identity-only creation via the API was already correct (201;
no key required).

## Fix

- **Explicit "Configure SMTP" toggle** in the sender-profile form, **default OFF
  for new profiles**. When OFF, the SMTP fields are not rendered and, via a pure
  `buildSenderProfilePayload(state, mode)`, **all SMTP fields (including an
  autofilled password) are omitted from the payload**.
- **Edit semantics preserved:** the toggle starts ON when the profile has any
  SMTP configuration; password is write-only (empty = keep, non-empty = replace,
  explicit clear via the checkbox).
- **Autofill mitigations:** the password input uses a non-credential `name`
  (`sender-profile-smtp-password`) plus `autoComplete="new-password"`,
  `data-lpignore="true"`, `data-1p-ignore`, `data-bwignore="true"`.
- **Error mapping:** `describeApiError` now handles `http_503`; a
  `secrets_key_not_configured` 503 returns an actionable message explaining that
  saving an SMTP password needs `SENDER_SECRETS_KEY` while identity-only profiles
  can still be saved without SMTP. The raw server code is never echoed.

## Files changed

- `apps/web/lib/sender-profiles/payload.ts` (new) — pure payload builder + `hasSmtpConfiguration`.
- `apps/web/lib/sender-profiles/payload.test.ts` (new).
- `apps/web/components/sender-profiles/sender-profile-form.tsx` — toggle, conditional SMTP fields, autofill mitigations, uses the payload builder.
- `apps/web/lib/api/errors.ts` — `http_503` mapping.
- `apps/web/lib/api/errors.test.ts` (new).
- `apps/api/test/sender-profiles-api.spec.ts` — product assignment/clear round-trip + unknown-profile rejection.

## Verification

- Web **112 passed** (22 files); API **82 passed** (14 files); contracts pass;
  `-r typecheck`/`lint` clean; `scripts/verify.sh` 60/0; production build exit 0.
- New tests: identity-only create with SMTP OFF; autofill-like password omitted
  while OFF; SMTP ON includes fields; edit preserve/replace/clear; `clearSmtpPassword`
  omitted on create; 503 secrets message + generic 503; product assignment no
  regression.
- UI: `/settings/sender-profiles/new` renders the "Configure SMTP" toggle and,
  with it OFF, **no** SMTP fields in the DOM.

## UX edge cases found

- Partial SMTP input (e.g. Host without Port/TLS) is rejected by the contract
  and surfaces as "Please correct the highlighted fields."; enabling SMTP
  requires host+port+TLS together.
- Clearing only the SMTP transport (keeping identity) is not offered; the toggle
  OFF omits SMTP entirely, and existing SMTP on an untouched edit is preserved.

## Limitations

- No sending/transport. `SENDER_SECRETS_KEY` still unset in environments; SMTP
  password save remains 503 until configured (now with a clear message).

## Notes

- No commit/push (per task). Synthetic diagnostic records were removed.
