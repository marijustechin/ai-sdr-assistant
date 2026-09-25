# Decisions (Canonical)

**Status:** Canonical, live decision log. Newest first.
**Supersedes:** `docs/redesign/*` as decision authority; consolidates and
supersedes `soft/docs/decisions.md` (which remains the implementation-local
companion).
**Companion:** `architecture.md`, `data-governance.md`,
`research-context-contract.md`, `project-state.md`; root `AGENTS.md`.

Every consequential design decision is recorded here with a date, the decision,
and the reason. The agent must not silently override a recorded decision.

---

## 2026-09-25 — Supplier price inquiry decommissioned from Market Research

The Lithuania benchmark showed that supplier replies reliably turn into **sales
conversations** rather than useful research clarification. Supplier price inquiry
is therefore decommissioned as a Market Research capability: the platform no
longer depends on it and no longer initiates it automatically. This is a
deliberate product simplification, not a rollback.

- **Public absence of a price is itself market evidence.** A researched offering
  with no public price stays a recorded finding (`priceText` absent;
  `offeringUncertainty` → "Price not recorded") — it is **not** a trigger to
  email the supplier. Absence is captured as evidence, never converted into
  outreach.
- **Removed from Market Research.** Unregistered from the API: the `price-inquiry`
  and `quote-collection` controllers (RFQ draft / send / check-replies /
  follow-ups) and the whole `research-result` module (`/result`, `/finalize`).
  Removed concepts: `ResearchClarificationState`, pending/replies/quotes/
  no-response counts, `ResearchResult*`/`FinalizeResearchResultSchema` contracts,
  the run-page result summary, the lead-page RFQ panel, the product "Inquiry
  sender profile" selector, and the web price-inquiry/quote-collection entities
  and features.
- **Retained and dormant (generic infrastructure, reusable for sales outreach).**
  `email-accounts` stays registered (SMTP/IMAP config + encrypted secrets). The
  `price-inquiry` / `quote-collection` **source and tables** are retained but
  unregistered: outbound Message-ID tracking, account-wide reply scanning,
  inbound matching/parsing, supplier-quote extraction, and the DB-backed
  follow-up worker (env-gated, default off) remain building blocks.
- **Historical records preserved.** No table is dropped and no row deleted in
  this task. `ResearchRunStatus.COMPLETED_WITH_PENDING_CLARIFICATIONS` and
  `PriceInquiryStatus.NO_RESPONSE` are retained only so historical runs (the
  Lithuania benchmark) still parse and render; nothing produces them for new work.
- **Buyer outreach unaffected.** Leads, contacts, sender profiles, email accounts
  and outreach drafts are unchanged.

Reason: the capability's output was sales conversations, not research
clarification, so it does not belong in Market Research. Keeping the generic
mailbox/reply infrastructure decoupled from a Market Research trigger preserves
the option to reuse it for approval-gated buyer outreach without carrying the
supplier-inquiry product surface.

**Migration recommendation (not executed here).** After human approval and a
data export/archive, a future additive migration may drop the now-unused
`research_results`, `price_inquiry_drafts`, `quote_outbound_messages`,
`quote_inbound_messages`, `supplier_quotes`, and `quote_follow_ups` tables (or
re-home the generic outbound/inbound/follow-up tables under a future
sales-outreach owner). Do not drop them until the history is exported.

---

## 2026-09-25 — One source of truth per status statement; enforceable finalization

Documentation drift had accumulated: `ops/current.md` still described a
committed task as active, `ops/backlog.md` listed a committed task as Active,
`project-state.md`'s `Last updated` predated its own newest entries, and
`architecture.md` still marked implemented modules as "not implemented" and
`soft/README.md` still called the web app deferred.

- **One owner per status statement.** Implemented/planned capability state is
  owned by `docs/system/project-state.md`; module ownership/boundaries by
  `docs/system/module-map.md`; architecture shape by
  `docs/system/architecture.md`; decisions here; the active manager task by
  `ops/current.md`; the manager index by `ops/backlog.md`; history by
  `ops/done/`; implementation lifecycle by `soft/tasks/**`; READMEs are
  orientation only. Everything else points to these rather than restating them.
  Recorded in `docs/system/source-of-truth.md`.
- **Machine-readable markers** replace prose-only status: `**Task ID:**` +
  `**Status:**` in `ops/current.md` and archives, `## Active` / `## Completed`
  sections in `ops/backlog.md`, `Last updated YYYY-MM-DD` in `project-state.md`,
  and the status vocabulary `implemented | implemented-subset | planned` in the
  `architecture.md` module table.
- **Finalization invariant.** A manager task is not finalized until its record
  is complete, the relevant `docs/system/**` docs are updated, `ops/current.md`
  no longer describes it as active, `ops/backlog.md` moves it to `## Completed`,
  a completion record exists, and the recorded commit/push state matches git. A
  commit message alone does not close the lifecycle.
- **Deterministic enforcement.** `scripts/verify-docs.mjs` (no AI, no arbitrary
  prose parsing) checks these invariants and is wired into
  `soft/scripts/verify.sh`.
- **Off-cycle records.** O-024 and O-025 were executed/committed without a
  contemporaneous manager archive; their `ops/done/` records are explicitly
  labelled as reconstructed during this reconciliation rather than presented as
  contemporaneous. Historical `soft/tasks/done/` records are unchanged.
- **Architecture truth.** `architecture.md` now marks the actual present runtime:
  the API/web persist and control; the OpenCode agent executes the research
  harness; quote follow-up scheduling exists; there is **no** generic
  worker/job platform or autonomous research execution.

Reason: status duplicated across many documents drifts silently. A single owner
per status, plus a small deterministic check, keeps `ops/`, the canonical docs,
and the READMEs from contradicting committed reality without adding a
task-management framework.

---

## 2026-09-25 — Reply collection is account-wide; a reply is not a usable quote

Corrections after the controlled live verification exposed two production
defects in the quote-collection loop:

- **Account-wide reply scan (no cross-draft swallowing).** A mailbox scan now
  considers **all** sent RFQs for the email account before classifying a
  candidate: it loads every outbound RFQ Message-ID for the account, matches
  each inbound candidate against the complete set (header `In-Reply-To` /
  `References` authoritative; bounded fallback only when unique), and routes the
  reply to the **owning** draft. Only then are truly unrelated messages
  persisted as UNMATCHED **metadata-only** (body never stored). The manual
  per-draft "Check for replies" runs this account-wide scan. When several due
  follow-ups share one mailbox, the worker scans that account **once per batch**.
- **Repair of already-swallowed rows.** An existing UNMATCHED row whose headers
  now reference a known outbound Message-ID is **repaired in place** (body
  re-fetched by its mailbox UID within the bounded scan, linked, evidence + quote
  persisted) rather than skipped. Unrelated mailbox records are never touched.
- **Reply ≠ usable quote.** `SENT → REPLY_RECEIVED` on any matched reply;
  `→ QUOTE_EXTRACTED` **only** when extraction yields a genuinely usable price
  (`priceAmount` **and** `currency` present). A reply with no usable price stays
  `REPLY_RECEIVED`, retains its evidence + extraction warnings, stops the
  waiting-for-reply follow-up, and is shown as "Reply received — no price
  provided". A reconcile step (idempotent; never touches `SENT`) corrects any
  earlier misclassification to match this rule.
- **Quoted-original stripping.** Extraction operates only on the supplier-authored
  portion; the quoted original/thread tail (`>` blocks, signature separators, or
  a `From:`/`Sent:`/`On … wrote:` reply-header block) is dropped first, so our own
  quoted inquiry text cannot produce false price/unit/MOQ fields. Not a full
  thread parser.
- **Result counts.** `repliesReceived` is tracked separately from
  `quotesReceived` (usable price) and `pendingClarifications` (unanswered);
  `NO_RESPONSE` remains non-pending.

Reason: a shared inquiry mailbox and the semantic difference between "the
supplier answered" and "the supplier gave a usable price" must not be conflated;
both defects were observed on real supplier replies.

---

## 2026-09-25 — Research result finalizes independently; DB-backed quote follow-ups

- **Research completion is independent from supplier-reply arrival.** A run may
  be finalized/published as `COMPLETED` (no outstanding clarifications) or
  `COMPLETED_WITH_PENDING_CLARIFICATIONS` (RFQs still awaiting replies). The run
  is **never** kept `RUNNING` solely for outstanding supplier replies; that is
  tracked per inquiry. `market-researcher` owns the frozen `research_results`
  snapshot (completion timestamp + immutable summary); later replies **enrich**
  the live result (bumping `lastEnrichedAt`) without rewriting the snapshot or
  historical evidence.
- **Price-clarification states reuse the existing inquiry lifecycle.**
  `PriceInquiryStatus` gains `NO_RESPONSE`: `SENT` = clarification pending,
  `REPLY_RECEIVED`/`QUOTE_EXTRACTED` = reply/quote, `NO_RESPONSE` = waiting
  window elapsed with no reply (no longer pending; outbound/inquiry records
  preserved). No parallel state model.
- **DB-backed follow-up scheduling.** `quote-collection` owns
  `quote_follow_ups` (scheduler source of truth, survives restarts): draft /
  outbound / account references, status, `nextCheckAt`, attempt count,
  `lastCheckedAt`, a worker lease, `completedAt`, and a short result code. Sending
  an RFQ creates the schedule; a bounded worker claims due rows via a
  compare-and-swap lease and reuses the existing IMAP correlation/extraction. An
  in-process trigger (env-gated, `FOLLOW_UP_SCHEDULER_ENABLED`, default off) is
  only a trigger — never the source of truth — and the manual "Check for
  replies" action remains.
- **Policy is configurable, calendar-based.** Default cadence: checks at 24h/48h/
  72h and a 120h (5 calendar day) expiry; env-overridable
  (`FOLLOW_UP_CHECK_DELAYS_HOURS`, `FOLLOW_UP_EXPIRY_HOURS`,
  `FOLLOW_UP_LEASE_MINUTES`). There is no business-day/holiday calendar in this
  slice — documented explicitly.
- **Safety.** No automatic sending of new inquiries and no follow-up emails;
  background work only *checks for replies* to already human-approved/sent
  inquiries, never deletes/moves/marks-read mailbox messages, and keeps secrets
  inside the transport boundary. A no-response is a valid final research outcome.

Reason: a research result must be presentable now even when supplier replies are
outstanding; separating completion from clarification keeps the run honest and
makes late replies an enrichment rather than a reason to stay RUNNING.

---

## 2026-09-24 — First-contact price inquiry is short and human, not a procurement RFQ

- The generated **first** message is: a greeting; one sentence stating where the
  product was found ("I found {product} on your website") and asking for the
  current price; up to two short clarifications (pricing unit and/or MOQ) only
  when not already on record; a simple "look forward to your reply" line; and a
  closing built from structured sender identity. No numbered checklist, no full
  specification dump, and no Incoterm/lead-time/VAT/validity/loading questions in
  the first email (those are follow-ups).
- Clarifications are decided from `CONFIRMED + OPERATIONAL` facts only: ask the
  pricing unit only when no price unit is on record, and ask MOQ only when no MOQ
  is on record — never redundant, never invented.
- The message cannot assert volume, urgency, destination, purchasing authority, or
  a company identity that is not configured; `companyName` stays optional.
- Content is locale-templated (`LocaleTemplate`) so `lt`/`de`/`fi` can be added
  without restructuring; English is the only implemented locale, and English text
  is never labelled as another locale (an unimplemented request resolves to `en`).
- The grounded `specificationSummary` is still persisted on the draft for audit,
  and downstream quote extraction is unchanged: a shorter inquiry does not weaken
  parsing, and suppliers may still volunteer any terms.

Reason: a shorter, natural message maximizes reply probability for first contact;
the procurement-checklist style suited later clarification, not the opening email.

---

## 2026-09-24 — Supplier quote collection is a Market Research operation (owning module `quote-collection`)

- **Ownership.** A new module `quote-collection` owns the RFQ loop's three
  tables — `quote_outbound_messages` (immutable send snapshot), `quote_inbound_messages`
  (bounded supplier replies), and `supplier_quotes` (extracted commercial terms).
  `price-inquiry` remains the sole writer of `price_inquiry_drafts`; reply/quote
  processing advances draft status only through `PriceInquiryService`
  (`markSent`/`markReplyReceived`/`markQuoteExtracted`). This keeps supplier
  price clarification explicitly **market research**, never buyer outreach.
- **Approval-gated send.** A draft may be sent only from
  `READY_FOR_HUMAN_REVIEW`, by an explicit `confirm: true` human action, from the
  draft's resolved **inquiry** sender (never the product's outreach sender). It
  requires a present recipient, an ACTIVE sender profile linked to an ACTIVE
  email account, non-empty subject/body, and non-stale inputs. Send is never
  autonomous or bulk.
- **Immutable outbound.** Each attempt persists a snapshot (from/recipient/
  subject/body as sent) plus the **generated Message-ID we require the server to
  use**, a submission status, and a short safe failure code on failure. Editing
  the draft later never changes the sent record. Failures leave the draft
  reviewable; a submitted outbound blocks a duplicate send.
- **Transport ports stay in `email-accounts`.** `quote-collection` depends on
  provider-neutral `OutboundMailPort` / `InboundMailPort`; the SMTP/IMAP adapters
  resolve the account and decrypt the password **only inside the transport
  boundary**. Credentials are never returned, logged, or stored in the new
  tables.
- **Bounded, idempotent reply capture.** A human-triggered "Check for replies"
  scans only the draft's inquiry mailbox over a bounded recent window, reads
  headers plus the plain-text body (no attachments; no delete/move/mark-read),
  and is idempotent per mailbox message (`uidValidity:uid`). No background
  polling is scheduled.
- **Correlation.** Standards-based first (`In-Reply-To`/`References` against our
  Message-ID). The bounded fallback (recipient relationship + normalized subject
  + a sent-time window) is used only when headers are absent and only when it is
  unique; ambiguous replies stay unlinked for human review. A message whose own
  Message-ID equals one of our outbound Message-IDs (an outgoing copy) is never
  treated as a reply, and localized reply/forward prefixes (e.g. `Ats.:`) are
  normalized for the fallback subject comparison.
- **Body extraction.** The inbound body is read by inspecting each message's
  `BODYSTRUCTURE` and fetching only the concrete `text/plain` MIME part (else the
  `text/html` part, converted to bounded plain text) by its part number, decoding
  its transfer-encoding; attachments and embedded messages are never fetched. A
  plain `BODY[TEXT]` request did **not** return content on the live hosted
  provider, so it is not used. Empty/unusable messages yield an empty body — text
  is never fabricated.
- **Unmatched-message privacy.** A reply that cannot be confidently linked is
  stored with bounded metadata only (mailbox uid, provider Message-ID,
  In-Reply-To/References, from/to/subject, received time, processing state) for
  human review; its body and evidence are **not** persisted. Only a confidently
  matched reply's body becomes evidence/quotes.
- **Extraction and normalization boundary.** Structured fields (price text/
  amount/currency/unit, MOQ, Incoterm, loading, lead time, validity, VAT,
  qualification) are extracted only where stated, each with a supporting excerpt
  and warnings; unknown/ambiguous values stay null. The original terms are stored
  faithfully; no unit normalization/comparable price is derived here (a later
  Price Intelligence task).
- **Research linkage.** The raw reply is persisted as run evidence
  (`SourceReference` type `EMAIL_REPLY` + `Evidence`) and the inbound/quote rows
  carry the lead's `researchRunId`; a derived `marketResearchState`
  (PREPARED / AWAITING_REPLY / REPLY_RECEIVED / QUOTE_EXTRACTED / NO_RESPONSE) is
  a view over the existing objects, not a second workflow model.

Reason: supplier quotes are a market-research observation, not sales outreach.
Keeping the loop in its own module with owner-mediated status transitions,
human-only triggers, and evidence-grounded extraction prevents a sales identity
or an unreviewed message from entering the price-intelligence record, and keeps
secrets inside the single transport owner.

---

## 2026-09-24 — Outreach and inquiry senders are separate product contexts

- `products` carries **two independent, optional** sender assignments:
  `outreach_sender_profile_id` (buyer/sales outreach) and
  `inquiry_sender_profile_id` (market-research price inquiries / RFQ). The prior
  single `products.sender_profile_id` is **renamed** to
  `outreach_sender_profile_id` (existing assignments preserved); the inquiry
  field is new, nullable, and empty until explicitly set. Both are validated
  through `sender-profiles` (unknown → `400 sender_profile_not_found`; no silent
  default, no first-profile fallback).
- **No cross-context fallback.** `outreach-drafter` reads only the **outreach**
  field; `price-inquiry` resolves an explicit `senderProfileId` first, then the
  product's **inquiry** field, and otherwise fails
  `409 inquiry_sender_profile_required`. An inquiry is never created under the
  outreach identity, and outreach never uses the inquiry identity.
- **Inquiry eligibility.** An inquiry sender must be `ACTIVE` **and** linked to a
  mailbox (`email_accounts`) before it can create an RFQ; an unlinked profile is
  rejected (`409 sender_profile_not_linked`).
- **UI.** Product create/edit exposes two clearly separate selects — *Outreach
  sender profile* and *Inquiry sender profile* — each optional and both
  referencing usable active profiles, with helper text stating each purpose.

Reason: buyer outreach and market-research supplier inquiries serve different
audiences and identities. A single implicit product sender let a sales identity
be used for a supplier RFQ (and vice versa). Explicit, separate contexts make the
intent human-visible and machine-enforced.

---

## 2026-09-22 — Sender profiles: optional company/brand, structured closing, locale

Two domain corrections to the price-inquiry (RFQ) work:

- **Company/brand is optional.** `sender_profiles.companyName` is nullable, and an
  optional **`senderTitle`** (role/title) was added. A sender profile is fully
  usable with only a sender name, a From email, and (for RFQ) a linked mailbox.
  When no company is configured, **no generated content may invent or imply one**.
- **The RFQ closing is generated from structured identity, never from a stored
  signature.** Generation no longer reads `signature`; the closing is
  `Best regards,` + sender name + optional role/title + optional company, each
  line at most once and only when configured. A stored signature remains an
  optional free-text field on the profile for special cases but is not appended
  blindly to generated RFQs. English is the only implemented locale today; a
  requested locale that is not implemented resolves to English so the greeting,
  request text and closing always share one language. The RFQ draft already
  persists `language`; future locales (`de`, `fi`, `lt`, …) register in one place.
- **Not stored as identity:** closing phrases (`Best regards,`, …) are template
  text, not sender-profile data.
- Additive migration `20260922220000_sender_profile_optional_company_title`
  (`company_name` drops NOT NULL; adds `sender_title`). No data removed.

Reason: keep the sender model minimal and honest, and make multilingual RFQs a
matter of adding a locale template rather than changing the model.

---

## 2026-09-22 — Price inquiry (RFQ) drafts use a dedicated model, reusing concepts

The first **price intelligence** workflow is a persisted, reviewable **RFQ
draft**. Existing **companies, leads, contacts, products, sender profiles and
email accounts are reused by reference** — no duplicate company/contact concepts.
A **dedicated `price_inquiry_drafts` table** (owner `price-inquiry`) is used
rather than extending `outreach_drafts`.

- **Why not extend `outreach_drafts`?** That model is *buyer* outreach: an
  evidence-backed initial pitch to a lead, append-only/versioned, with
  `PREPARED | BLOCKED` preparation semantics and no product grounding. An RFQ asks
  a *supplier* to quote against a persisted **product/specification** and needs an
  explicit human-review status and **editable** review fields. Mixing directions
  under a `purpose` flag would muddy both. The new table has its own
  `PriceInquiryPurpose`/`PriceInquiryStatus` (`READY_FOR_HUMAN_REVIEW`), a
  `productId`, an immutable generated subject/body, an editable copy, and the
  grounded `specificationSummary`.
- **Reused, not forked:** recipient selection moved into its owner,
  `ContactDiscoveryService.selectRecipient` (usable published contacts; prefer a
  named role relevant to purchasing, else the general business email), and is used
  by both `outreach-drafter` and `price-inquiry`. Eligibility mirrors the
  established outreach gate (not rejected, not stale, agent-qualified or
  human-shortlisted). Sender identity must be an **ACTIVE** profile **linked to an
  email account**; the product's assigned profile is the default.
- **Grounded content, no invention:** the specification comes only from the
  persisted product row and its `CONFIRMED + OPERATIONAL` facts (the same facts the
  Research Context may assert); `PENDING`/`RESTRICTED` values never appear. (The
  original body asked for the full field set — price, unit, MOQ, Incoterm, loading
  location, lead time, VAT, validity; this was later simplified to a short
  first-contact message — see the 2026-09-24 "First-contact price inquiry is short
  and human" decision.) It never asserts volume, frequency, destination, urgency,
  purchasing authority, or a company representation beyond the configured identity.
- **Future-proofing:** outbound message metadata, supplier replies, quotation
  evidence, and normalized price/currency/unit/MOQ/Incoterm/origin/lead
  time/validity will be added as records referencing `price_inquiry_drafts`. No
  reply parsing or price normalization is implemented now.
- **No transport:** every draft starts at `READY_FOR_HUMAN_REVIEW`; there is no
  `SENT` state and no sending action. Actual sending remains a separate,
  approval-gated task.

Reason: keep one clear concept per purpose while reusing the domain concepts and
recipient-selection logic that already exist.

---

## 2026-09-22 — Password-only mailbox auth; reserved auth kind removed

Email accounts are **password-authenticated** only (e.g. a hosting mailbox under
our own domain). The reserved `authKind` (`PASSWORD | OAUTH2`) discriminator and
enum were removed, so the model is simply: EmailAccount → SMTP + IMAP
configuration → encrypted password → sender identities. A Microsoft OAuth2
exploration was rolled back before release.

- **Provider-neutral, bounded verification** was added for password mailboxes:
  `POST /email-accounts/:id/verify-smtp` authenticates only;
  `.../verify-imap` opens INBOX and reads ≤3 message headers (no ingestion); and
  `.../test-send` sends exactly one message to a single human-supplied recipient
  and requires `confirm: true`. These are explicit operator actions, never
  automatic, and never a background transport.
- **Secrets** stay encrypted with `EMAIL_SECRETS_KEY`; transport options are
  built by pure helpers (host/port/explicit TLS + password); results and errors
  carry only short redacted codes.
- **Migration** `20260922160000_drop_email_auth_kind` drops the reserved
  `auth_kind` column and `EmailAuthKind` enum. No OAuth tables, columns, enums,
  environment variables, or Microsoft-specific code/docs remain. No automated
  sending and no mailbox polling.

---

## 2026-09-22 — Admin dashboard metrics via a read-only composition module

The Dashboard now shows real counts instead of placeholders, without a
cross-module data shortcut.

- **Composition, not a new owner.** A new `dashboard` module owns **no tables and
  no domain logic**. It exposes `GET /dashboard/summary` (guarded) and asks each
  **owning module's application service** for counts
  (`products-and-offers`, `market-researcher`, `lead-discoverer`,
  `outreach-drafter`). No module reads another module's tables; each count is
  added to the owner's own repository/service.
- **Metric definitions (precise, existing semantics only).**
  - **Active products** = `products.lifecycleStatus = ACTIVE` (never "all
    products"); the summary also returns `draft`, `archived`, `total`.
  - **Research runs** = total `research_runs`, plus `completed` (`status =
    COMPLETED`).
  - **Leads** = all `opportunity_companies` rows (each is one opportunity-scoped,
    evidence-backed candidate buyer).
  - **Outreach drafts** = all `outreach_drafts` records (append-only/versioned),
    split by preparation status (`prepared` / `blocked`).
- **Deliberately omitted** (capabilities do not exist): conversion rate, emails
  sent, replies, revenue, pipeline value. No coverage/success rate is derived
  either.
- **No new schema or migration**; the endpoint is read-only and exposes aggregates
  only (no rows, no secrets, no mailbox credentials).
- **Branding** is integrated from the three approved WebP assets without
  modification: monogram in the sidebar/header, favicon via Next
  `metadata.icons` (WebP is not a supported file-convention icon type). The
  existing brand text is kept — the wordmark asset is retained but not wired,
  because at the sidebar width the two-line text is cleaner. No dark mode exists.

Reason: the admin overview needs truthful operational counts; aggregating through
owner services keeps single-writer ownership and existing status semantics intact,
and avoids a UI-only shortcut or a new table.

---

## 2026-09-22 — Separate email transport (EmailAccount) from sender identity (SenderProfile)

Real email sending **and** mailbox monitoring (reply capture and matching) are
coming, so transport details must not live on the sender identity.

- **`email_accounts` (owner `email-accounts`)** becomes the single owner of the
  **technical mailbox connection**: label, account identity, `status`
  (`ACTIVE | DISABLED`), `authKind` (`PASSWORD | OAUTH2`) + `provider`
  (extensible), **SMTP** (host/port/explicit TLS/username/password) and **IMAP**
  (host/port/explicit TLS/username/password), a `credentialsShared` flag (IMAP
  reuses the SMTP username/password when true), and encrypted secrets. It is the
  **only** place transport secrets live.
- **`sender_profiles` becomes identity-only** (label, sender/company, From,
  Reply-To, signature, status) plus an optional **`email_account_id`**. Many
  sender profiles may share one email account; a profile has 0..1 account.
- **Product assignment stays at the SenderProfile level** (`products.
  sender_profile_id`); products never reference raw credentials.
- **`outreach_drafts` gains an `email_account_id` reference** (resolved from the
  assigned profile; no secret snapshot). Account/credential-only changes do not
  change draft content versioning.
- **Secret handling** moves to a shared helper keyed by **`EMAIL_SECRETS_KEY`**
  (AES-256-GCM; server-side only, never DB/Git); reads expose only
  `smtpPasswordConfigured` / `imapPasswordConfigured`.
- **Future OAuth** is additive: `authKind`/`provider` exist now; OAuth token
  columns/table can be added without redesigning the model.
- **Mailbox monitoring is a central concern**, not product-specific: it will live
  in `inbox-intelligence` (inbound messages + threads) driven by the `jobs`
  worker; **sending** will get its own write-owner (`outreach-sender`,
  `outbound_messages`). Neither is implemented in this decision's task.

Reason: separating identity from transport keeps send/receive credentials in one
owned place, lets one account serve several identities, and leaves room for
OAuth providers — while products continue to select an identity, never
credentials.

---

## 2026-09-22 — Sender profiles, product assignment and drafting integration (bounded `sender-profiles`)

- **Reusable sender identities** (`sender_profiles`, owner `sender-profiles`):
  label, sender name, company/brand, From email, optional Reply-To/signature, and
  optional SMTP (host, port, **explicit** TLS mode, username, password). A usable
  identity **does not require SMTP**; SMTP configuration never authorizes
  sending. Create/edit/disable; **no hard delete** (referenced by products and
  draft history).
- **Secret handling.** The SMTP password is encrypted at rest with
  **AES-256-GCM**; the 32-byte key lives **only in server configuration**
  (`SENDER_SECRETS_KEY`, base64/hex), never in the database or Git, and is **not**
  generated at startup. Reads expose only `smtpPasswordConfigured`; the secret is
  never returned, rendered or logged. On update, an omitted password is
  preserved; replacement and clearing are explicit (`smtpPassword` /
  `clearSmtpPassword`). Missing key fails **credential** saves clearly (503)
  without blocking identity-only profiles or other functions.
- **Product assignment.** Optional `products.sender_profile_id` (shared
  contracts + guarded API; validated through the owning service). One profile may
  serve many products; products are **unassigned by default** (no silent
  first-profile) with a clear missing/disabled state. Products and research stay
  usable — only drafting is blocked.
- **Drafting integration.** `outreach-drafter` resolves the **assigned active**
  profile and uses its identity; it persists the profile reference plus a
  **non-secret identity snapshot** on each draft. Material identity changes
  affect idempotency/versioning while a **password-only** change does not;
  profile edits/reassignment never rewrite existing drafts. Outdated sender/
  context inputs surface as stale warnings; raw missing-field names are replaced
  with operator guidance and links.
- **Autonomy.** Once a valid profile is assigned, the agent prepares drafts
  through the existing API with **no per-lead approval** and no "approve sender"
  gate; there are **no automatic retries** (the retry procedure is
  agent-driven).

Reason: identity must be reusable and safely stored so the automated pipeline
can draft without a human gate, while keeping the secret safe and the
sending boundary (and per-step approval) intact.

---

## 2026-09-18 — Evidence-backed initial outreach drafts (bounded `outreach-drafter` slice)

- **Initial draft only.** Implement `outreach_drafts` (owner `outreach-drafter`)
  and a guarded API to prepare and read an initial draft. Recipient selection
  uses the company's **usable, published** contacts — prefer a named person whose
  *published* title is purchasing-relevant, else the general business email;
  never invent responsibility. Content is built **only** from the Research
  Context (product/offer/facts) and the lead's evidence/claim; the language is
  derived from available context and recorded. Persist subject/body/language/
  recipient/status/rationale/references, plus precise **missing fields** on a
  `BLOCKED` outcome. Drafts are append-only/versioned and idempotent; existing
  drafts are never silently overwritten. **No send path** and no transport.
- **Staleness loophole closed (bounded).** The agent qualification now snapshots
  the **basis** (evidence/claim) it rested on, so a material provenance change —
  including re-submitting a lead with a changed claim — makes the prior
  assessment stale and blocks drafting until reassessment. No general
  reassessment framework is built here.
- **Autonomy.** Preparing a draft needs **no per-step human approval** (routine
  API writes within the approved task). Sending and commercial commitments remain
  unauthorized. Progression is **agent-executed**, not an unattended worker.

Reason: the intended automated pipeline must be able to prepare a grounded,
traceable first email without a human gate, while keeping provenance, honesty
about missing information, and the sending boundary intact.

---

## 2026-09-18 — Automation-first pipeline; agent qualification separate from human review

Product-direction correction: this is an **automated SDR assistant**, so human
shortlisting is **not** a mandatory gate before contact discovery (or later
preparation). The intended pipeline — product/objective intake → research →
candidate discovery → evidence-based qualification → contact discovery →
initial email drafting → persisted results — runs **autonomously** within the
approved scope, tool permissions and execution limits. Human review is an
**optional override / exception path**, not a step after every operation; email
**sending** remains unauthorized and approval-gated.

- **Agent qualification** is a first-class, bounded mechanism on
  `opportunity_companies`: `agentQualificationStatus`
  (`NOT_ASSESSED | QUALIFIED | NEEDS_MORE_EVIDENCE | DISQUALIFIED`) plus
  `agentQualificationReason`/`agentAssessedAt`, **separate** from operator
  `reviewStatus`. Qualifying writes only the agent fields — it never overwrites
  human review or simulates a human decision.
- **Eligibility for contact discovery** = **not human-rejected**, **not resting
  on superseded evidence**, AND (agent-qualified OR human-shortlisted). An
  explicit human `REJECTED` always wins; `UNREVIEWED` candidates may be assessed
  by the agent.
- **Approval scope (corrected):** normal API writes inside an approved task —
  qualification, contacts, provenance, and progress/checkpoints — require **no
  per-step human approval**. Approval is required only before **sending any
  message** and **making a commercial commitment**; applying suggestions as
  business state (e.g. target-market changes) stays human-gated.
- **Qualification semantics:** `QUALIFIED` means **suitable for contact
  discovery** for this specific product, based on the lead's CURRENT,
  product-fit evidence (an evidenced activity/role that plausibly buys or uses
  the product). It does **not** mean confirmed demand, purchasing intent, or an
  established customer; a generic trade role alone is insufficient without a
  product-fit rationale. Otherwise `NEEDS_MORE_EVIDENCE` or `DISQUALIFIED`. No
  demand, volume, contact or score is invented
  (`docs/system/research-harness/contact-discovery.md`).
- **Stale evidence:** a replaced/retracted supporting finding marks any prior
  agent qualification stale, blocks re-qualification until reassessed, and
  removes contact-discovery eligibility (human rejection and the correction
  safeguards are preserved).
- **No scheduler/background worker** is introduced by this decision;
  orchestration (worker/jobs) remains future work. Email drafting is in scope;
  sending is not.

Reason: the automation-first workflow must not be blocked on a human action that
was only ever an optional override; qualification is the agent's own,
auditable, evidence-linked responsibility, and human review stays available as
an override with rejection taking precedence.

---

## 2026-09-18 — Source-backed business contacts (bounded `contact-discovery` slice)

The **Contacts** section on the lead detail page is delivered as a bounded,
product-independent slice of the planned `contact-discovery` module (O-020).
The module owns `contacts` and `contact_sources`; it reuses `companies` and gets
its source references through the `evidence` service.

- **Contacts are independent of research runs.** Contact provenance is stored on
  the contact (`contact_sources` → `source_references`, deduplicated by URL) and
  **never** reopens or attaches evidence to a completed `research_run`. The
  lead's original buyer-fit evidence is untouched.
- **Original values are preserved; normalization is comparison-only.** Stored
  email/phone/URL are exactly as published; normalized columns (and a hashed
  identity: company + type + strongest channel + name for a person) exist only
  for idempotent deduplication. No email pattern, name, title or phone country
  code is ever inferred.
- **Published ≠ deliverable.** `deliverabilityStatus` distinguishes
  `NOT_VERIFIED` (found/published on a source) from a separately recorded
  `VERIFIED`; unknowns are explicit. A contact can be marked `UNUSABLE` with a
  reason instead of deleting it, retaining its provenance.
- **General company vs named person** is an explicit contact type; a job title
  is only accepted alongside an explicitly published person name.
- **Bounded ownership deviation (recorded).** The canonical plan listed
  `contact_sources` as `evidence`-owned; for this slice it is implemented under
  `contact-discovery` because contacts are decoupled from run-scoped evidence.
  `source_references` remains owned by `evidence` and is reused via a new,
  non-run `getOrCreateSource` service method.
- **No live discovery yet.** Only implementation and isolated synthetic testing
  are authorized here; live contact search is a later, **separately authorized**
  activity and does not inherit any research request's cost/tool permissions
  (see `docs/system/research-harness/contact-discovery.md`).

Reason: it lets an operator attach source-backed contacts to shortlisted leads
with full provenance and honest unknowns, without inventing data, probing
deliverability, contacting anyone, or coupling contact discovery to the
completed market-research run.

---

## 2026-09-18 — Evidence-backed potential-buyer shortlist (bounded `lead-discoverer` slice)

The product **Leads** tab is delivered as a bounded, product-independent slice
of the planned `lead-discoverer` module (O-019). The module now owns `companies`
(minimal identity) and `opportunity_companies` (opportunity-scoped candidate)
ahead of the fuller planned `lead-discoverer` → `lead-evaluator` →
`qualification_records` split. `qualification_records` and any scoring/qualification
engine remain planned; **contact discovery is the next slice** and no contact
record is created here.

- **Candidate = evidence-linked, not copied.** `opportunity_companies` requires
  provenance (`sourceReferenceId` derived from a mandatory `evidenceId`, optional
  CURRENT `claimId`) and links to the product only through the opportunity. The
  evidence/claims tables stay single-owned by `evidence`; the lead stores
  references, never duplicated findings.
- **Observed facts vs buyer-fit hypothesis are separate fields.** A confirmed
  seller status is never treated as purchasing intent; roles are multi-valued and
  may overlap; no demand, volume, contact or numerical lead score is recorded.
- **Operator review status lives on the candidate** (`UNREVIEWED | SHORTLISTED |
  REJECTED` + optional reason, `reviewedAt`) as a dimension separate from
  provenance. Shortlisting is a human action; a candidate is never a confirmed
  buyer.
- **Idempotency/dedup per opportunity.** `dedupKey` (`opportunityId` + a
  deterministic company `identityKey` = normalized name + country) plus
  `@@unique([opportunityId, companyId])`; a repeated submission upserts and
  refreshes the observed/hypothesis fields without changing the operator review
  state. The first-seen company display name is stable.
- **Corrections propagate as review, not silent support.** A supporting claim
  later replaced/retracted sets `needsReview` on read and blocks shortlisting
  until re-review; the raw review state is preserved, not overwritten.

Reason: this is the smallest complete slice that turns existing research into a
reviewable, provenance-preserving buyer shortlist without inventing demand or
starting the (separately planned) contact-discovery/qualification work. It adds
one additive migration (`20260918090000_add_companies_opportunity_leads`) and no
write to any other module's tables.

---

## 2026-09-17 — Research run Summary + minimal numeric price amount

The run view gains a compact, **run-scoped Summary** between Run overview and
Companies and offerings. It reports distinct identified companies (deduplicated
by the explicit `companyText` field — the documented fallback, since no canonical
company id exists; source domains and marketplaces are never counted as
companies), offering counts by exact/adjacent/substitute, the number of offerings
with usable prices, Lowest/Highest observed prices within comparable groups, and a
gaps indication from the checkpoint. It is whole-run and deliberately **not**
affected by the offering filters (those still change only the results list).

Price ranges need numbers, and the model stored only verbatim `priceText` plus
enums; parsing prose is forbidden. The minimal structured support is an optional
`research_offerings.price_amount_numeric` (Decimal), recorded **only** when the
source states a number on the same basis. Original wording and provenance are
preserved; no currency/unit conversion is done; correction-flagged or unresolved
offerings are excluded from extrema with a stated reason; a missing value is never
shown as `0`. Groups separate substitutes from exact matches and split by
currency, unit, VAT basis, retail/wholesale basis, sample/full-product and
treatment. The Back-to-top control gains `cursor-pointer` and a visible focus
ring; keyboard access and reduced-motion behavior are preserved.

---

## 2026-09-17 — Explicit research cost/tool permissions (FREE_ONLY | METERED_APPROVED)

The research request now stores an explicit `costPolicy`, chosen in the form and
persisted with the request:
- `FREE_ONLY` (default): only tools with an established free tier (Exa,
  Firecrawl); potentially billable tools whose free usage cannot be established
  (Gemini on a billing-enabled key) are excluded — `UNKNOWN` cost is not proof of
  free use. Free provider quotas are finite and external, so provider-quota
  exhaustion can pause a run **before** the request's numerical limits are
  reached.
- `METERED_APPROVED`: named providers within finite **call** limits; attempted
  calls (including retries and failures) count, are checked before each call, and
  are persisted in the run checkpoint (`providerUsage`) for resume.

Rationale and constraints: provider **permissions** (request) are kept separate
from provider **availability** (temporary quota/health). Credit-based ceilings
are not offered because a provider that reports usage only *after* a call cannot
be held to a strict ceiling; a hard euro spending cap is not enforceable with the
current tools and is never promised. Fallback guidance was corrected:
Gemini-grounded discovery followed by `webfetch` verification is a valid
candidate fallback when permitted and available; a redirect citation or an
inaccurate candidate list does not alone make it unusable. No new pause reasons
were introduced — existing reasons remain sufficient.

The existing rough-sawn request keeps its `FREE_ONLY` policy (a system default,
not an operator choice) and its paused state; its Gemini calls are not
retroactively labelled free or operator-approved.

---

## 2026-09-17 — A research request is a QUEUED ResearchRun (no parallel task framework)

The product-independent market research request flow reuses the existing domain:
`Offer` → `Opportunity` → `TargetMarket`/`OpportunityTargetMarket` →
`ResearchRun`. A submitted request **is** a `QUEUED` `research_run` that carries
its validated parameters in `research_runs.request_parameters` (JSONB) with a
unique `request_key` for idempotency. No new request table and no parallel task
framework were introduced.

Submission is orchestrated by `control-plane` (which may call every owning
service) inside a single `PrismaService.$transaction`; each owner still writes
only its own tables. A submission never mutates an existing opportunity or run: it
creates a **new** Opportunity and its target-market scope, so the paused LT/FI/GB
run is untouched. Offer resolution is unambiguous-only (explicit operator-facing
name, exactly one offer, or a minimal research-association offer); ambiguity is
rejected rather than guessed, and no price/availability/delivery/suitability is
invented. When the operator chooses "identify during research", the
target-market segment is the explicit non-commercial marker `UNSPECIFIED` — no
commercial segment is invented. Claiming a queued run is a compare-and-swap
(`QUEUED → RUNNING`); a second attempt is rejected
(`run_not_claimable` / `run_already_running`).

The flow is product-independent: goals, limits and offering fields are generic,
and Abachi is existing data, not a system-wide specialization.

---

## 2026-09-17 — Research-text encoding: data-only repair + UTF-8 byte-body write rule

Under explicit human authorization, the known manager-written non-ASCII
corruption was repaired **in place, data only**: the four double-encoded
`research_queries.query_text` rows (lossless CP1252↔UTF-8 round trip) and the six
`U+FFFD`-damaged fields (`source_references.title`/`publisher`,
`evidence.evidence_text`; `U+FFFD` + `-` → `ė`). The repair ran through a
bounded, idempotent, compare-and-swap maintenance script inside the single schema
owner (`soft/packages/database/scripts/repair-research-encoding.mjs`), with exact
before/after undo data kept outside Git. Only those rows/columns changed; the run
envelope, claim lifecycle, prices and `retrievedAt` were preserved.

**Reason / prevention.** The defect is in the manager PowerShell write path, not
the API/database/web path. `Invoke-RestMethod` with a .NET **string** body
encodes through Windows-1252 with best-fit fallback, silently turning `ė` into
`e` (reproduced 2026-09-17: `U+0117` transmitted as `0x65`). The canonical rule
is to send UTF-8 **bytes** with `charset=utf-8` and to save scripts as UTF-8
**with BOM** (`research-toolchain.md` §8).

**Follow-up (human-authorized).** The same scan found a broader set of records
whose diacritics were silently best-fit-stripped with **no** `U+FFFD` marker. On
the human's 2026-09-17 decision, the 12 high-confidence, source-verified
prose/quote records (4 `source_references` titles, 1 `claims` statement, 7
`evidence` texts) were restored in place with the same idempotent compare-and-swap
script, each token confirmed against the live source page; the 9 search queries
were left ASCII (may be intentional). The manager must never guess a character,
never "fix" corrupted text at display time, and never blindly transcode stored
records without explicit approval.

**Canonical write path.** Research writes go through
`scripts/research/ResearchApi.psm1` (`Write-ResearchJson`), which sends the body
as UTF-8 **bytes** with `charset=utf-8`; the module is ASCII-only so it is
correct with or without a BOM. It is verified end to end (PowerShell input →
request → API → database → API read) for Lithuanian and Finnish by
`scripts/research/Test-ResearchWriteEncoding.ps1`, run against an **isolated**
database (it refuses the real `:3003`).

---

## 2026-09-15 — Evidence-linked research offerings + manager write encoding fix

A bounded, `evidence`-owned `research_offerings` model makes company offerings
reviewable without a CRM: company/location/market-served, product, application,
treatment, dimensions, original price wording with currency/unit, and explicit
`vatStatus`/`priceBasis`/`sampleKind`/`matchType` enums. Provenance is
mandatory (`source_references` + `evidence`, optional CURRENT `claim`), a
deterministic per-run `fingerprint` prevents duplicates, and unrecorded values
stay null/`UNKNOWN` (never inferred from prose). Exposed read/write over the
internal API; the web is read-only.

Separately, corrupted Lithuanian/Finnish text was localized to the **manager's
PowerShell write path** (BOM-less scripts parsed as CP1252 and string-body
encoding), not the API or web. The API round-trips non-ASCII correctly (proven
by an integration test); the manager write pattern is fixed to UTF-8 bytes with
UTF-8 script reading. Two historically double-encoded `research_queries` rows
are reported, not rewritten.

- Reason: the sales-manager view needs structured, provenance-backed
  company/offering/price fields; the encoding defect had to be traced to the
  responsible path.
- Consequence: the research run's claims/evidence/corrections/checkpoint are
  unchanged; no generic extraction/CRM framework. Historical records are
  preserved.

---

## 2026-09-15 — Bounded claim-correction lifecycle (retraction/replacement)

## 2026-09-15 — Bounded claim-correction lifecycle (retraction/replacement)

Research claims gain a small, domain-specific correction lifecycle, owned by the
`evidence` module: `claims.lifecycleStatus`
(`CURRENT | RETRACTED | REPLACED`, default `CURRENT`) with `correctionReason`,
`correctedAt`, and a self-referencing `replacedByClaimId`. The API exposes
`POST /opportunities/:id/research-runs/:runId/claims/:claimId/corrections`
(`{ kind: RETRACTION | REPLACEMENT, reason, replacementClaimId? }`) and
`GET .../claims?includeHistory=true`. Original claims and their evidence links
are preserved (never edited/deleted). The lifecycle is **separate** from
`ClaimType` (FACT/INFERENCE/UNKNOWN) and from `EvidenceVerificationStatus`.
Validation is transactional: the target must be a `CURRENT` claim of the same
run; a replacement must be a different, `CURRENT` claim of the same run and must
not create a cycle; correcting an already-corrected claim is a conflict.

- Reason: overlapping corrections were previously expressed by appending more
  `INFERENCE` claims, which does not formally supersede anything and pollutes
  current results. A bounded lifecycle makes retraction/replacement explicit.
- Consequence: this is **not** a generic versioning framework (no version
  numbers, no generic version table); `product_facts` append-only versioning
  remains a separate, still-planned concern. The research harness now requires
  this mechanism for future corrections. No real research records were modified.

---

## 2026-09-15 — Research persistence: a first-class evidence entity (O-010/T-007)

Research results are persisted in three separated layers with single write
owners: `market-researcher` owns `research_runs` (now with `PAUSED` + a
**separate** `pauseReason`, `errorCode` for `FAILED`, and a JSONB `checkpoint` +
`checkpointAt`) and `research_queries`; `evidence` owns `source_references`
(deduplicated by URL), `evidence` (a factual observation with a retrieval date
and a `VERIFIED`/`UNVERIFIED` state), `claims` (`FACT`/`INFERENCE`/`UNKNOWN` +
confidence), and the stance-aware `claim_evidence` link. This **refines** the
previously planned join-only `claim_sources`: it could not represent an
observation independent of a claim, nor one claim resting on many evidence
records. A generic `search_results` table is deliberately **not** modelled. A
minimal run + evidence API (create/list/get/patch run; queries; sources;
evidence; claims) is exposed behind the internal API key; resume on a changed
context is blocked with `CONTEXT_CHANGED` rather than silently rebasing.

- Reason: the market-research harness requires provenance and an explicit
  discovery → evidence → conclusion separation, plus resumable runs, before any
  research execution is built.
- Consequence: canonical `data-governance.md`/`module-map.md` updated; frozen
  `research_contexts` snapshots, `research-records`, suggestions, and
  clarifications remain separate future tasks. No research was executed and
  nothing was committed or pushed.

## 2026-09-14 — Verified research toolchain marked; DeepSeek server-side search not accepted (O-007)

The verified operating toolchain is marked:

- **Exa** (`websearch`) — discovery;
- **Gemini Google Search** (`gemini_gemini_chat`, grounding on) — native
  in-session grounded discovery;
- **webfetch / Firecrawl** (`firecrawl_search` / `firecrawl_scrape` /
  `firecrawl_parse`) — source retrieval and verification.

Server-side web search was **not observed** in the tested DeepSeek
account/model/endpoint configuration on 2026-09-14. Both requests completed
without `web_search_call` items or source annotations. This path is **not
accepted as a verified research tool**. Documentation used:
`https://api-docs.deepseek.com/guides/responses_api/` (Tools table: `web_search`
/ `file_search` / `code_interpreter` / `computer_use` / `mcp` / other built-in
tools — **Ignored**; `function` — **Supported**). A conflict is recorded without
explanation: the same guide's "Input Items" note refers to `web_search_call`
items being restored and concatenated, implying prior support.

- Reason: record the verified toolchain and the non-categorical DeepSeek result so
  no research flow relies on an unverified search path, and keep research-coverage
  gaps visible — toolchain readiness does not mean the European market research is
  complete.
- Consequence: manager-environment only; no provider, permission or billing
  change, no `soft/**` integration, and no database change.

---

## 2026-09-14 — Research capability is the immediate priority; product onboarding postponed (O-007)

The immediate priority is market-research capability and coverage. Product
onboarding work is **postponed**. The manager's research toolchain is equipped and
recorded in `docs/system/research-toolchain.md`: built-in Exa `websearch` +
`webfetch`, the official Firecrawl MCP over its keyless hosted endpoint, and a
Google Search-grounding Gemini MCP (`@houtini/gemini-mcp`, Google AI Studio key
via `GEMINI_API_KEY`). No paid plan was purchased and no paid overage was enabled.

- Reason: coverage of sellers, manufacturers, distributors, specifications and
  prices in local languages is the current bottleneck; the toolchain must be
  validated before it is relied upon by any (still-unimplemented) research module.
- Consequence: this documents manager-environment tooling only. It does **not**
  implement `market-researcher`/`lead-discoverer` and does **not** authorize any
  external integration in `soft/**`; that requires a separate delegated task.
- Open item (resolved 2026-09-14): Gemini grounding was initially unverified; it
  is now verified at the server level and natively in-session (see the entry
  above and `research-toolchain.md`). The capability test in `docs/benchmarks/`
  records the progression.

## 2026-09-10 — Business endpoints sit behind an internal API key (T-006)

Every implemented business endpoint (Product/Offer/ProductFact, TargetMarket,
Opportunity, target-market attachment, and the research-context read) requires
the `x-internal-api-key` header. The check is constant-time; when
`INTERNAL_API_KEY` is unconfigured the guard fails closed with a non-sensitive
503; a missing/wrong key returns a non-sensitive 401. The key is never logged,
returned, or embedded in an error. `GET /health` and `GET /ready` remain public.
This is service-to-service identification only — **not** user authentication
(no users, roles, sessions, or JWT).

- Reason: business writes and context reads must not be open by default, while
  keeping operational liveness/readiness simple.

## 2026-09-10 — Research Context v1 is current-assembled, not yet frozen (T-006)

`GET /opportunities/:id/research-context` returns a **current assembled**
`research_context_v1` payload: `schemaVersion` is the contract literal and
`contextVersion` is the Opportunity's current revision (incremented with the
triggering write — target-market attachment or a relevant fact creation).
It is **not** an immutable or research-run snapshot. A future
ResearchRun/`research_contexts` capability will freeze the exact context for
audit and reproducibility at a binding version. Redaction (PENDING/RESTRICTED
values withheld) and SUPERSEDED omission remain mandatory and are enforced at
assembly time.

- Reason: deliver a usable context read path now without overstating
  reproducibility guarantees that only frozen snapshots can provide.

## 2026-09-10 — Initial feature modules implemented (T-006)

The first business modules now exist: `products-and-offers`, `opportunities`,
and a minimal `control-plane` (`ResearchContextService`), with shared
`packages/contracts` implementing the canonical contract. The remaining modules
(`knowledge`, `evidence`, `research-records`, `market-researcher`, discovery,
outreach, `approvals`, `jobs`) and the `research_contexts` snapshot remain
planned.

- Reason: record the implemented reality so `project-state.md` and
  `module-map.md` no longer describe the modules as entirely absent.

## 2026-09-10 — Legacy evidence is immutable; whitespace checking must not force normalization

`legacy/**` is historical, non-live evidence and is **immutable**: it must not
be edited to satisfy tooling. A repository-root `.gitattributes` rule disables
Git's trailing-whitespace check for `legacy/**` **only**, so
`git diff --cached --check` never forces normalisation of historical content.
All other paths — source, docs, ops tasks, migrations, and archived
`soft/tasks/**` records — retain the default whitespace checking
(`blank-at-eol`, `blank-at-eof`, `space-before-tab`).

- Reason: preserve historical evidence verbatim while keeping the pre-commit
  whitespace gate meaningful for authored content. A failing check must not be
  accepted as a warning, and historical content must not be rewritten.

## 2026-09-10 — Root Manager Workspace and one documentation hierarchy (O-001)

The repository root gains a **Manager Workspace** (root `AGENTS.md`,
`ops/` task loop, `docs/system/` canonical docs, root `.gitignore`). There is
one canonical documentation set (`docs/system/`); `docs/redesign/` is marked
historical/superseded; `soft/docs/` remains the implementation/testing/security
set and links to the canonical root.

- Reason: the repository needs a manager-level workspace and a single clear
  documentation hierarchy before any baseline commit.

## 2026-09-10 — Markdown is never live business state

PostgreSQL (owned by `soft/packages/database`) is the single source of live
business state. Markdown serves exactly four purposes: instructions, decisions,
historical evidence, and generated reports. It must never act as a competing
store for products, offers, facts, opportunities, target markets, research runs,
findings, companies, contacts, or leads.

- Reason: one business source of truth; prevents drift and stale duplicate data.

## 2026-09-10 — `docs/redesign/` superseded by `docs/system/`

`docs/redesign/` is retained as historical proposal material only. The canonical,
reconciled architecture lives in `docs/system/`. The redesign's stale elements
(Bun workspaces, root `modules/`, root `workers/`, `repository.base.ts`,
`RESTRICTED` as a status) are superseded.

- Reason: preserve rationale without propagating outdated design.

## 2026-09-10 — Workspace TypeScript boundary: typecheck on source, build on dist

`soft/apps/api` maps `@ai-sdr/database` to the package source for type-checking
and tests (`paths` + vitest alias), while the emitted build resolves the
compiled `dist`. The Prisma client is generated by the root `postinstall` and by
the database package's `build`/`typecheck` scripts.

- Reason: root `pnpm typecheck` must pass from a clean install with no compiled
  `packages/database/dist`, without making typecheck depend on a prior build.

## 2026-09-10 — No generic `RepositoryBase`; direct Prisma client boundary

`soft/packages/database` exposes only the Prisma schema, generated client, and
`PrismaService`. Module-owned typed repositories are added only when a real
consumer needs them.

- Reason: avoid an abstraction prepared for imaginary future modules.

## 2026-09-10 — API loads the workspace root `.env` at runtime

`soft/apps/api` loads the workspace root `.env` at startup via
`process.loadEnvFile` (existence-guarded). Existing environment variables take
precedence; nothing is read, logged, or echoed.

- Reason: the API is a separate process from the Prisma CLI; local
  development/runtime must not require exporting `DATABASE_URL` first.

## 2026-09-10 — Prisma 7 with driver adapters + `prisma.config.ts`

`soft/packages/database` uses Prisma ORM 7: the ESM `prisma-client` generator
with a required `output`, the `@prisma/adapter-pg` driver adapter, and
`prisma.config.ts` (with `dotenv` for the CLI). Generated client lives under
`src/generated` (git-ignored).

- Reason: current Prisma conventions; Prisma 7 no longer auto-loads `.env`,
  requires a custom `output`, and requires a driver adapter.

## 2026-09-10 — `Offer` is a sellable product form

`Offer` is the concrete sellable product form (variant) belonging to exactly one
`Product`; an `Opportunity` belongs to one `Offer`. This refines the earlier
`opportunity_offers` placeholder (per-opportunity commercial terms), which is
deferred.

- Reason: the minimal commercial domain needs a sellable variant distinct from
  per-opportunity commercial terms.

## 2026-09-10 — ProductFact subject/value rules as DB CHECK constraints

`ProductFact`'s "exactly one of Product/Offer" and "at least one value" rules are
enforced with hand-authored CHECK constraints in the migration, because Prisma
cannot express CHECK constraints.

## 2026-09-10 — Fact status and visibility are separate dimensions

`ProductFact.status` ∈ `PENDING | CONFIRMED | SUPERSEDED` and
`ProductFact.visibility` ∈ `OPERATIONAL | RESTRICTED`. `RESTRICTED` is a
visibility dimension, not a status.

- Reason: the implemented model separates assertability from value exposure.

## 2026-09-10 — Lazy Prisma client + `SELECT 1` readiness

`GET /health` stays a DB-free liveness check. `GET /ready` runs a safe
`SELECT 1` through a lazily-created `PrismaService` and returns a non-sensitive
503 on failure.

## 2026-09-10 — Isolated `ai_sdr_test` database for integration tests

Database-package tests run against a disposable `ai_sdr_test` database (created
idempotently, migrated, truncated between tests); they never write to the
development database.

## 2026-09-10 — Explicit `@Inject()` tokens for DI constructor params

NestJS providers/controllers inject by constructor parameter using an explicit
`@Inject(Token)`, not `emitDecoratorMetadata` (not emitted by esbuild-based
runners such as vitest/tsx).

---

## Prior decisions (2026-09-09)

- **Node 24 + pnpm 11 replace Bun.** `.nvmrc` = `24.20.0`;
  `packageManager` = `pnpm@11.26.0`; `pnpm-lock.yaml` is the single lockfile.
- **Modular NestJS rebuild.** Bounded modules, one process/one DB, injectable
  services, one REST boundary.
- **Feature modules live in `soft/apps/api/src/modules/<module>/`.** No root
  `modules/*` workspace.
- **`soft/packages/*` holds only shared packages.** `database` (schema/
  migrations), `contracts` (Zod/TS), later `testkit`.
- **`soft/apps/web` is the planned future UI** (retained, implementation
  deferred).
- **The worker is `soft/apps/worker`**, not a root `workers/` directory
  (created only when long-running jobs require it).
- **Central PostgreSQL is the single source of truth.** Markdown is historical
  evidence or generated reports.
- **One Prisma schema and migration chain** in `soft/packages/database`.
- **Explicit table ownership (single writer per table);** cross-boundary changes
  go through the owning module's service.
- **Thin control-plane:** owns only `tasks`, `executions`, `activities`,
  `research_contexts` — not business tables.
- **Versioned Research Context (`research_context_v1`):** research modules
  receive only `taskId` + `opportunityId`; product data comes from a frozen,
  versioned context.
- **Typed product facts:** `PENDING | CONFIRMED | SUPERSEDED` plus visibility
  `OPERATIONAL | RESTRICTED`; authored only by humans/trusted product-data
  sources.
- **`research-records` is the single write-owner** of `research_records` and
  `research_findings`.
- **Human approval gates:** target-market changes, company/contact acceptance
  where configured, outreach sending, and any commercial commitment.
- **BullMQ direction, no worker yet.**

The earlier opportunity-centred plan and market-research harness live in
`legacy/` as non-live historical input, superseded where they conflict.
