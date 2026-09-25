# Task: WhatsApp contact metadata on the sender profile

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Add WhatsApp contact metadata to sender profiles: `whatsappEnabled` (default
false) + optional `whatsappPhone`, with main-phone fallback, validation, UI, and
a closing that may annotate the phone line. **Not** a permission to send via
WhatsApp; no SMTP send and no Sent-folder append.

## Completion record

### Data model

- `sender_profiles.whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false;
  `sender_profiles.whatsapp_phone` VARCHAR(64) NULL.
- Migration `20260925160000_sender_profile_whatsapp` (additive; rollback in file).

### Rules

- Resolution: dedicated `whatsappPhone` → else main `phone` → else none (never
  invented).
- Validation (`isWhatsAppConfiguredValid` in contracts): enabling WhatsApp with
  neither number is rejected (`400 whatsapp_phone_required`). On partial update
  the check runs against the **merged** state (existing row + patch).
- Closing: when enabled, the phone line is annotated `(WhatsApp)` — main phone
  becomes `{phone} (WhatsApp)`, or a distinct dedicated number is added as
  `{whatsappPhone} (WhatsApp)` next to the main phone. Disabled → no marker.

### API / UI

- Contracts `CreateSenderProfileSchema` / `UpdateSenderProfileSchema` /
  `SenderProfileResponseSchema` expose the fields; `resolveWhatsAppPhone` and
  `isWhatsAppConfiguredValid` are exported and unit-tested.
- API service validates create/update and maps the fields through
  domain/repository; outreach-drafter snapshot/fingerprint/staleness include the
  WhatsApp fields; `buildDraftContent` composes the marker.
- Web sender form: a compact "Available on WhatsApp" checkbox under Phone; the
  separate WhatsApp-number input is shown only when the checkbox is on; error
  mapping for `whatsapp_phone_required`.

### Tests

- Contracts **75** (WhatsApp accept/reject, fallback, validation helper).
- API **201** (`sender-profiles-api` validation/fallback; `outreach-content`
  closing composition: fallback, separate number, disabled).
- Web **172** (payload WhatsApp flag/number/clearing).
- Database **17**. Typecheck/lint/build, `verify-docs`, `verify.sh`,
  `git diff --check` green.

### Known limitations

- `whatsappEnabled` is display metadata only; no WhatsApp transport is added.
- The closing shows a dedicated WhatsApp number **and** the main phone when they
  differ; if that is undesirable, the rule can be changed to WhatsApp-only.
