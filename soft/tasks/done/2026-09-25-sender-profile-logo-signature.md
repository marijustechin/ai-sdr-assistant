# Task: WhatsApp metadata + optional logo branding for outreach signatures

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

Extend the sender profile with WhatsApp metadata (already delivered in the parent
slice) and optional **logo branding** for generated outreach signatures, and emit
a clean text + HTML signature from structured fields. No SMTP send; no Sent-folder
persistence.

## Completion record

### Data model / migration

- `sender_profiles.logo_url` VARCHAR(2048) NULL, `sender_profiles.include_logo_in_signature`
  BOOLEAN NOT NULL DEFAULT false.
- `outreach_drafts.html_body` TEXT NULL (generated HTML body: text body + HTML signature).
- Migration `20260925170000_sender_profile_logo_and_draft_html` (additive; rollback in file).

### WhatsApp (confirmed from the parent slice)

- `whatsappEnabled` default false + optional `whatsappPhone`; dedicated number
  falls back to the main phone; both preserved when they differ; enabling without
  either number is rejected (`400 whatsapp_phone_required`, validated against the
  merged state on update); closing annotates `· WhatsApp`; display metadata only.

### Signature branding

- Plain-text body never contains the logo or image markup.
- HTML body/signature includes a small (120px, `alt`-labelled) logo only when
  `includeLogoInSignature` is enabled **and** `logoUrl` is set; a URL is never
  invented; enabling with no URL simply omits the image.
- Structured contact details (name, role/title, company, phone/WhatsApp, website,
  email) remain real text; a broken image cannot make the signature unusable.
- The signature now also lists the sender email; closing phrase follows the
  message language; `senderTitle` stays verbatim. No marketing banner field.
- The deprecated free-text `signature` remains an advanced override only.

### API / UI

- Contracts expose `logoUrl`/`includeLogoInSignature` (create/update/response) plus
  the existing WhatsApp fields; API service/repository map them.
- `buildDraftContent` returns `{ subject, body, htmlBody }`; the drafter persists
  `htmlBody`, snapshots/fingerprints the logo fields, and flags staleness on
  identity change.
- Web sender form: logo URL input + "Include logo in HTML signature" checkbox;
  the outreach draft card gains a "View HTML body" disclosure.

### Tests / verification

- Contracts **76**, API **206**, web **174**, database **17**.
- Covers WhatsApp fallback / separate number / validation / closing, logo off by
  default, HTML logo only when enabled, plain text never contains image markup,
  and structured contact details present with the logo enabled.
- typecheck (contracts/API/web), lint (API/web), web build, `verify-docs` (37/0),
  `verify.sh` (61/0), `git diff --check` — all green.

### Known limitations

- `html_body` is stored for review/transport; it is never rendered as trusted HTML
  in the UI (shown as escaped text). A future sender must build a multipart
  text+HTML message.
- When the dedicated WhatsApp number differs from the main phone, both lines are
  shown; if a single line is preferred, that is a small rule change.
