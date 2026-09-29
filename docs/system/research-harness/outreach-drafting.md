# Outreach Drafting — Evidence-Backed Initial Emails

**Status:** Canonical operating procedure (O-021, 2026-09-18). Entry point:
[`AGENTS.md`](AGENTS.md).
**Applies to:** preparing an **initial outreach draft** for an eligible lead.
The agent runs this autonomously within the approved scope — **no per-step human
approval**. **Sending is out of scope and not authorized**; there is no send
button and no transport integration.

An initial draft is a prepared email plus its rationale. It is **not** a claim of
demand, purchasing intent or a relationship, and finding an address is not proof
of deliverability.

---

## 1. Eligibility

Draft only for a lead that is:

- **not** excluded from outreach by a **human decision** for this
  opportunity+company scope (`DO_NOT_CONTACT`, `EXISTING_RELATIONSHIP`,
  `NOT_RELEVANT`, `ALREADY_CONTACTED`; `ELIGIBLE`/none means no exclusion), and
- **not** human-`REJECTED`, and
- **not** resting on superseded evidence (its supporting finding is `CURRENT`,
  and its agent qualification is not stale), and
- **agent-qualified** (`agentQualificationStatus = QUALIFIED`) **or**
  human-`SHORTLISTED`, and
- attached to a product with an **active sender profile assigned**. The sender
  identity is resolved automatically from that profile; a mailbox connection
  (`email_account`, SMTP/IMAP) is **not** required for drafting and does not
  authorize sending. A missing or disabled profile blocks drafting (only
  drafting) with a clear reason.

A material provenance change to a lead (different evidence/claim, or a
replaced/retracted finding) invalidates the prior agent qualification
(`agentQualificationStale`) and **requires reassessment** before drafting. See
`contact-discovery.md` §7 for the recovery limitation.

## 2. Recipient selection (one per company/opportunity)

- Consider only **usable** contacts that have a **published** email
  (`usabilityStatus = USABLE`); never use an unusable/outdated contact.
- Prefer a **named person whose published title is explicitly relevant to
  purchasing/procurement/sourcing** (generic keyword match on the *published*
  title). Otherwise use the **general company business email**.
- **Never invent** purchasing responsibility for a named person, and never guess
  an address. Record the selected contact and the selection rationale; a
  published email is **not** a deliverability claim.

## 3. Draft content

- Read the opportunity's **Research Context** (product/offer/facts) and the
  lead's **evidence/claim** through the API — the only sources for content.
- Use **only supported** product/commercial claims. Omit unsupported optional
  detail. Never state prices, stock, certifications, delivery promises, a sender
  identity, or a prior relationship that is not supplied/evidenced.
- **First-contact shape (2026-09-25):** a greeting; **one evidence-backed
  personalization sentence** from the observed activity (deterministically
  naturalized for a bounded set of English and **Lithuanian** patterns; a neutral
  in-language, evidence-safe fallback is used otherwise — never a raw database
  fragment); **one product proposition** (offer + category only when it adds
  information not already in the offer wording; non-English scaffolds do not
  surface the internal category label); **one restrained commercial-terms line**
  ("competitive B2B terms — current pricing depends on quantity and
  specification"); and **exactly one** low-friction CTA question. One canonical
  body is the single editable source; plain-text `body` and `htmlBody` are
  derived from it + the structured sender identity, and a human revision (via the
  compact editor) creates a new append-only version.
- **No concrete price by default.** Leave price, MOQ, dimensions, availability,
  lead time, samples and origin for the recipient to ask about. No specification
  dump; no MOQ/Incoterm/lead-time block; no superlatives or guarantees
  ("cheapest"/"best"/"lowest"/"guaranteed"); no RFQ/procurement styling.
- **Never invent** the recipient's interest, intent, purchasing responsibility,
  prior relationship, or a certification that is not stored.
- Personalize from the lead's **observed activity** without implying confirmed
  buying intent.
- **Language** is derived from available context (the company's recorded
  country) — never hardcoded to a product/market — and the choice is recorded.
  The closing phrase is localized; structured sender identity (incl. canonical
  title) is emitted verbatim.

## 4. Missing information

Essential (blocks a usable draft): an **assigned active sender profile** (its
identity), an **offer summary**, the **offer context**, and a **recipient
email**. When any is missing, persist an explicit **`BLOCKED`** outcome naming
the precise missing fields — never a placeholder labelled as a finished draft.
Continue with other eligible candidates. Optional detail that is unsupported is
simply omitted. Missing fields are shown to the operator as guidance with a link
to the product/settings screen, not as bare field names.

## 5. Persistence and idempotency

- Persist **subject, canonical body, body (plain text), htmlBody (HTML),
  language, recipient reference, preparation status, rationale, and references**
  to the context/evidence used (context version, evidence/claim/source ids). The
  canonical body is the single human-editable source; the plain-text and HTML
  bodies are deterministically derived from it plus the structured sender
  identity, so they can never drift.
- Drafts are **append-only and versioned**: a re-run with identical inputs is
  **idempotent** (unique fingerprint → no duplicate); a material change — or a
  human revision (`PATCH .../outreach-drafts/:draftId`) — creates a **new
  version**, preserving the earlier draft and its HTML (never a silent overwrite).
- The exact approved send snapshot is `subject` + `body` + `htmlBody` +
  `canonicalBody` + the sender identity snapshot + recipient + language +
  provenance references. Transport later sends that snapshot verbatim — zero
  content generation at send time.
- **Batch review (2026-09-25).** Drafts are grouped into an `outreach_batches`
  review unit for the opportunity scope and approved **as a whole** (one human
  action); per-recipient approval is not required. Approval freezes the exact
  version of every included draft. A human edit creates a new `PENDING` version
  and returns an approved batch to `DRAFT` (re-approval). `regenerate` re-derives
  only unapproved, non-customized drafts. `APPROVED → QUEUED → SENDING → SENT` is
  reserved for a future controlled-pacing send worker; **no sending exists**.
- Show missing-data and stale-input warnings clearly. No send action.

## 6. Autonomy vs. orchestration

Once the operator has **saved a sender profile and assigned it** to the product,
the agent prepares drafts through the existing API with **no per-lead approval**
and no "approve sender" gate. Drafting is **agent-executed** in this slice: the
agent explicitly performs each step. It is **not** an unattended background
pipeline — there is **no worker and no automatic retry**.

## 7. Retrying blocked drafts (agent-driven)

When a draft is `BLOCKED` (e.g. no sender profile assigned, or a recipient
missing), the fix is an **explicit, operator-driven** sequence:

1. The operator creates a profile under **Settings → Sender profiles** (identity
   only is enough) and assigns it on the product's edit form, or adds a usable
   published contact.
2. The agent retries preparation for each previously blocked lead via
   `POST /opportunities/:opportunityId/leads/:leadId/outreach-drafts` (no
   approval per lead). Identical inputs are idempotent; a newly usable sender
   identity creates a **new draft version** and the earlier `BLOCKED` draft is
   preserved.
3. If an assigned profile is later disabled or its identity changes, the draft
   surfaces a **stale-input warning** and a retry produces a new version — the
   historical draft is never rewritten.

No automatic retries exist; this is agent-driven, not a worker.

## 8. Hard prohibitions

- No sending, no email transport, no contact forms, no subscriptions, no billing
  changes; **no SMTP/IMAP connections or test messages** — mailbox configuration
  (on `email_accounts`) is stored for later use only and never authorizes sending.
- No new searches or paid calls; use existing evidence and contacts.
- No invented prices, stock, certifications, delivery promises, sender identity
  or prior relationships; never prefill an identity from repository authors, Git
  credentials or environment usernames.
- No mutation of human review states, companies, or the completed research run.
- No writing Markdown as live state; drafts live in PostgreSQL through the
  guarded API.
