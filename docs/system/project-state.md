# Project State (Canonical)

**Status:** Canonical, live snapshot. Last updated 2026-09-17 (**O-018
accepted** — run Summary + Back-to-top cursor + verified numeric-price backfill;
**O-017 accepted** — product-independent market research request flow, verified
end to end with a real queued run, plus explicit cost/tool permissions; and
**O-016 accepted** — research-text encoding repaired data-only, researcher UTF-8
write/read helper fixed and verified end to end). Prior 2026-09-15: **O-011
accepted**
— the first bounded research wave (LT / FI / GB), its fresh-session recovery, the
bounded claim-correction lifecycle (six replacements + three retractions
applied), the product-scoped discovery API, and the admin product-management UI
are committed, and **O-013 (read-only Research results dashboard) is accepted**
(companies/offerings-led view, evidence-linked `research_offerings` read model,
correction-consistent review flags, preserved filters, collapsed run details);
the database run remains `PAUSED` / `DIMINISHING_RETURNS` and
European market research is **not** complete. Prior 2026-09-15: O-010/T-007
research-result persistence implemented; O-009 harness archived. Earlier
2026-09-14 (O-007 closed; O-008 verified research toolchain); 2026-09-10
(O-005/T-006 documentation reconciliation).
**Companion:** `architecture.md`, `module-map.md`, `data-governance.md`,
`research-context-contract.md`, `decisions.md`.

This is a truthful snapshot of what exists, what does not, what is blocked, and
what comes next. It never contains live business values (those live only in
PostgreSQL).

---

## Implemented

| Area | Detail | Evidence |
|---|---|---|
| Repository workspace | Node 24 + pnpm 11 monorepo under `soft/` (pnpm workspaces: `apps/*`, `packages/*`) | `soft/packages/database`, `soft/apps/api`, `soft/apps/web` |
| Clean API host | NestJS 11 + Fastify, native ESM, strict TypeScript, structured pino logging, env validation (`NODE_ENV`, `PORT`) | `soft/apps/api/src` |
| Liveness endpoint | `GET /health` → `200 {"status":"ok"}` (no DB dependency) | `soft/apps/api/src/health/health.controller.ts` |
| Readiness endpoint | `GET /ready` → `200 {"status":"ready"}` via safe `SELECT 1`; non-sensitive `503 {"status":"not_ready"}` on failure | `soft/apps/api/src/health/readiness.controller.ts` |
| Central database | Local PostgreSQL 17 via project-scoped Docker Compose (host port 54329) | `soft/docker-compose.yml` |
| Prisma foundation | Prisma 7, ESM `prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`; `soft/packages/database` is the single schema/migration owner | `soft/packages/database` |
| Migrations | `20260910112935_init`, `20260910150428_research_context_fields`, `20260915075316_research_persistence`, `20260915120000_claim_corrections`, `20260915140000_research_offerings`, `20260917130000_research_requests`, `20260917160000_research_offering_price_amount`, `20260918090000_add_companies_opportunity_leads`, `20260918140000_add_contacts`, `20260918160000_add_agent_qualification`, `20260918180000_add_qualification_basis`, `20260918200000_add_outreach_drafts`, and `20260922100000_add_sender_profiles` applied; `prisma migrate status` clean | `soft/packages/database/prisma/migrations` |
| Core commercial schema | `Product`, `Offer`, `ProductFact` (CHECK-constrained), `TargetMarket`, `Opportunity` (with `contextVersion`/`objective`), `OpportunityTargetMarket`, `ResearchRun`, `ResearchRunTargetMarket`; `Product.category` | `soft/packages/database/prisma/schema.prisma` |
| Research persistence schema | `ResearchRun` (lifecycle `PAUSED` + separate `pauseReason`, JSONB `checkpoint`), `ResearchQuery` (run-scoped discovery log), `SourceReference` (deduplicated by URL), `Evidence` (`VERIFIED`/`UNVERIFIED`), `Claim` (`FACT`/`INFERENCE`/`UNKNOWN` + confidence), `ClaimEvidence` (stance-aware link) (T-007); claim correction lifecycle `ClaimLifecycleStatus` (`CURRENT`/`RETRACTED`/`REPLACED`) with `correctionReason`/`correctedAt` and a `replacedByClaimId` self-reference | `soft/packages/database/prisma/schema.prisma` |
| Shared contracts | `@ai-sdr/contracts` (Zod 4 + TypeScript) implements the canonical `research_context_v1` and the write-side input schemas, including the research contracts (`research.ts`) | `soft/packages/contracts` |
| Initial feature modules | `products-and-offers` (Product/Offer/ProductFact writes), `opportunities` (TargetMarket/Opportunity + join + context-version increments), a minimal `control-plane` (`ResearchContextService` assembly with redaction), and the T-007 `market-researcher` (run envelope + queries) and `evidence` (sources/evidence/claims) modules | `soft/apps/api/src/modules` |
| Catalogue + Research Context API | `POST /products`, `POST /products/:productId/offers`, `POST /product-facts`, `POST /target-markets`, `POST /opportunities`, `POST /opportunities/:opportunityId/target-markets`, `GET /opportunities/:opportunityId/research-context` | `soft/apps/api/src/modules` |
| Product admin + discovery API | `GET /products`, `GET /products/:productId`, `PATCH /products/:productId` (list/read/update), and product-scoped discovery `GET /products/:productId/offers`, `GET /products/:productId/opportunities` (offers → opportunities → attached target markets); shared `ProductResponseSchema`/`UpdateProductSchema` | `soft/apps/api/src/modules/products-and-offers` |
| Admin product-management UI | Next.js 16 admin app (`soft/apps/web`) implemented for product list → create → open → edit → change lifecycle, talking to the internal API server-side only (`INTERNAL_API_KEY` never exposed to the browser); deferred items documented in `soft/apps/web/docs/MISSING_API.md` | `soft/apps/web` |
| Research results dashboard (read-only) | Product → opportunities → research runs → run detail in the admin web app, leading with **companies and offerings** (structured, evidence-linked; filterable by market served, application and match class `EXACT_MATCH`/`ADJACENT`/`SUBSTITUTE`), CURRENT findings shown beside the offering they support, other current findings kept accessible, an explicit `includeHistory` correction view, coverage that explains investigated vs missing, and usage/limits/notes/discovery log behind a collapsed "Research details" control. Reads the API only; no prose parsing; no write actions. Backed by the evidence-owned `research_offerings` read model (migration `20260915140000_research_offerings`). A compact **run Summary** sits between Run overview and the offerings list: distinct identified companies (fallback: normalized `companyText`), offering counts by match type, offerings with usable prices, Lowest/Highest observed prices within comparable groups (substitutes never combined with exact matches; correction-flagged/unresolved offerings excluded with a reason), and a gaps indication from the checkpoint; `research_offerings` gained an optional `price_amount_numeric` (migration `20260917160000_research_offering_price_amount`) recorded explicitly (never parsed from prose; no conversion) | `soft/apps/web`, `soft/apps/api/src/modules/evidence` |
| Research persistence API | `POST/GET /opportunities/:id/research-runs`, `GET/PATCH .../:runId`, `POST/GET .../:runId/queries`, and `POST/GET .../:runId/sources|evidence|claims`; `POST .../claims/:claimId/corrections` with `GET .../claims?includeHistory=true`; `PATCH` pause/resume with the `CONTEXT_CHANGED` guard (T-007 + claim-correction lifecycle) | `soft/apps/api/src/modules/{market-researcher,evidence}` |
| Internal-key boundary | Every business route requires `x-internal-api-key`; constant-time check, fail-closed non-sensitive `503` when `INTERNAL_API_KEY` is unconfigured, non-sensitive `401` otherwise; key never logged or returned. `GET /health`/`GET /ready` stay public | `soft/apps/api/src/security` |
| Product-independent research request flow | Product → **Market research** → **New market research** form (countries/regions, goals, optional segments with "identify during research", questions/constraints, one bounded standard scope with expandable technical limits, review summary) → `POST /research-requests` persists validated parameters on a `QUEUED` run and shows **"Queued — waiting for researcher"**; researcher discovery/intake `GET /research-requests?status=QUEUED` / `GET /research-requests/:runId`; one-time `QUEUED → RUNNING` claim; explicit cost/tool permissions (`FREE_ONLY` default, or `METERED_APPROVED` with finite per-provider call limits) persisted with the request and enforced by a pure `checkProviderCall` helper, with resume counters in `checkpoint.providerUsage`. Reuses `Offer`/`Opportunity`/`TargetMarket`/`ResearchRun`; no parallel task framework. Migration `20260917130000_research_requests` (`request_parameters` JSONB + unique `request_key`) | `soft/apps/web`, `soft/apps/api/src/modules/control-plane`, `soft/apps/api/src/modules/market-researcher` |
| Tests | Database integration tests (isolated `ai_sdr_test`), contract tests, and API integration tests including the catalogue/research-context slice and the claim-correction lifecycle (isolated `ai_sdr_test_api`); API health/readiness/env tests still pass | `soft/packages/database/test`, `soft/packages/contracts/test`, `soft/apps/api/test` |
| Evidence-backed potential-buyer shortlist (bounded `lead-discoverer` slice) | The product **Leads** tab: a candidate (`opportunity_companies`) links an opportunity + company (`companies`) to the research evidence that supports its inclusion (`sourceReferenceId` derived + `evidenceId` mandatory, optional CURRENT `claimId`), keeps observed facts (`observedActivityText`, multi-valued `observedRoles`) separate from the buyer-fit hypothesis, records explicit unknowns/next verification step, and carries an operator `reviewStatus` (`UNREVIEWED \| SHORTLISTED \| REJECTED` + optional reason). Deduplicated per opportunity (deterministic `dedupKey` + `@@unique([opportunityId, companyId])`); a replaced/retracted supporting claim sets `needsReview` and blocks shortlisting. Guarded API `POST/GET /opportunities/:id/leads`, `GET/PATCH .../leads/:leadId`; product Leads list + detail with server-side review action. Migration `20260918090000_add_companies_opportunity_leads`. Contact discovery is the next slice. Presentation refinements (candidate-first list, collapsed no-candidate section, recorded countries shown from target-market data, explicit "View details", reframed detail labels, Review before Evidence, collapsed evidence) reviewed and accepted 2026-09-18. **Automation-first correction (2026-09-18):** operator review is an optional override, not a gate — a bounded **agent qualification** (`agentQualificationStatus` `NOT_ASSESSED | QUALIFIED | NEEDS_MORE_EVIDENCE | DISQUALIFIED` + reason, migration `20260918160000_add_agent_qualification`) is kept separate from human review and never writes `review_*`; eligibility for contact discovery = not human-rejected, not stale, AND (agent-qualified OR human-shortlisted); explicit human `REJECTED` wins; `QUALIFIED` means product-fit suitability for contact discovery (not demand/intent), and a replaced/retracted finding invalidates a prior qualification (must be reassessed). Routine writes of qualification/contacts/provenance/progress need no per-step approval | `soft/apps/api/src/modules/lead-discoverer`, `soft/apps/web`, `soft/packages/database/prisma/schema.prisma` |
| Source-backed business contacts (bounded `contact-discovery` slice) | A company contact (`contacts`) stores public business contact info (general company vs named person with a published title; email/phone/contact-page URL) with original values preserved and normalized columns used only for idempotent dedup; `contact_sources` keeps one provenance row per discovered source (source reference deduplicated by URL + retrieval date + supporting excerpt) so many sources accumulate without overwriting. Published-on-source (`NOT_VERIFIED`) is separate from `VERIFIED` deliverability; unknowns are explicit; a contact can be marked `UNUSABLE` (with a reason) retaining provenance. Contacts are independent of the completed research run (no run reopened) and reuse `companies`. Guarded API `POST/GET /companies/:id/contacts`, `PATCH /companies/:id/contacts/:contactId`; a **Contacts** section on the lead detail page with copy actions and an honest empty state. Migration `20260918140000_add_contacts`. Implementation + isolated synthetic testing only; live contact search is a later, separately authorized activity (procedure: `docs/system/research-harness/contact-discovery.md`). First real batch executed 2026-09-18 (agent-executed, free tools only): 3 candidates agent-qualified, 6 contacts persisted from official pages, idempotent. **Accepted 2026-09-18**; stale-qualification recovery is a bounded backlog item (not implemented) | `soft/apps/api/src/modules/contact-discovery`, `soft/apps/web`, `soft/packages/database/prisma/schema.prisma` |
| Evidence-backed initial outreach drafts (bounded `outreach-drafter` slice) | An initial draft (`outreach_drafts`) prepared for an **eligible** lead (not rejected, not stale, agent-qualified or human-shortlisted): selects one **usable published** recipient (prefers a purchasing-relevant published role, else the general business email), builds a concise subject/body from the Research Context + lead evidence only (one clear question; no invented prices/stock/certifications/delivery/sender/relationship), records language (context-derived) + rationale + context/evidence references, or an explicit **`BLOCKED`** outcome with precise missing fields. Append-only/versioned and idempotent; no send path. The agent qualification now snapshots its evidence/claim basis, closing the re-submission revalidation loophole (a material provenance change → stale → reassess before drafting). Guarded API `POST/GET /opportunities/:id/leads/:leadId/outreach-drafts`; a compact read-only draft section on lead detail. Migrations `20260918180000_add_qualification_basis` + `20260918200000_add_outreach_drafts`. First batch (2026-09-18, agent-executed, no new searches): 3 leads reassessed and 3 `BLOCKED` drafts persisted (missing `senderName`/`senderCompany`), idempotent | `soft/apps/api/src/modules/outreach-drafter`, `soft/apps/web`, `soft/packages/database/prisma/schema.prisma` |
| Sender identities + product assignment + drafting integration (O-021 extension) | Reusable **sender profiles** (Settings → Sender profiles): label, sender name, **optional role/title**, **optional company/brand** (usable without one), From email, optional Reply-To/signature, optional **mailbox connection** reference (`emailAccountId`). A profile carries **no** credentials. Products have an **optional** `senderProfileId` (selector on create/edit; unassigned by default, no silent default; missing/disabled state shown). Drafting resolves the assigned **active** profile identity, snapshots it (non-secret) on the draft, records the resolved `emailAccountId`, versions on identity change but not on transport/credential-only change, and never rewrites history; missing fields render as guidance with links. Guarded APIs `POST/GET /sender-profiles`, `GET/PATCH /sender-profiles/:id`. Migration `20260922100000_add_sender_profiles` (SMTP columns later moved to `email_accounts` by `20260922120000_add_email_accounts`). No transport/sending. (No real profile created; the 3 blocked drafts are preserved.) | `soft/apps/api/src/modules/sender-profiles`, `soft/apps/api/src/modules/outreach-drafter`, `soft/apps/web`, `soft/packages/database/prisma/schema.prisma` |
| Email accounts — mailbox transport split (O-022) | The technical mailbox connection is separated from the sender identity: **email accounts** (Settings → Email accounts) own **SMTP** (sending, later) and **IMAP** (monitoring, later) config (host/port/explicit TLS/username/password), optional `provider`, status, and a `credentialsShared` flag (IMAP reuses SMTP credentials; separate IMAP credentials are then rejected). Passwords are encrypted at rest (AES-256-GCM; key only in server config `EMAIL_SECRETS_KEY`) and never returned/rendered/logged — reads expose only `smtpPasswordConfigured`/`imapPasswordConfigured`; omitted password preserves, replace/clear explicit; a credential-free account needs no key. Many sender profiles may reference one account. Guarded APIs `POST/GET /email-accounts`, `GET/PATCH /email-accounts/:id`. The web form keeps the SMTP/IMAP explicit opt-in (all transport fields omitted unless enabled; autofill mitigations) and the 503 message names `EMAIL_SECRETS_KEY`. Migration `20260922120000_add_email_accounts` (additive; drops `sender_profiles.smtp_*`, adds `sender_profiles.email_account_id` + `outreach_drafts.email_account_id`; no reset, no live-profile backfill needed). No sending/monitoring/worker; live read-only smoke passed; real leads/contacts/drafts preserved | `soft/apps/api/src/modules/email-accounts`, `soft/apps/api/src/modules/sender-profiles`, `soft/apps/api/src/security/secret-box.ts`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Admin dashboard summary + branding (O-024) | The Dashboard replaces placeholder figures with **real persisted counts** from a new read-only composition module (`dashboard`, `GET /dashboard/summary`, owns no tables): **active products** (lifecycle `ACTIVE` only) with total; **research runs** total + completed; **leads** (`opportunity_companies` rows, i.e. evidence-backed candidate buyers); **outreach drafts** total with prepared/blocked. Counts come from each owning module's application service (no cross-module table access, no new schema). The admin shell uses the approved branding: the monogram replaces the placeholder "AS" square in the sidebar and mobile header (existing AI SDR Assistant / Administration text kept — the wordmark asset is retained but not wired at sidebar width), and the favicon asset is wired through Next `metadata.icons` (WebP is not a supported file-convention icon type, so the metadata API is used; the legacy placeholder `app/favicon.ico` was removed so only the approved asset is emitted). No dark mode exists in the current UI. No sending/polling metrics are shown because those capabilities do not exist. | `soft/apps/api/src/modules/dashboard`, `soft/apps/web/lib/{branding.ts,dashboard,api/dashboard.ts}`, `soft/apps/web/components/dashboard`, `soft/apps/web/app/(dashboard)/page.tsx`, `soft/apps/web/public/branding` |
| Password mailbox SMTP/IMAP verification | Password-authenticated email accounts (e.g. a hosting mailbox under our own domain) expose bounded, human-run verification: `POST /email-accounts/:id/verify-smtp` (authenticate only), `.../verify-imap` (open INBOX; read ≤3 message headers; no ingestion), and `.../test-send` (exactly one message to a single human-supplied recipient; requires `confirm: true`). Pure transport builders select host/port/explicit TLS and password auth; the stored password is decrypted only inside the API and never returned/logged, and failures carry short redacted codes. A password is required (`409 mailbox_credentials_missing` otherwise). A Microsoft OAuth2 exploration was rolled back before release; the reserved `authKind`/`EmailAuthKind` discriminator was removed (migration `20260922160000_drop_email_auth_kind`). No automated sending, polling, or live connection has been performed. | `soft/apps/api/src/modules/email-accounts`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Price inquiry (RFQ) drafts | First price-intelligence slice: a persisted, reviewable **RFQ draft** (`price_inquiry_drafts`, owner `price-inquiry`) linked to an eligible lead, product, selected published recipient, and sender identity. Generated from the persisted product row plus its `CONFIRMED + OPERATIONAL` facts only (PENDING/RESTRICTED never appear); the message is a short, natural first contact (greeting; a "found it on your website" + current-price sentence; optional pricing-unit/MOQ clarification only when not already on record; a simple follow-up; a structured closing) and asserts nothing invented. Status `READY_FOR_HUMAN_REVIEW` (no `SENT` state). Reuses outreach eligibility, the shared `ContactDiscoveryService.selectRecipient`, and sender profiles (must be ACTIVE and linked to an email account; the product's **inquiry** sender is the default; an explicit selection overrides it, and the product's outreach sender is never used). Guarded `POST/GET /opportunities/:id/leads/:leadId/price-inquiry-drafts`, `GET/PATCH .../:draftId` (editable subject/body/recipient/sender; generated original preserved). Migration `20260922180000_add_price_inquiry_drafts`. **No email sent; no transport invoked.** UI: a "Price inquiry (RFQ)" review panel on the lead detail page with an explicit "Not sent — awaiting human review" marker. | `soft/apps/api/src/modules/price-inquiry`, `soft/apps/api/src/modules/contact-discovery`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Market-research supplier quote collection | First **quote-collection** slice (module `quote-collection`), explicitly Market Research (not buyer outreach): an explicit, confirmed human **send** of a reviewed RFQ from its resolved **inquiry** sender (never the outreach sender) through the `email-accounts` SMTP port; an immutable outbound record preserving the generated Message-ID; a bounded, human-triggered IMAP reply scan (headers + plain-text body only; no delete/move/mark-read; idempotent per mailbox uid); standards-based correlation (`In-Reply-To`/`References`, bounded fallback only when unique, ambiguous replies left unlinked); the reply persisted as run evidence (`EMAIL_REPLY`); structured commercial terms extracted only where stated (unknowns null, per-field provenance + warnings); and draft-state advancement `SENT → REPLY_RECEIVED → QUOTE_EXTRACTED` via the `price-inquiry` owner. Guarded `POST .../price-inquiry-drafts/:id/send`, `.../check-replies`, `GET .../quote-collection`. Migration `20260924200000_add_quote_collection`. Inbound bodies are read from the `BODYSTRUCTURE` `text/plain` part (else bounded sanitized HTML); unmatched messages keep metadata only (no body/evidence); an inbound whose Message-ID equals an outbound Message-ID is excluded as an outgoing copy; localized reply prefixes (incl. `Ats.:`) are normalized. **No market-price summary yet; no automatic polling; no autonomous sending.** Two controlled live send/reply smokes passed (2026-09-24): body captured, header-matched, one link + one quote, structured fields extracted, API state = DB state, idempotent re-scan; both smokes used an operator-controlled recipient and are marked test-only. | `soft/apps/api/src/modules/quote-collection`, `soft/apps/api/src/modules/email-accounts`, `soft/apps/api/src/modules/price-inquiry`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Research result finalization + pending-quote follow-up scheduling | Research completion is **independent** from supplier-reply arrival: a run finalizes to `COMPLETED` or `COMPLETED_WITH_PENDING_CLARIFICATIONS` (never RUNNING solely for outstanding RFQs), with an immutable frozen result snapshot (`research_results`, owner `market-researcher`) and a live result view (counts + per-inquiry clarification state) composed by the new read-only `research-result` module. `PriceInquiryStatus` gains `NO_RESPONSE` (waiting window elapsed → not pending; records preserved). `quote-collection` owns DB-backed `quote_follow_ups` (schedule source of truth): sending schedules a check; a bounded, idempotent worker claims due rows via a CAS lease and reuses the existing IMAP correlation/extraction; an env-gated in-process trigger (default off) is only a trigger and the manual Check-for-replies action remains. Configurable calendar-hour policy (default 24h/48h/72h checks, 120h expiry). No automatic sending. Migrations `20260925120000_research_result_and_quote_follow_ups`. Live run `959edfb5` finalized `COMPLETED_WITH_PENDING_CLARIFICATIONS` (Consolva/Medžio bitės/MDS awaiting reply; follow-ups scheduled). **Correction (same day):** reply collection is account-wide (no cross-draft reply swallowing), already-seen UNMATCHED rows with a known RFQ header are repaired in place, a reply without a usable price is `REPLY_RECEIVED` (not `QUOTE_EXTRACTED`), extraction ignores our quoted original, and result counts separate pending / replies-received / usable quotes / no-response. Live reprocessing: Consolva corrected to REPLY_RECEIVED (no price), Medžio bitės reply recovered (REPLY_RECEIVED, no price), MDS still pending. | `soft/apps/api/src/modules/research-result`, `soft/apps/api/src/modules/market-researcher`, `soft/apps/api/src/modules/quote-collection`, `soft/apps/api/src/modules/price-inquiry`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Separate outreach vs inquiry sender contexts | A product carries **two independent, optional** sender assignments — `outreachSenderProfileId` (buyer/sales outreach) and `inquirySenderProfileId` (market-research price inquiries / RFQ) — with **no cross-context fallback**. The former single `products.sender_profile_id` was **renamed** to `outreach_sender_profile_id` (existing assignments preserved); the inquiry field is new and nullable. RFQ sender resolution: explicit `senderProfileId` → else the product's inquiry sender → else `409 inquiry_sender_profile_required`; the outreach sender is never used. Buyer outreach reads only the outreach sender. Product create/edit shows two clearly separate selects (Outreach / Inquiry) with helper text; both may be blank and both must reference usable active profiles. Additive migration `20260922240000_product_split_sender_profiles`. **No email sent; no transport invoked.** | `soft/apps/api/src/modules/products-and-offers`, `soft/apps/api/src/modules/outreach-drafter`, `soft/apps/api/src/modules/price-inquiry`, `soft/apps/web`, `soft/packages/contracts`, `soft/packages/database/prisma/schema.prisma` |
| Root manager workspace | Root `AGENTS.md`, `ops/` task loop, `docs/system/` canonical docs, root `.gitignore` | this repository root |
| Market researcher operating harness | Canonical instructions (entry point + lifecycle, evidence/price rules, coverage/stopping rules, persistence boundary, synthetic verification). **Instructions only** — not the `market-researcher` module and not a data store | `docs/system/research-harness/` |

The **Catalogue + Research Context API** vertical slice (O-005/T-006) is
implemented and awaiting human review: an operator enters canonical product,
offer, product-fact, target-market, and opportunity data once, and `GET
/opportunities/:id/research-context` returns the current assembled
`research_context_v1` (CONFIRMED+OPERATIONAL values, PENDING/RESTRICTED redacted,
SUPERSEDED omitted).

`soft/apps/web` is the **admin product-management UI** (product list → create →
open → edit → change lifecycle) over the internal API. It is deliberately
narrow: a specifications editor, product research status, product↔target-market
association, and `DELETE`/search/pagination are **not** implemented; the deferred
items and open questions are recorded in `soft/apps/web/docs/MISSING_API.md`.

---

## Not implemented

- Business feature modules not yet implemented: `knowledge`, `research-records`,
  `lead-evaluator`, `company-intelligence`, `approvals`, `jobs`. The
  `market-researcher`, `evidence`, `lead-discoverer`, `contact-discovery`,
  `outreach-drafter` and `sender-profiles` modules are implemented as **minimal
  subsets** (T-007: run envelope + `research_queries`; source/evidence/claim
  persistence; the evidence-backed potential-buyer shortlist — O-019;
  source-backed contacts — O-020; evidence-backed initial outreach drafts +
  reusable sender profiles — O-021).
  `lead-discoverer` has no discovery execution, scoring or contacts itself;
  `contact-discovery` has no live discovery execution or verification;
  `outreach-drafter` prepares **initial drafts only** (no sending, follow-ups or
  reply handling); `sender-profiles` stores identities/secrets only (no
  transport, no sending).
- Control-plane task routing, executions, activities, approval routing, and Task
  scope. Only the `ResearchContextService` read-model assembler exists today;
  ResearchContext `scope` is derived from the Opportunity's attached target
  markets until the Task table lands.
- Immutable Research Context snapshots (`research_contexts`): the run endpoints
  exist (T-007), but `POST .../research-runs` records the opportunity's current
  `contextVersion` **without freezing** a snapshot; `GET .../research-context`
  returns a **current assembled** context.
- `research-records` records/findings, `target_market_suggestions`,
  `clarification_requests`, and DB-backed report generation — none exist.
- `market-researcher` AI execution/orchestration and BullMQ `jobs`.
- Worker process (`soft/apps/worker`).
- Full UI surface beyond admin product management (see the implemented
  `soft/apps/web` scope above).
- Per-opportunity commercial terms (`opportunity_offers`) and fact append-only
  versioning.
- `evidence` resolution into the Research Context, so asserted facts carry
  `sourceLabel` and an empty `evidence` array; knowledge/companies/
  human-decision context sections are empty.

See `module-map.md` for the full intended module set and status markers.

---

## Blocked

- None. The repository baseline is established: the root repository exists,
  `main` tracks `origin/main`, and baseline commit
  `0c6a10103519b9065654ad4ba8e51a6aa3d2058d` was pushed; the working tree was
  clean immediately after the push. T-005 (commit/push foundation baseline) was
  attempted, blocked on the then-missing remote, and then **superseded** by the
  decision to establish this root manager workspace first; the baseline was
  completed under O-002 (see
  `ops/done/2026-09-10-commit-push-complete-project-baseline.md`). The prior
  block on a missing `origin` remote is resolved.

---

## Immediate priority (manager, O-011 accepted 2026-09-15)

Research capability and coverage are the immediate priority; product onboarding
is postponed. O-007 is **closed/archived**
(`ops/done/2026-09-14-equip-validate-research-toolchain.md`), with the manager
toolchain documented in `research-toolchain.md`; O-008 finalized that
documentation and committed it to `origin/main`.

**O-009 — the market researcher operating harness — is complete and archived**
(`ops/done/2026-09-15-market-researcher-operating-harness.md`); it created the
canonical harness under `docs/system/research-harness/`.

**O-010/T-007 — research-result persistence — is complete and committed.** It
added the `market-researcher` / `evidence` modules and the migration
`20260915075316_research_persistence`, so the harness's minimum resumable
scenario works over the API (run + queries + source/evidence/claim + checkpoint
+ pause/resume with a `CONTEXT_CHANGED` guard). The harness behavior is
reconciled with the actual schema/API in
`docs/system/research-harness/persistence-boundary.md` §4.

**O-011 — the first real resumable European research wave (LT / FI / GB) — is
accepted/closed** (`ops/done/2026-09-15-first-research-wave-lt-fi-gb.md`). It
executed the wave through the verified manager toolchain, persisted records
incrementally, demonstrated fresh-session recovery from the API alone, and added
the bounded claim-correction lifecycle (six replacements + three retractions
applied; migration `20260915120000_claim_corrections`). The database run
`ba1fcdd0-…` remains **`PAUSED` / `DIMINISHING_RETURNS`** (`contextVersion 7`)
with its checkpoint, usage counters and follow-ups unchanged. **European market
research is not complete** (FI facade dedicated product and GB sauna GB-based
cladding remain gaps; our product facts remain `UNKNOWN`). No paid call was
made; no billing change.

**O-013 — the read-only research results dashboard — is accepted**
(`ops/done/2026-09-15-research-results-dashboard.md`). It adds the evidence-owned
`research_offerings` model (migration `20260915140000_research_offerings`) with
mandatory provenance and idempotent fingerprint dedup, an offerings-led
sales-manager view with market/application/match filters and correction-consistent
review flags, and the harness requirement that future runs persist offerings via
the API. The run and its records are unchanged. **Recorded follow-up:** four
historical `research_queries` rows remain double-encoded (recoverable) and are
queued for a future bounded repair with explicit approval.

**O-016 — the research-text encoding repair — is accepted** (human-approved
2026-09-17; archived `ops/done/2026-09-17-research-text-encoding.md`). Under
explicit human authorization it repaired the damaged records, data-only: the four
double-encoded `research_queries.query_text` rows (lossless CP1252↔UTF-8 round
trip) and six `U+FFFD` fields (`source_references.title`/`publisher`,
`evidence.evidence_text` → `ė`), then the 12 high-confidence, source-verified
silent best-fit-stripped prose/quote records (4 source titles, 1 claim, 7
evidence), through the bounded, idempotent, compare-and-swap maintenance script
in the single schema owner
(`soft/packages/database/scripts/repair-research-encoding.mjs`). Exact
before/after undo data and pre-mutation dumps are kept **outside Git**
(`C:\Users\msmig\db-backups\ai-sdr\`). The 9 search queries were left ASCII (may
be intentional). No other column changed; the run remains `PAUSED` /
`DIMINISHING_RETURNS`, `contextVersion 7`, checkpoint 19 cells / 8 follow-ups,
23 queries, 29 evidence, 31 claims (22 `CURRENT`, 6 `REPLACED`, 3 `RETRACTED`),
18 offerings. **Prevention and researcher write path:** research writes now go
through the canonical helper `scripts/research/ResearchApi.psm1`
(`Write-ResearchJson`, UTF-8 **bytes** + `charset=utf-8`), with **UTF-8 input
loading required** (correct byte-sending cannot repair an already-corrupted input
string); it is verified end to end (PowerShell input → request → API → database →
API read) for Lithuanian and Finnish against an isolated database by
`scripts/research/Test-ResearchWriteEncoding.ps1`. A non-ASCII round-trip
regression test guards the persistence layer (`research-toolchain.md` §8).

**O-017 — the product-independent market research request flow — is accepted**
(archived `ops/done/2026-09-17-market-research-request-flow.md`), including a real
request → queue → researcher → persisted-results run and explicit cost/tool
permissions (`FREE_ONLY` default; `METERED_APPROVED` with finite provider call
limits). **Known limitation:** provider call limits are agent-enforced through the
harness, not by an execution engine (see below). An operator can configure a market research request
for **any** product in the dashboard and submit it; the request is persisted in
PostgreSQL as a `QUEUED` research run (validated parameters in
`research_runs.request_parameters`, idempotency `request_key`) and shown as
"Queued — waiting for researcher". The researcher discovers queued requests and
reads the persisted parameters + assembled context through the API without any
human-supplied ids, and claims a run exactly once. It reuses the existing
`Offer`/`Opportunity`/`TargetMarket`/`ResearchRun` domain (no parallel task
framework; the derived opportunity name is the product name plus a research
suffix; segments default to the explicit `UNSPECIFIED` marker when the operator
chooses "identify during research"). Abachi and Cacao beans run the same flow with
no code changes; the existing paused LT/FI/GB run and its scope are unchanged.
No background worker, scheduler, or automatic execution exists — the operator
hands the agent the prompt in `research-harness/operating-manual.md` §9. Migration
`20260917130000_research_requests`.

**O-018 — the research run Summary, Back-to-top cursor and verified numeric-price
backfill — is accepted** (archived `ops/done/2026-09-17-run-summary-and-price-amount.md`).
The run view shows a compact, whole-run **Summary** (distinct identified
companies; offering counts; "Usable prices" / "Price recorded, not structured
yet" / "No price recorded"; Lowest/Highest **observed** prices within comparable
groups, with dimensions shown beside each extreme; gaps), plus the Back-to-top
cursor/focus fix and an additive
`research_offerings.price_amount_numeric` (migration
`20260917160000_research_offering_price_amount`) populated by a bounded, verified
backfill of 10 offerings (ranges/multiple-basis prices left unstructured;
original wording/provenance preserved; no conversion). Operator acceptance covers
the **implemented research flow and Summary** — the research identifies relevant
companies and potential customers — and does **not** imply complete market
coverage. Non-blocking follow-up recorded in `ops/backlog.md` (price-grouping
robustness: display-preserving unit-label canonicalization and a canonical company
id are deferred; do not merge across unknown/materially different conditions).

**Verified operating toolchain (2026-09-14):**

- **Exa** (`websearch`) — discovery;
- **Gemini Google Search** (`gemini_gemini_chat`, grounding on) — native
  in-session grounded discovery;
- **webfetch / Firecrawl** (`firecrawl_search` / `firecrawl_scrape` /
  `firecrawl_parse`) — source retrieval and verification.

Toolchain readiness does **not** mean the European market research is complete.
The dated, non-canonical benchmark
(`docs/benchmarks/2026-09-14-research-coverage-capability-test.md`) keeps the
remaining coverage gaps visible: Germany thinly verified, France partly Belgian,
many candidates `NOT_EVALUATED`, and Exa/Gemini usage and cost not observable.
DeepSeek server-side web search was **not observed** in the tested
account/model/endpoint configuration and is **not accepted as a verified research
tool**. This is manager-environment tooling only: it does not implement
`market-researcher` and creates no business records.

---

## Next planned functional slice

**Knowledge + Approvals (human gate)** — the next functional slice after the
accepted Catalogue + Research Context API and the accepted first research wave:

- `knowledge` versioned entities (customer profiles, buyer personas, value
  propositions);
- `approvals` request/decision tables and the human gate that a fact moves
  `PENDING → CONFIRMED` through.

Ref: `module-map.md` §§4, 14; `research-context-contract.md` §10.

---

## Sequencing after the first slice (planned)

The first slice (Catalogue + Research Context API), the research-result
persistence slice (O-010/T-007), the first bounded research wave (O-011), the
claim-correction lifecycle, the product-scoped discovery API, and the admin
product-management UI are implemented and accepted. Remaining sequence:

1. Frozen `research_contexts` snapshots (so resume can read the run's frozen
   context) and wiring `priorResearchRuns` into the Research Context.
2. Knowledge + Approvals (human gate).
3. Research-records + full Market Researcher execution (+ jobs/worker).
4. Discovery & intelligence (lead-discoverer → evaluator →
   company-intelligence → contact-discovery).
5. Outreach + inbox (post-MVP).
