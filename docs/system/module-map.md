# Module Map and Boundaries (Canonical)

**Status:** Canonical, live. Reconciled with implemented reality through T-004.
**Supersedes:** `docs/redesign/module-boundaries.md`.
**Companion:** `architecture.md`, `data-governance.md`, `research-context-contract.md`.

Feature modules live in `soft/apps/api/src/modules/<module>/`. Each module is
defined by responsibility, inputs, outputs, tables read, tables written, emitted
events, approval requirements, and failure behaviour. Table owners are defined
in `data-governance.md`.

> **Status note:** implemented subsets exist for `control-plane`
> (ResearchContextService + research-request orchestration), `opportunities`,
> `products-and-offers`, `evidence`, `market-researcher`, `lead-discoverer`,
> `contact-discovery`, `outreach-drafter`, `sender-profiles`, `email-accounts`,
> `dashboard`, `outreach-sender`, and `price-inquiry`/`quote-collection` (**now decommissioned as a
> Market Research capability and retained dormant** — see their sections).
> `research-result` is **retired**. `knowledge`, `research-records`,
> `lead-evaluator`, `company-intelligence`, `approvals`, `jobs`, and
> `inbox-intelligence` are intended but not implemented. The single current
> capability snapshot is `project-state.md`; this file owns module
> **boundaries/ownership**, not the status list.

**Service-to-service boundary:** every implemented business endpoint (the
catalogue write routes and the research-context read) is gated by the
`x-internal-api-key` guard (constant-time, fail-closed when unconfigured,
non-sensitive errors; never logged or returned). `GET /health` and `GET /ready`
stay public. This is not end-user authentication.

**Context semantics:** `GET /opportunities/:id/research-context` returns a
**current assembled** `research_context_v1` (`contextVersion` = the Opportunity's
current revision). It is not an immutable snapshot; freezing exact context for
audit/reproducibility is a future ResearchRun/`research_contexts` capability
(§1, `research-context-contract.md` §8).

---

## 1. `control-plane` — Assistant Manager

- **Status:** implemented subset (T-006 for context, 2026-09-17 for requests) —
  `ResearchContextService` assembly and redaction, exposed as
  `GET /opportunities/:id/research-context`, and the **product-independent
  research request flow** (`POST /research-requests`,
  `GET /research-requests?status=QUEUED`, `GET /research-requests/:runId`), which
  orchestrates the owning modules in one transaction (resolve/create Offer via
  `products-and-offers`, create Opportunity + target markets via
  `opportunities`, create a `QUEUED` run via `market-researcher`). Task routing,
  `tasks`/`executions`/`activities`, approval routing, and `research_contexts`
  snapshots remain planned.
- **Responsibility:** Task routing/orchestration (including task **scope**),
  execution tracking, activity (audit) log, initiating approval requests, and
  assembling the versioned **Research Context** (`ResearchContextService`). It
  is *thin*: it does not implement domain logic and does not own business tables.
- **Inputs:** `TaskRequest` (verb + subject ids + `scope` + payload ref); domain
  events; retry/cancel commands; `getResearchContext(opportunityId, version?)`
  and `startResearchRun(opportunityId, taskId)`.
- **Outputs:** `Task` (with `scope.targetMarketIds`, optional `country`/
  `industry`), `Execution`, `Activity`; routed job; approval-request reference;
  `ResearchContext` DTO; `research_contexts` snapshot.
- **Tables read:** all (read-only, via owning services or read models).
- **Tables written:** `tasks`, `executions`, `activities`, `research_contexts`
  (**owner**).
- **Emitted events:** `task.created`, `task.routed`, `execution.started`,
  `execution.succeeded`, `execution.partially_succeeded`, `execution.failed`,
  `execution.cancelled`, `activity.recorded`, `approval.requested`.
- **Approval:** requests approvals (delegating to `approvals`); never approves.
- **Failure:** routing failures produce a `FAILED` execution with a typed code;
  retryable routing errors are re-enqueued; the Task record is never lost.

---

## 2. `opportunities`

- **Status:** implemented subset (T-006) — `POST /target-markets`,
  `POST /opportunities`, `POST /opportunities/:id/target-markets`, and the
  Opportunity `contextVersion` increments. Update/status/archive and
  target-market suggestions remain planned.
- **Responsibility:** Opportunity and TargetMarket lifecycle (create, update,
  status, archive); the opportunity workspace read model.
- **Inputs:** `CreateOpportunityInput`, `UpdateOpportunityInput`,
  `CreateTargetMarketInput`, `ApplyTargetMarketSuggestionInput`.
- **Outputs:** `Opportunity`, `TargetMarket`, `OpportunityWorkspace`.
- **Tables read:** `opportunities`, `target_markets`,
  `opportunity_target_markets`, `target_market_suggestions` (planned),
  `products`, `offers`.
- **Tables written:** `opportunities`, `target_markets`,
  `opportunity_target_markets` (**owner**); `target_market_suggestions`
  (planned, owner).
- **Emitted events:** `opportunity.created`, `opportunity.updated`,
  `opportunity.status_changed`, `target_market.created`, `target_market.updated`,
  `target_market_suggestion.applied`.
- **Approval:** suggestions are applied only through an accepted approval;
  direct target-market mutation is human-initiated and logged.
- **Failure:** validation errors reject the command; applying a suggestion is
  idempotent.

---

## 3. `products-and-offers`

- **Status:** implemented subset (T-006) — `POST /products`,
  `POST /products/:productId/offers`, `POST /product-facts` (human/trusted-source
  authoring only; SUPERSEDED rejected as an initial state; CONFIRMED requires a
  source label; exactly one subject; at least one value). CRUD, confirm/restrict,
  and append-only fact versioning remain planned.
- **Responsibility:** Product catalog, sellable **Offers**, and typed product
  facts. Product facts are authored by humans or trusted internal product-data
  sources only — **never by research modules**.
- **Implemented model (T-004):** `Product` ◀ `Offer` (concrete sellable form /
  variant) ◀ `Opportunity`; `ProductFact` belongs to exactly one Product or
  Offer. `status` ∈ `PENDING | CONFIRMED | SUPERSEDED`; `visibility` ∈
  `OPERATIONAL | RESTRICTED`.
- **Inputs:** product/offer CRUD; `EnterFactInput` (human), `IngestFactInput`
  (trusted source), `ConfirmFactInput`, `RestrictFactInput`.
- **Outputs:** `Product`, `Offer`, `ProductFact` (redacted per status/visibility).
- **Tables read/written:** `products`, `offers`, `product_facts` (**owner**);
  `fact_sources` (planned, evidence-owned).
- **Emitted events:** `product.created`, `product.updated`, `product.archived`,
  `offer.created`, `offer.updated`, `fact.entered`, `fact.ingested`,
  `fact.confirmed`, `fact.restricted`, `fact.superseded`.
- **Approval:** a fact moves `PENDING → CONFIRMED` only via an approved
  `approvals` request.
- **Failure:** uniqueness violations reject with a typed error; fact updates are
  append-only (planned versioning).
- **Deferred:** per-opportunity commercial terms (`opportunity_offers`) and
  append-only fact versioning.

---

## 4. `knowledge`

- **Responsibility:** Versioned sales knowledge: `CustomerProfile`,
  `BuyerPersona`, `ValueProposition`.
- **Inputs/outputs:** CRUD inputs; versioned entities with archive/restore.
- **Tables read/written (owner):** `customer_profiles`, `buyer_personas`,
  `value_propositions` (+ associations).
- **Events:** `knowledge.*.versioned`, `knowledge.*.archived`.
- **Approval:** none for CRUD; `ValueProposition` approved/forbidden claims are
  human-curated.
- **Failure:** concurrent updates raise a version conflict; no hard delete.

---

## 5. `evidence`

- **Status:** implemented subset (T-007) — `POST/GET .../research-runs/:runId/
  sources`, `.../evidence`, and `.../claims`, plus the bounded claim-correction
  lifecycle (`POST .../claims/:claimId/corrections`; `GET .../claims` excludes
  non-`CURRENT` claims unless `?includeHistory=true`). Source/evidence/claim
  persistence with source dedup-by-URL, structural evidence/claim separation, and
  stance-aware claim↔evidence links. CSV source-register export and cross-run
  reuse planning remain future work.
- **Responsibility:** Single owner of source references, evidence, and claims.
  Validates claim types (FACT / INFERENCE / UNKNOWN), enforces citation/
  confidence rules, deduplicates sources by URL, owns the correction lifecycle
  (retraction/replacement, separate from claim type and evidence verification),
  exports the source register (CSV, planned).
- **Inputs/outputs:** `RegisterSourceInput`, `PersistEvidenceInput`,
  `PersistClaimInput`, `CorrectClaimInput`; `SourceReference`, `Evidence`, `Claim`
  entities + validation results + CSV register (planned).
- **Tables read/written (owner):** `source_references`, `evidence`, `claims`,
  `claim_evidence`, `research_offerings`, and all source-join tables.
- **Events:** `evidence.source_registered`, `evidence.claim_persisted`,
  `evidence.claim_rejected`.
- **Approval:** none (mechanical validation).
- **Failure:** a FACT/INFERENCE claim without evidence is rejected; an UNKNOWN
  claim carrying evidence is rejected; evidence links must belong to the same
  run; a correction of an already-corrected claim is rejected, and a missing,
  self, cross-run or non-current replacement (or a cycle) is rejected; partial
  source failures are recorded without losing valid claims.

---

## 6. `research-records`

- **Responsibility:** The **single write-owner** of `research_records` and
  `research_findings`. Research modules call this service with a `type`
  discriminator (MARKET / COMPANY / CONTACT / COMPETITOR / IMPORT_EXPORT).
- **Inputs/outputs:** `CreateResearchRecordInput`, `UpdateResearchRecordInput`,
  `GetResearchRecordsInput`; `ResearchRecord`, `ResearchFinding`, query service.
- **Tables read/written (owner):** `research_records`, `research_findings`;
  `research_record_sources` via `evidence`.
- **Events:** `research_record.created`, `research_record.updated`.
- **Approval:** none — records are evidence, not business-state mutations.
- **Failure:** invalid `type` / missing scope rejected; findings validated for
  `evidenceStatus`.

---

## 7. `market-researcher`

- **Status:** implemented subset (T-007, extended 2026-09-17) — the run envelope
  (`research_runs` + scope), the run-scoped `research_queries` log, and the
  minimal run API (`POST/GET /opportunities/:id/research-runs`,
  `GET/PATCH .../:runId`, `POST .../:runId/queries`) including the
  `CONTEXT_CHANGED` resume guard. It also owns the **queued research request**
  fields (`request_parameters` JSONB, `request_key` unique) and the one-time
  `QUEUED → RUNNING` claim. The AI research execution itself, budgets, and
  suggestions/clarification requests remain planned.
- **Responsibility:** Market research per target market → sourced findings +
  target-market suggestions + clarification requests. Never mutates business
  data; never authors product facts. A **context consumer**: sees only `taskId`
  + `opportunityId` and reads the frozen `ResearchContext`.
- **Inputs:** `taskId`, `opportunityId` (nothing else). Scope resolved from the
  `Task`; manifest/budgets from the `research_runs` record.
- **Outputs:** `MarketResearchOutput` (observations, suggestions, competitors,
  import/export findings, risks, sources, unknowns, limitations).
- **Tables read/written:** reads context/tasks/markets/facts/knowledge via
  owning services; writes `research_runs` (**owner**),
  `research_run_target_markets` (**owner**), and `research_queries` (**owner**),
  suggestions via `opportunities`, records/findings via `research-records`,
  claims/sources via `evidence`.
- **Events:** `market_research.completed`, `target_market_suggestion.created`,
  `clarification_request.created`.
- **Approval:** suggestions stay `PENDING` until a human accepts/rejects.
- **Failure:** partial results (`PARTIALLY_SUCCEEDED`); budgets/stop conditions
  enforced; retry only temporary fetch failures.
- **Fact rule:** only CONFIRMED facts asserted; PENDING/RESTRICTED surfaced as
  unknowns; SUPERSEDED absent.

---

## 8–11. Discovery and intelligence

- **`lead-discoverer`** — company discovery + dedup. Writes `companies`,
  `opportunity_companies` (owner); sources/claims via `evidence`. Approval:
  company acceptance human-gated where configured.
- **`lead-evaluator`** — qualification/scoring → versioned
  `qualification_records` (owner); updates `opportunity_companies` status.
  Produces a human-reviewable verdict, not a commitment.
- **`company-intelligence`** — deep company research → sourced profile; writes
  claims/sources via `evidence` and records via `research-records`.
- **`contact-discovery`** — contact discovery + email-pattern inference; writes
  `contacts` (owner) + sources/claims via `evidence`; never fabricates email.

## 12. `inbox-intelligence`

Reserved, post-MVP; inert in MVP. Future owner of `inbox_items`.

## 13. `outreach-drafter`

**Status:** implemented subset (O-021, 2026-09-18; **human exclusion layer
2026-09-25**) — the **initial draft** plus the **human outreach decision**.
`POST/GET /opportunities/:id/leads/:leadId/outreach-drafts` persist a draft
(`PREPARED | BLOCKED`) with recipient, subject/body, language, rationale and
context/evidence references; append-only/versioned and idempotent.
`GET/PUT /opportunities/:id/companies/:companyId/outreach-decision` read/set the
human decision (`ELIGIBLE | DO_NOT_CONTACT | EXISTING_RELATIONSHIP | NOT_RELEVANT |
ALREADY_CONTACTED`, optional note, human provenance); a convenience pair
`GET/PUT /opportunities/:id/research-offerings/:offeringId/outreach-decision`
resolves the offering's company so the decision can be recorded from research
results before any lead exists. **No send path** and no transport integration.
Approval-gated sending, follow-ups and reply handling remain planned.

Evidence-based drafts with full traceability. Writes `outreach_drafts` and
`outreach_decisions` (**owner**). **Never sends**: a draft cannot be sent without
human approval.

**Human exclusion precedence (2026-09-25).** Any decision other than `ELIGIBLE`
**overrides** the agent qualification and the operator review: `prepareDraft`
rejects with `409 lead_excluded_from_outreach` (carrying the decision) and an
already-prepared draft is flagged stale. `ELIGIBLE` records that no exclusion
applies but does **not** bypass the normal qualification gate. The decision is
opportunity+company scoped (not a global blacklist) and never deletes or hides a
company from Market Research results or evidence.

**First-contact content policy (2026-09-25).** The generated message is a short,
human B2B note with one evidence-backed personalization sentence (deterministically
naturalized for a bounded set of English and **Lithuanian** patterns, or a neutral
evidence-safe fallback in the message language when it cannot be rendered), one
product proposition (offer + category only when it adds information; non-English
scaffolds never surface the internal category label), one restrained
commercial-terms line, and **exactly one** low-friction CTA question, plus a
localized closing and the structured sender signature. It contains **no concrete
price by default**, no specification dump, no MOQ/Incoterm/lead-time block, no
multiple questions, no RFQ/procurement styling, and no superlatives/guarantees;
it never invents the recipient's interest, intent, purchasing responsibility,
relationship, or certifications. Official offer/product names are kept verbatim.
A compact human editor exposes **only the subject and the canonical body**
(signature read-only); saving regenerates the plain-text and HTML bodies as a new
append-only version. Transport later sends the exact approved snapshot verbatim.

**Batch review (2026-09-25).** `outreach_batches` (owner here) groups generated
drafts for one opportunity scope (optional target market + sender profile +
language). `POST /opportunities/:id/outreach-batches` generates drafts for every
currently eligible lead (excluded/rejected/stale/no-recipient leads are skipped
and counted); `GET` returns the summary (sender, scope, language, eligible /
excluded / no-recipient / generated counts, representative previews) plus all
drafts; `POST .../:batchId/approve` approves the whole batch in one action and
freezes the exact version of every included draft; `POST .../:batchId/regenerate`
re-derives **unapproved, non-customized** drafts (never overwriting an individual
edit or an approved version). `POST .../:batchId/apply-message` applies a shared
batch-level `messageStrategy` (subject / proposition / commercial terms / CTA,
stored on `outreach_batches.message_strategy`) and regenerates the same eligible
set, preserving each lead's evidence-backed personalization; the summary reports
`regeneratableDrafts` / `customizedDrafts` so the operator sees the impact first.
Approval is per immutable version: a human edit
creates a new `PENDING` version and returns an approved batch to `DRAFT`.
`POST .../:batchId/reopen` explicitly reopens an APPROVED not-yet-started batch
for editing (refused once QUEUED/SENDING/SENT): the batch returns to `DRAFT`,
approved versions are kept as immutable history, and a later apply-message creates
new PENDING versions from the shared message. Applying to an APPROVED batch is
refused (`batch_approved_reopen_first`) rather than silently affecting 0 drafts;
customized drafts stay protected unless the operator opts into `resetCustomized`.
Re-approval freezes only the new current versions.
`OutreachBatchStatus` reserves `APPROVED → QUEUED → SENDING → SENT` (+
`CANCELLED`) and `sendPolicy` for a future controlled-pacing send worker — **no
sending exists**.

## 14. `approvals`

The approval workflow engine: create requests, capture accept/reject, apply
accepted mutations by invoking the owning module's service. Writes
`approval_requests`, `decision_records` (**owner**). Accept/reject is idempotent;
every decision is a decision record (no chain-of-thought).

## 15. `jobs`

BullMQ queue/worker wiring, job lifecycle, retries, idempotency, progress,
DLQ. Reads `tasks`/`executions`; writes job-status fields (coordinated with
control-plane) and `job_logs`. The future worker is `soft/apps/worker`.

---

## 16. Interaction Matrix (who calls whom, in-process)

| Caller ↓ / Callee → | control-plane | opportunities | products-and-offers | knowledge | evidence | research-records | market-researcher | lead-discoverer | lead-evaluator | company-intelligence | contact-discovery | inbox-intelligence | outreach-drafter | approvals | jobs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| control-plane | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| market-researcher | events | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | ✓ | — |
| lead-discoverer | events | ✓ | — | ✓ | ✓ | — | — | — | — | — | — | — | — | ✓ | — |
| lead-evaluator | events | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — |
| company-intelligence | events | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — | — | — |
| contact-discovery | events | ✓ | — | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | — | — | — | ✓ | — |
| outreach-drafter | events | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — |
| approvals | events | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| dashboard | — | — | ✓ | — | — | — | ✓ | ✓ | — | — | — | — | ✓ | — | — |

Legend: `✓` = calls the owning module's application service; `events` = emits an
event the module may subscribe to; `—` = no direct dependency.

**Key rule:** any cross-module arrow goes through a **service**, never a shared
table write. Table writes remain single-owner (`data-governance.md`).
`research_records`/`research_findings` have exactly one write-owner
(`research-records`).

## 17. `sender-profiles`

- **Status:** implemented subset (O-021 extension, 2026-09-22; structured contact
  fields 2026-09-25) — reusable sender **identities** (`sender_profiles`): label,
  sender name, optional role/title, optional company/brand, From/Reply-To,
  optional **phone**/**website**, status, and an optional **`email_account_id`**.
  Guarded CRUD (`POST/GET /sender-profiles`, `GET/PATCH /sender-profiles/:id`).
  Owns **no** transport credentials.
- **Closing rule (2026-09-25):** the generated outreach closing is composed from
  the structured fields (name, canonical role/title, company, phone/WhatsApp,
  website, email) and a closing phrase generated from the **message language**.
  Name/company/phone/website/email are never invented or translated; a canonical
  role/title is emitted **verbatim** and never machine-translated. The free-text
  `signature` is **deprecated** (not read by generation; retained for
  compatibility and hidden under an advanced override in the UI).
- **WhatsApp metadata (2026-09-25):** `whatsappEnabled` (default false) +
  optional `whatsappPhone`; the dedicated number falls back to the main `phone`
  (both preserved when they differ), and enabling WhatsApp with neither number is
  rejected (`400 whatsapp_phone_required`, checked against the merged state on
  update). When enabled the closing annotates the phone line with `· WhatsApp`.
  This is **display metadata only — never a permission to send via WhatsApp**.
- **Logo branding (2026-09-25):** optional `logoUrl` + `includeLogoInSignature`
  (default false). A small logo is included in the **HTML** signature only when
  enabled and a URL is set; the plain-text body never contains it, a URL is never
  invented, and the text contact details keep the signature usable if the image
  fails. No marketing banner field.
- **Responsibility:** own reusable, product-independent sender identities and
  reference the mailbox connection used to send on their behalf; serve the
  non-secret identity used by `outreach-drafter`.
- **Tables read/written (owner):** `sender_profiles`.
- **Events:** none in this slice.
- **Approval:** none — a normal, non-commercial configuration write.
- **Failure:** validation errors reject the command; an unknown/invalid account
  reference is rejected without creating a profile.

`products-and-offers` holds **two separate, optional** sender assignments on a
product — `products.outreach_sender_profile_id` (buyer/sales outreach) and
`products.inquiry_sender_profile_id` (market-research price inquiries / RFQ) —
each validated through this service with no silent default and no cross-context
fallback. `outreach-drafter` resolves only the **outreach** assignment, snapshots
its non-secret identity, and records the referenced `email_account_id` on each
draft (`outreach_drafts.sender_profile_id` + `sender_snapshot` +
`email_account_id`). `price-inquiry` resolves only the **inquiry** assignment.

## 18. `email-accounts`

- **Status:** implemented subset (O-022; bounded verification 2026-09-22) — the
  technical **mailbox connection** (`email_accounts`): label, account email,
  status, optional `provider`, **SMTP** and **IMAP** connection settings
  (host/port/explicit TLS/username/password) for a **password-authenticated**
  mailbox, a `credentialsShared` flag, and encrypted secrets. Guarded CRUD
  (`POST/GET /email-accounts`, `GET/PATCH /email-accounts/:id`) plus bounded
  password verification: `POST /email-accounts/:id/verify-smtp` (authenticate
  only), `POST /email-accounts/:id/verify-imap` (open INBOX; read ≤3 message
  headers), and `POST /email-accounts/:id/test-send` (exactly one message to a
  human-supplied recipient; requires `confirm: true`).
- **Responsibility:** the single owner of mailbox transport configuration and its
  write-only secrets; serve the non-secret connection reference to
  `sender-profiles` and (later) send/inbox concerns. No automated sending and no
  mailbox ingestion; the bounded verification actions are explicit operator
  commands, not a background transport.
- **Tables read/written (owner):** `email_accounts`.
- **Events:** none in this slice.
- **Approval:** none (connecting a mailbox is configuration; the test send
  requires an explicit `confirm: true` and a single human-supplied recipient).
- **Failure:** missing encryption configuration fails credential saves clearly
  (`503 secrets_key_not_configured`); validation rejects partial SMTP/IMAP
  settings; a missing stored password returns `409 mailbox_credentials_missing`;
  transport failures return a redacted `{ ok: false, detail }` with a short code.

Mailbox **monitoring** (inbound capture, reply matching, threads) is a central
concern owned by `inbox-intelligence` (§12) and driven by the `jobs` worker;
**sending** will get its own write-owner (`outreach-sender`) — neither is
implemented in this slice.

## 19. `dashboard`

- **Status:** implemented subset (O-024, 2026-09-22) — a **read-only admin
  summary** (`GET /dashboard/summary`, guarded) exposing aggregate counts for
  products, research runs, leads, and outreach drafts. Owns **no tables** and no
  domain logic.
- **Responsibility:** API **composition layer** for the admin overview. It asks
  each owning module's application service for counts, so status semantics stay
  with the owner; it never reads or writes another module's tables.
- **Tables read/written (owner):** none (aggregates via
  `products-and-offers`, `market-researcher`, `lead-discoverer`,
  `outreach-drafter` services).
- **Events:** none.
- **Approval:** none.
- **Failure:** an owner read failure surfaces as a failed summary request; the
  endpoint exposes counts only (no rows, no secrets, no mailbox credentials).
- **Metric semantics:** products `active | draft | archived | total` (lifecycle);
  research runs `total | completed`; leads = `opportunity_companies` rows; drafts
  `total | prepared | blocked`. No conversion/sends/replies/revenue metric exists
  because those capabilities are not implemented.

`dashboard` is excluded from product/business rules: it introduces no schema and
no new write path.

## 20. `price-inquiry`

- **Status:** **DECOMMISSIONED as a Market Research capability (2026-09-25).**
  The module and its controller are no longer registered in `AppModule`; its
  source and `price_inquiry_drafts` table are retained **dormant** for possible
  future sales-outreach reuse. No Market Research flow creates RFQ drafts.
  Historical: implemented subset (2026-09-22) — the first price-intelligence
  slice (persisted, reviewable RFQ drafts). The description below is historical.
- **Responsibility:** own RFQ drafts. Generate a concise English price inquiry
  from the persisted product/specification and the selected recipient + sender
  identity. **Drafting executes no transport**; a draft is sent only by the
  `quote-collection` loop through an explicit human action, which advances the
  status via this module's application service.
- **Tables read/written (owner):** `price_inquiry_drafts`. Reuses (by reference)
  `opportunities`, `opportunity_companies`, `companies`, `products`, `contacts`,
  `sender_profiles`, `email_accounts`.
- **Inputs:** lead + `productId` (+ optional `senderProfileId`, `contactId`,
  `language`); reuse: `lead-discoverer` (eligibility), `contact-discovery`
  (`selectRecipient`), `products-and-offers` (product + facts),
  `sender-profiles` (identity).
- **Sender resolution:** explicit `senderProfileId` → else the product's
  `inquirySenderProfileId` → else `409 inquiry_sender_profile_required`. The
  product's **outreach** sender is never a fallback.
- **Outputs:** `PriceInquiryDraft` (status `READY_FOR_HUMAN_REVIEW | SENT |
  REPLY_RECEIVED | QUOTE_EXTRACTED`). Status transitions are owner-only.
- **Failure:** lead rejected/stale/not-eligible → `409`; unknown product → `400`;
  sender profile (missing → `inquiry_sender_profile_required`) / disabled / not
  linked → `409`; unusable recipient →
  `400`/`409`. Only safe error codes are returned; no credentials are exposed.
- **Grounding rule:** only `CONFIRMED + OPERATIONAL` product facts are included
  (matching the Research Context rule); `PENDING`/`RESTRICTED` values never appear
  in the draft's `specificationSummary`. The first-contact **body** is short and
  human: a greeting, one sentence ("I found {product} on your website…") asking the
  current price, up to two clarifications (pricing unit and/or MOQ) only when not
  already on record, a short follow-up line, and a structured closing. It never
  numbers a procurement checklist, never pastes the full specification, and never
  asserts volume, frequency, destination, urgency, purchasing authority, or a
  representation beyond the configured sender identity.
- **Future:** normalized market price (currency/unit conversion, summary) is a
  later Price Intelligence task; the sent/reply/quote records already reference
  this draft.

## 21. `quote-collection`

- **Status:** **DECOMMISSIONED as a Market Research capability (2026-09-25).**
  The module and its controller are no longer registered; the RFQ send / reply
  scan / quote extraction / follow-up code and tables are retained **dormant** as
  generic mailbox infrastructure reusable for future sales outreach. No Market
  Research flow triggers it. Historical: implemented subset (2026-09-24) — the
  market-research supplier quote-collection loop. The description below is
  historical.
- **Responsibility:** send a reviewed RFQ from its resolved **inquiry** sender,
  persist an immutable outbound snapshot, bounded-read the inbox for replies,
  correlate a reply to its RFQ, persist it safely, and extract structured terms.
  This is **market research**, never buyer outreach. No bulk sending, no
  follow-ups, no background polling, no attachment parsing, no mail
  move/delete/mark-read.
- **Tables read/written (owner):** `quote_outbound_messages`,
  `quote_inbound_messages`, `supplier_quotes`. Reuses (by reference)
  `price_inquiry_drafts` (via `price-inquiry`), `sender_profiles`,
  `email_accounts`, `opportunities`, `opportunity_companies`, `companies`,
  `products`, `source_references`, `evidence`, `research_runs`.
- **Inputs:** lead + RFQ draft id; `email-accounts` ports for SMTP/IMAP
  (password decrypted only inside the transport boundary).
- **Send preconditions:** status `READY_FOR_HUMAN_REVIEW`, explicit
  `confirm: true`, non-stale inputs, usable recipient, ACTIVE sender profile
  linked to an ACTIVE email account, non-empty subject/body; a submitted outbound
  blocks a resend.
- **Correlation:** `In-Reply-To`/`References` against our Message-ID first;
  bounded fallback (sender + normalized subject + sent-time window) only when
  headers are absent and only when unique; ambiguous replies stay unlinked.
- **Outputs:** `QuoteOutboundMessage` (immutable), `QuoteInboundMessage`
  (idempotent per mailbox uid), `SupplierQuote` (fields with per-field
  provenance/warnings), and a derived `marketResearchState`. The inbound body is
  read by inspecting `BODYSTRUCTURE` and fetching only the concrete `text/plain`
  part (else bounded sanitized `text/html`); attachments are never fetched, and
  an unmatched message keeps bounded metadata only (no body, no evidence).
- **Failure:** not-ready/already-sent/stale/recipient/sender/account problems →
  `409`; missing subject/body → `400`; SMTP/IMAP transport failure → `502
  rfq_send_failed` / `rfq_reply_scan_failed` with a short safe code. No
  credentials are ever returned or logged.
- **Boundary:** no price normalization/comparable-price summary; extraction
  reports only what the reply states (unknowns stay null). Reply-check
  scheduling is **DB-backed** (`quote_follow_ups`, owner here): sending creates a
  schedule; a bounded, idempotent worker (env-gated in-process trigger, default
  off) claims due rows via a compare-and-swap lease and reuses the correlation +
  extraction above. Reply collection is **account-wide**: a scan matches each
  candidate against **all** sent RFQ Message-IDs for the mailbox and routes it to
  its own draft (one draft can never consume another's reply); an already-seen
  UNMATCHED row whose headers reference a known outbound is repaired in place.
  A matched reply is `REPLY_RECEIVED`; `QUOTE_EXTRACTED` requires a **usable
  price** (`priceAmount` + `currency`). Extraction ignores the quoted original. Background work only checks replies to already sent
  inquiries and never sends mail. A sent inquiry past the waiting window becomes
  `NO_RESPONSE` (not pending); records are preserved. Guarded endpoints
  `GET /opportunities/:id/quote-follow-ups`, `POST
  /opportunities/:id/quote-follow-ups/run-due`.

## 22. `research-result`

- **Status:** **RETIRED (2026-09-25).** The module was removed with the supplier
  price-inquiry decommission: its `/result` and `/finalize` endpoints no longer
  exist and its contracts are no longer exported. The `research_results` table and
  the `COMPLETED_WITH_PENDING_CLARIFICATIONS` / `NO_RESPONSE` enum values are
  retained only so historical runs (the Lithuania benchmark) still parse; nothing
  produces them for new work. Research completion is now simply the run's
  lifecycle status.

## 23. `outreach-sender`

- **Status:** implemented subset (2026-09-29) — the DB-backed send layer for
  approved outreach batches, plus a controlled **send-test preview**. Endpoints
  (guarded): `GET .../outreach-batches/:batchId/send-state`,
  `POST .../start-sending`, `.../pause`, `.../resume`, `.../run-due`,
  `.../retry-sent-copy`; and test preview `GET .../test-preview`,
  `POST .../test-preview`, `.../test-preview/retry-sent-copy`.
- **Responsibility:** send only the exact immutable approved draft snapshot
  (recipient, sender identity/account, subject, plain body, HTML body, language,
  approved version). It never regenerates content. It owns the paced queue,
  one-SMTP-per-version idempotency, and independent Sent-folder tracking.
- **Tables read/written (owner):** `outreach_outbound_messages` (production
  queue) and `outreach_test_deliveries` (test copies, kept separate). Reuses (by
  reference) `outreach_drafts`, `outreach_batches`, `email_accounts` via the
  `email-accounts` transport ports, and `outreach-drafter`'s batch/draft services
  (single-writer preserved: batch/draft writes go through `outreach-drafter`).
- **Test preview (controlled verification):** a human-triggered copy of the
  **actual prepared content** (From identity, Reply-To, subject, plain-text/HTML
  bodies, signature/logo, same MIME construction) sent to **explicitly supplied
  allowlisted test recipients only** (`OUTREACH_TEST_RECIPIENT_ALLOWLIST`, fixed
  for this verification). Only the transport `To` is overridden; non-visible
  diagnostic headers (`X-AI-SDR-Test`, `X-AI-SDR-Original-Recipient`,
  `X-AI-SDR-Draft-Id`, `X-AI-SDR-Batch-Id`) are added and the real subject is
  preserved unless an optional prefix is supplied. It never contacts the real
  draft recipient and never advances production state (no draft/batch status
  change, no production outbound row, no pacing, no outreach decision), and its
  Sent copy is appended to the same mailbox Sent folder. A test Sent-copy failure
  is recorded and never re-submits SMTP.
- **Lifecycle:** `APPROVED → QUEUED → SENDING → SENT` (+ `FAILED`, `CANCELLED`),
  with a human `paused` flag. Only an `APPROVED` batch may start; only the
  **latest** approved version per lead is queued/sent, so reopening + re-approving
  a batch never sends a superseded approved version alongside the new one.
- **Pacing:** persisted `next_eligible_at` per outbound; default 180 s per sender
  mailbox; per-batch `pacingSeconds` override. CAS lease (`locked_until`) plus
  `draft_id`/`message_id` uniqueness prevent duplicate sends across retries,
  restarts and concurrent workers. In-process trigger env-gated
  (`OUTREACH_SEND_SCHEDULER_ENABLED`, default off); manual `run-due` for testing.
- **SMTP vs Sent:** SMTP success sets `SENT` and persists the provider Message-ID
  immediately; the Sent copy is tracked separately (`PENDING | APPENDED |
  FAILED`). SMTP success + append failure remains `SENT`; Sent-copy retry calls
  only IMAP APPEND. The Sent mailbox is discovered via IMAP special-use (`\Sent`).
- **No autonomy:** nothing sends without an explicit human start action.

## 24. `outreach-results`

- **Status:** implemented subset (2026-09-30) — outreach results / campaign
  summary for completed batches. Endpoints (guarded):
  `GET .../outreach-batches/:batchId/results`,
  `POST .../results/scan`,
  `PATCH .../results/replies/:replyId`.
- **Responsibility:** ingest inbound replies to sent outreach messages, correlate
  them to the correct batch/draft/lead via `Message-ID` / `References` /
  `In-Reply-To` (with a bounded sender+subject+time-window fallback), classify
  them into a small fixed vocabulary, and expose a reviewable results summary.
- **Tables read/written (owner):** `outreach_replies`. Reads the sent outbound via
  `outreach-sender` and the batch via `outreach-drafter`; uses the
  `email-accounts` inbound port to scan a mailbox (never sends).
- **Classification (bounded, deterministic):** `INTERESTED`, `PRICE_REQUEST`,
  `MORE_INFO`, `NOT_INTERESTED`, `WRONG_CONTACT`, `OUT_OF_OFFICE`, `OTHER`.
  Positive commercial replies (`INTERESTED` / `PRICE_REQUEST` / `MORE_INFO`) set
  `HANDOFF_TO_HUMAN`; the assistant never continues the conversation. A human may
  override the classification (`classification_source = HUMAN`).
- **No autonomy:** no follow-up is ever sent; handoff is a state for a human.

## 25. `account-intelligence`

- **Status:** implemented subset (2026-09-30) — Account Intelligence / Company
  Brief for leads handed off after a positive outreach reply. Endpoints (guarded):
  `POST .../companies/:companyId/brief`, `POST .../brief/refresh`,
  `GET .../companies/:companyId/brief`,
  `POST .../brief/request-enrichment`,
  `POST /company-briefs/:briefId/enrichment` (harness submit).
- **Responsibility:** a focused dossier for **human sales preparation** on one
  company/opportunity relationship — NOT a broad market-research run. Stage 1
  compiles already-persisted intelligence; Stage 2 adds a human-requested,
  source-backed public-data enrichment submitted by the research harness.
- **Tables read/written (owner):** `company_briefs`, `company_brief_snapshots`.
  Reuses research/evidence/contact/outreach data through the owning modules'
  application services; it does not duplicate company identity records.
- **Evidence discipline:** findings are labelled `KNOWN_FACT`,
  `RECENT_ENRICHMENT` or `COMMERCIAL_HYPOTHESIS`; unknowns/questions are explicit.
  Schema refinements forbid a hypothesis in a factual section. Unavailable
  financials/headcount/decision-makers are never invented.
- **Freshness / history:** each snapshot records `preparedAt`,
  `lastRefreshedAt`, `sourceCount`. Refresh appends a new snapshot; previous
  snapshots are preserved.
- **No autonomy:** the API never crawls the web and never sends email; Stage-2
  enrichment is executed by the manager/OpenCode research harness.
