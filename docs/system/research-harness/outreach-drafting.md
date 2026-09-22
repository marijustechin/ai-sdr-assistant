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
- Write a **concise** introduction with **exactly one clear question**.
- Personalize from the lead's **observed activity** without implying confirmed
  buying intent.
- **Language** is derived from available context (the company's recorded
  country) — never hardcoded to a product/market — and the choice is recorded.

## 4. Missing information

Essential (blocks a usable draft): an **assigned active sender profile** (its
identity), an **offer summary**, the **offer context**, and a **recipient
email**. When any is missing, persist an explicit **`BLOCKED`** outcome naming
the precise missing fields — never a placeholder labelled as a finished draft.
Continue with other eligible candidates. Optional detail that is unsupported is
simply omitted. Missing fields are shown to the operator as guidance with a link
to the product/settings screen, not as bare field names.

## 5. Persistence and idempotency

- Persist **subject, body, language, recipient reference, preparation status,
  rationale, and references** to the context/evidence used (context version,
  evidence/claim/source ids).
- Drafts are **append-only and versioned**: a re-run with identical inputs is
  **idempotent** (unique fingerprint → no duplicate); a material change creates
  a **new version**, preserving the earlier draft (never a silent overwrite).
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
