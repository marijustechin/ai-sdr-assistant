# O-020 — Source-backed business contacts and automation-first buyer progression

**Status:** ACCEPTED
**Type:** delegation
**Scope:** repository root (manager records) + delegated implementation in `soft/`

## Objective

Let the operator attach **public, source-backed business contacts** to the
companies behind shortlisted leads, so a shortlist can be progressed into a
reviewable contact list without inventing emails, names, titles or phone
country codes. Each contact keeps its own provenance (source URL, retrieval
date, supporting excerpt), preserves the values as published, and distinguishes
"published on the source" from "deliverability verified". One bounded,
product-independent slice; isolated synthetic testing only in this task.

## Inputs / references

- `AGENTS.md` (manager contract; §3 live state, §4 responsibilities, §6 delegation, §7 hard prohibitions)
- `docs/system/module-map.md` §§8–11 (`contact-discovery` owner of `contacts`), §16 interaction matrix
- `docs/system/data-governance.md` §2 (`contacts`, `contact_sources`), §3–§5, §7
- `docs/system/decisions.md` (O-019 bounded `lead-discoverer` slice; evidence-linked records; no CRM)
- `docs/system/research-harness/AGENTS.md` §3 (hard rules) and `evidence-and-outputs.md` §3
- Human instruction 2026-09-18 (implement the contact slice; no live searches; isolated synthetic testing only; commit the Firecrawl-auth doc separately; no commit/push of the new feature)

## Steps

- [x] Review the outstanding `research-toolchain.md` Firecrawl-auth diff and commit it separately.
- [x] Delegate one bounded implementation task to `soft/tasks/current.md`.
- [x] Programmer implements schema + API + web Contacts section and runs isolated tests.
- [x] Document the agent's contact-discovery procedure in the research harness.
- [x] Verify persistence, provenance, deduplication, unusable handling, API protection and the dashboard (honest empty state).
- [x] Apply the automation-first correction (agent-qualification prerequisite; eligibility without a human shortlist).
- [x] Human review / acceptance.

## Deliverables

- Manager: this task record; updated `docs/system/{data-governance,project-state,decisions}.md`; harness procedure `docs/system/research-harness/contact-discovery.md`.
- Delegated (in `soft/`): `contacts` + `contact_sources` tables and migration; `contact-discovery` API module; shared contact contracts; Contacts section on the lead detail page with copy actions and an honest empty state; isolated tests.
- Reported procedure for the first real contact-discovery batch (no live searches performed here).

## Acceptance criteria

- [x] Contacts store public business contact info (email, phone, contact-page URL; optional named person + published job title) linked to the correct company, distinguishing general vs named-person contacts.
- [x] Each contact has its own provenance (source URL, retrieval date, excerpt); multiple contacts and sources are supported without touching the lead's original buyer-fit evidence or reopening a completed research run.
- [x] Original values preserved; normalization only for comparison/dedup; repeated submissions idempotent; no invented email patterns, names, titles or phone country codes.
- [x] "Published on the source" is distinct from "deliverability verified"; unknowns recorded; a minimal way to mark a contact unusable while retaining provenance.
- [x] Guarded API persistence/read; lead detail shows a clear Contacts section (type, person/role when known, source, checked date) with copy actions; implementation details kept out of operator copy.
- [x] The agent contact-discovery procedure is documented (automation-first eligibility — agent-qualified, not a mandatory shortlist; official contact/team pages first; verify company identity; persist supported contacts; report gaps; separate from the completed research run; no inherited authorization for paid tools).
- [x] Isolated tests pass; `scripts/verify.sh` passes; real leads show an honest empty state (no fabricated contacts) until the authorized batch populated real, source-backed contacts.

## Out of scope

- Live contact searches, deliverability/mailbox probing, emails, calls, contact-form submissions, subscriptions, billing changes.
- Changing real lead review states; fabricating contacts to populate the UI.
- Reopening or modifying the completed run `9e4e6d02…` or its evidence/claims/offerings.
- Outreach and actual email sending (email drafting is part of the intended workflow but is **not** authorized here); any commercial commitment; no scheduler/background worker.
- `legacy/**` and `docs/redesign/**`.

## Verification

- API integration tests (isolated `ai_sdr_test_api`) for create/list/dedup/provenance/unusable/auth/unknown-company.
- Shared-contract tests; web pure-helper unit tests for the Contacts display.
- `pnpm --dir soft -r typecheck`, `pnpm --dir soft -r test`, `bash soft/scripts/verify.sh`.
- Live check: the lead detail page renders the Contacts section with a clear empty state (no fabricated data).

## Rollback/blocked conditions

- Additive migration only; rollback = drop `contact_sources`, `contacts` and the three enums (no existing table touched).
- If a required provenance/route cannot be persisted, keep the task in `soft/tasks/current.md` (blocked), do not archive.

## Completion record

- Firecrawl-auth doc reviewed and committed separately as `da6e02a`
  (`docs: record authenticated Firecrawl MCP and inferred Free-plan usage`);
  it distinguishes verified authentication from the inferred Free-plan/free-usage
  conclusion. Left unpushed (see below).
- Implementation delegated and completed in `soft/`; archived in
  `soft/tasks/done/2026-09-18-source-backed-business-contacts.md`.
- Additive migration `20260918140000_add_contacts`
  (`contacts`, `contact_sources`, `ContactType`, `ContactUsability`,
  `ContactDeliverability`), owner `contact-discovery`; `source_references` stays
  `evidence`-owned and is reused via a non-run `getOrCreateSource`.
- Endpoints: `POST/GET /companies/:id/contacts`, `PATCH
  /companies/:id/contacts/:contactId` (guarded); shared `contacts.ts` contracts.
- Lead detail **Contacts** section (type, person/role, channels, source + checked
  date, copy actions, usability control) with an honest empty state.
- Harness procedure documented: `docs/system/research-harness/contact-discovery.md`
  (linked from the harness `AGENTS.md`).
- Tests: contracts pass, API **67**, web **99**, `-r typecheck`/`lint` clean,
  `scripts/verify.sh` 60/0. Isolated synthetic data only; no live contact search.
- Live check: the lead detail renders the Contacts empty state; the real company
  has 0 contacts; unauthenticated access is 401. No real lead review state was
  changed by this task (one lead, MB Pirties meistrai, was already `SHORTLISTED`
  by the operator at 2026-09-18T10:06:51Z and is left as-is).
- Docs updated: `docs/system/{data-governance,project-state,decisions}.md`,
  `soft/docs/{data-model,data-ownership}.md`, `docs/system/research-harness/AGENTS.md`.
- Awaiting human review/acceptance. **No commit/push of the new feature.**

### First real contact-discovery batch — exact procedure

Run only after the operator authorizes live contact discovery for this activity
(no paid tool is inherited; no emails/calls/forms/probes):

1. Select a `SHORTLISTED` lead in the product Leads tab (currently
   **MB Pirties meistrai**, company `5985222d-2e22-4461-bb2d-921f5cd54b2d`).
2. Open the company's official website; inspect its contact / impressum / team
   pages first, in the local language. Verify the legal identity matches the
   lead's company (name, address, registration/VAT where shown).
3. Persist each supported contact via
   `POST /companies/:companyId/contacts` with:
   `contactType` (`GENERAL_COMPANY` | `NAMED_PERSON`), the published
   `email`/`phone`/`contactPageUrl`, and for a person `personName` +
   `personJobTitle` **only if the page publishes the title**; plus `source`
   `{ url, title?, publisher?, retrievedAt, excerptText }`.
4. Record `unknownsText` where something is not established (e.g. no named
   contact, purchasing role unknown); leave absent fields absent.
5. Do not mark deliverability `VERIFIED` without a separate, recorded check;
   `NOT_VERIFIED` stays the default.
6. If a value is later found incorrect/outdated, `PATCH` it `UNUSABLE` with a
   reason (keep provenance) instead of deleting it.
7. Report gaps (no contact page, form-only, blocked/login-walled, unverifiable
   identity). Do not reopen run `9e4e6d02…` or attach anything to it.

### Correction (2026-09-18) — automation-first direction

- Human shortlisting is **not** a mandatory gate. Added the bounded **agent
  qualification** prerequisite (migration `20260918160000_add_agent_qualification`):
  `agentQualificationStatus`
  (`NOT_ASSESSED | QUALIFIED | NEEDS_MORE_EVIDENCE | DISQUALIFIED`) +
  `agentQualificationReason`/`agentAssessedAt`, kept **separate** from operator
  review (`review_*` are never written by qualification).
- Endpoint `PATCH /opportunities/:opportunityId/leads/:leadId/qualification`
  (guarded); refuses `QUALIFIED` when the operator has `REJECTED` (409
  `lead_rejected_by_operator`). The lead read now exposes
  `eligibleForContactDiscovery` (= not human-rejected AND (agent-qualified OR
  human-shortlisted)).
- Contact-discovery eligibility no longer requires a human shortlist; the harness
  procedure documents evidence-backed agent criteria and that human review is an
  optional override.
- UI: agent qualification + eligibility are shown for inspection/debugging, and
  contact copy no longer implies shortlisting is required.
- Direction recorded in `docs/system/architecture.md` §2.6, `ops/backlog.md`,
  `docs/system/decisions.md`, `docs/system/project-state.md`.
- Programmer archive:
  `soft/tasks/done/2026-09-18-agent-qualification-automation-first.md`.

### Second correction + first real contact-discovery batch (2026-09-18)

- **Approval scope corrected:** routine writes inside an approved task —
  qualification, contacts, provenance, progress/checkpoints — are normal API
  writes and need **no per-step human approval**. Only **sending any message**
  and **making a commercial commitment** are human-gated (plus applying research
  suggestions as business state). Recorded in `architecture.md` §2.6, harness
  procedure, decisions and backlog.
- **Qualification semantics clarified:** `QUALIFIED` = suitable for contact
  discovery for this specific product based on CURRENT product-fit evidence; it
  does **not** mean confirmed demand, purchasing intent, or a customer, and a
  generic trade role alone is insufficient.
- **Stale-evidence guard added:** a replaced/retracted supporting finding sets
  `agentQualificationStale`, removes contact-discovery eligibility, and blocks
  re-qualification until reassessed; human rejection and correction safeguards
  preserved. Focused API test added.
- **Batch executed** (agent-executed progression, **not** an unattended
  background pipeline — no scheduler/worker exists). Free tools only; usage
  recorded separately from the completed research run:
  - Retrieval attempts: **3** (`webfetch`, official pages; 0 failures/retries).
    Discovery searches: **0** (no Search/Scrape needed). No paid tool used.
  - Agent qualification (agent fields only; human `review_*` untouched):
    MB Pirties meistrai QUALIFIED; After 7 OÜ QUALIFIED; SIA E`VITA QUALIFIED —
    each with a product-fit rationale citing its CURRENT evidence.
  - Contacts persisted (published-as-is; source URL + retrieval date + excerpt;
    deliverability `NOT_VERIFIED`): MB Pirties meistrai 1 general
    (info@pirtiesmeistrai.lt / +370 601 85182 / contact page); After 7 OÜ 1
    general + 2 named (Mart Kallis, Margus Kaasik); SIA E`VITA 1 general
    (info@svetnica.lv / +371 27097411) + 1 named (Jānis Maurmanis).
  - Idempotent: re-run produced identical ids and unchanged counts (1/3/2).
  - Dashboard: all three lead detail pages show "Agent-qualified", "Eligible for
    contact discovery" and their contacts.
  - Remaining unknowns recorded: no published job titles/purchasing roles for
    the named people; no dedicated contact page for svetnica.lv; deliverability
    not checked; no purchasing intent established.
- Programmer archive:
  `soft/tasks/done/2026-09-18-contact-discovery-batch-1-and-stale-guard.md`.

### Acceptance record (2026-09-18)

O-020 is **accepted**. Confirmed:

- **Agent qualification is separate from human review:** `agentQualificationStatus`
  + `agentQualificationReason`/`agentAssessedAt`; qualifying never writes
  `review_*`.
- **No mandatory human-shortlisting gate:** contact-discovery eligibility = not
  human-rejected, not stale, AND (agent-qualified OR human-shortlisted); an
  explicit human `REJECTED` always wins.
- **Three candidates assessed; six source-backed contacts persisted** (MB
  Pirties meistrai 1; After 7 OÜ 3; SIA E`VITA 2), each with source URL +
  retrieval date + excerpt.
- **Repeated persistence creates no duplicates** (re-run produced identical
  contact ids; counts unchanged 1/3/2).
- **Contacts are published, not deliverability-verified**
  (`deliverabilityStatus = NOT_VERIFIED`; unknowns recorded).
- **Progression is agent-executed;** unattended orchestration (worker/jobs)
  remains planned.
- **Stale-qualification recovery is documented as a current limitation** with a
  bounded backlog item (`ops/backlog.md` item 8,
  `docs/system/research-harness/contact-discovery.md` §7); a first-class
  recovery/reassessment flow is **not** claimed as implemented.

Verification for the final changes:

- **Production build** `pnpm --dir soft build` → exit 0 (contracts, database,
  api, web; the web route `/products/[id]/leads/[opportunityId]/[leadId]` is
  built).
- Tests (reused, unchanged): contracts pass, API **70**, web **100**; `-r
  typecheck`/`lint` clean; `scripts/verify.sh` **60/0**.
- **Backup/restore:** `C:\Users\msmig\db-backups\ai-sdr\ai_sdr-20260918-135602-o20-final.dump`
  (122,413 bytes; sha256 `87CF4AEC5EF099136F4DAE322CEA9D49A65D1BC5FF411D3D5BBAD7F7982E1D1D`)
  restored into disposable `ai_sdr_o20_restore`: 3 companies / 3 leads / 6
  contacts / 6 contact_sources; qualification fields, contact records and their
  source links present; review states preserved (MB Pirties meistrai
  `SHORTLISTED`, others `UNREVIEWED`). Disposable DB dropped.
