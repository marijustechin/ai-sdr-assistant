# Module Map and Boundaries (Canonical)

**Status:** Canonical, live. Reconciled with implemented reality through T-004.
**Supersedes:** `docs/redesign/module-boundaries.md`.
**Companion:** `architecture.md`, `data-governance.md`, `research-context-contract.md`.

Feature modules live in `soft/apps/api/src/modules/<module>/`. Each module is
defined by responsibility, inputs, outputs, tables read, tables written, emitted
events, approval requirements, and failure behaviour. Table owners are defined
in `data-governance.md`.

> **Status note:** the first vertical slice is implemented — `products-and-offers`
> (Product/Offer/ProductFact writes), `opportunities` (TargetMarket/Opportunity
> + join + context-version increments), and a minimal `control-plane`
> (`ResearchContextService` assembly with redaction). T-007 adds a minimal
> `market-researcher` run envelope (+ `research_queries`) and the `evidence`
> source/evidence/claim store. The remaining modules are intended but not
> implemented; see `project-state.md`.

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

**Status:** implemented subset (O-021, 2026-09-18) — the **initial draft** only:
`POST/GET /opportunities/:id/leads/:leadId/outreach-drafts` persist a draft
(`PREPARED | BLOCKED`) with recipient, subject/body, language, rationale and
context/evidence references; append-only/versioned and idempotent. **No send
path** and no transport integration. Approval-gated sending, follow-ups and
reply handling remain planned.

Evidence-based drafts with full traceability. Writes `outreach_drafts` (**owner**)
and join tables. **Never sends**: a draft cannot be sent without human approval.

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

- **Status:** implemented subset (O-021 extension, 2026-09-22) — reusable sender
  **identities** (`sender_profiles`): label, sender/company, From/Reply-To,
  signature, status, and an optional **`email_account_id`**. Guarded CRUD
  (`POST/GET /sender-profiles`, `GET/PATCH /sender-profiles/:id`). Owns **no**
  transport credentials.
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

- **Status:** implemented subset (2026-09-22) — the first **price intelligence**
  slice: a persisted, reviewable **price inquiry (RFQ) draft**
  (`price_inquiry_drafts`). Guarded endpoints
  `POST/GET /opportunities/:id/leads/:leadId/price-inquiry-drafts` and
  `GET/PATCH .../price-inquiry-drafts/:id`.
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

- **Status:** implemented subset (2026-09-24) — the **Market Research supplier
  quote collection** loop: approval-gated RFQ send, bounded reply capture,
  correlation, and structured quote extraction. Guarded endpoints
  `POST .../price-inquiry-drafts/:id/send` (`{confirm:true}`),
  `POST .../price-inquiry-drafts/:id/check-replies`, and
  `GET .../quote-collection`.
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

- **Status:** implemented subset (2026-09-25) — the **publishable research
  result** and the separation of research completion from supplier-reply
  arrival. Guarded endpoints `POST
  /opportunities/:id/research-runs/:runId/finalize` (human action) and
  `GET .../result`.
- **Responsibility:** finalize a run to `COMPLETED` or
  `COMPLETED_WITH_PENDING_CLARIFICATIONS` (never keep it RUNNING solely for
  outstanding RFQs), freeze the immutable result snapshot (owner
  `market-researcher`, `research_results`), and compose the live result view
  (counts + per-inquiry clarification state) from the owning modules.
- **Tables read/written (owner):** `research_results` (owner
  `market-researcher`). Reads `research_runs`, `price_inquiry_drafts`,
  `supplier_quotes`/`quote_follow_ups` (via `quote-collection`), `evidence`,
  `research_offerings`, `opportunity_companies`.
- **Outputs:** counts (evidence/sources, current sellers, potential buyers,
  public price observations, pending clarifications, **replies received without a
  usable price**, **usable quotes received**, no-response) + per-inquiry
  `clarificationState` (`AWAITING_REPLY | REPLY_RECEIVED | QUOTE_RECEIVED |
  NO_RESPONSE`) with the follow-up status/next-check.
- **Failure:** unknown run → `404`; internal key required. No writes to another
  module's tables (finalize goes through `market-researcher`; inquiry state is
  read-only via `price-inquiry`/`quote-collection`).
- **Boundary:** a no-response is a valid final outcome; later supplier replies
  enrich the result (bump `lastEnrichedAt`); the frozen snapshot is never
  rewritten; full Price Intelligence results UI is a separate later task.
