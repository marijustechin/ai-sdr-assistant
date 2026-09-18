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
