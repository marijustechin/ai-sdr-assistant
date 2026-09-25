# Task: Decommission supplier price inquiry as a Market Research capability

**Status:** READY_FOR_HUMAN_REVIEW
**Completed:** 2026-09-25
**Owner:** implementation agent (`soft/AGENTS.md`)

## Objective

The Lithuania benchmark showed supplier replies reliably become sales
conversations, not research clarification. Remove supplier price inquiry from
Market Research flows/UI, strip research-result concepts that exist only to track
supplier price clarification, stop creating new inquiry drafts/follow-ups from
research, and retain the generic mailbox/reply/follow-up infrastructure for
future sales outreach. Preserve all historical records; do not drop data.

## Completion record

### What was removed

- **API:** the `research-result` module (deleted), and `price-inquiry` /
  `quote-collection` are **unregistered** from `AppModule` (no reachable
  supplier-inquiry endpoints). Their controllers no longer route.
- **Contracts:** `research-result.ts` deleted and un-exported; all
  `ResearchResult*`, `ResearchClarificationState`, `FinalizeResearchResultSchema`
  shapes gone.
- **Web UI:** the lead-page "Price inquiry (RFQ)" panel, the run-page
  `ResearchResultSummary` (pending clarifications / quotes / no-response counts,
  finalize, run-due), the product "Inquiry sender profile" selector, the
  price-inquiry / quote-collection entities and features, and
  `lib/research/result.ts`.
- **Market Research flows:** no flow creates supplier inquiry drafts, sends
  RFQs, scans for replies, or schedules follow-ups. The run page shows only
  overview, summary, offerings table, findings, details and coverage.

### What was retained / reused

- `email-accounts` (SMTP/IMAP config + encrypted secrets) stays registered and
  fully functional.
- `price-inquiry` + `quote-collection` **source and tables** are retained
  dormant: outbound Message-ID tracking, account-wide reply scanning, inbound
  matching/parsing, supplier-quote extraction, and the DB-backed follow-up
  worker (env-gated, default off) remain generic, reusable building blocks.
  Their `RunDueFollowUps` / `QuoteFollowUpStatus` schemas were re-homed into
  `quote-collection.ts` contracts (they lived in the deleted result file).
- Historical run statuses parse: `ResearchRunStatus.COMPLETED_WITH_PENDING_
  CLARIFICATIONS` and `PriceInquiryStatus.NO_RESPONSE` are kept (marked
  deprecated) so the Lithuania benchmark run still renders.
- Buyer outreach is untouched: leads, contacts, sender profiles, outreach drafts.

### Schema / models now orphaned or still shared

- **Orphaned (no active writer/reader):** `research_results`,
  `price_inquiry_drafts`, `supplier_quotes`.
- **Retained dormant / shared candidate for a future sales-outreach owner:**
  `quote_outbound_messages`, `quote_inbound_messages`, `quote_follow_ups`.
- **Unchanged, still active:** `email_accounts`, `sender_profiles`,
  `outreach_drafts`, `contacts`, companies/leads/offerings/evidence, etc.

### Migration recommendation (NOT executed)

After human approval and an export/archive of the historical rows, an additive
migration may drop `research_results`, `price_inquiry_drafts`,
`quote_outbound_messages`, `quote_inbound_messages`, `supplier_quotes` and
`quote_follow_ups` — or re-home the generic outbound/inbound/follow-up tables
under a future sales-outreach owner. **No table or row is dropped in this task.**
The `Product.inquiry_sender_profile_id` column is retained (unused by the UI) and
can be dropped in the same future migration.

### Commands run and results

- `pnpm --filter @ai-sdr/contracts test` → 12 files / **68 tests passed**.
- `pnpm --dir soft/apps/api test` → 28 files / **186 tests passed** (Postgres up),
  including the new decommissioned-endpoint 404 guard.
- `pnpm --dir soft/apps/web test` → 29 files / **166 tests passed**.
- `pnpm --dir soft/apps/web typecheck` + `lint` + `build` → clean / exit 0.
- `pnpm --dir soft/apps/api typecheck` + `lint` → clean.
- `bash soft/scripts/verify.sh` → **61 passed, 0 failed** (incl. docs check).

### New tests added

- `apps/api/test/decommissioned-market-research.spec.ts` — the removed routes
  return 404 and `email-accounts` remains routable.
- `packages/contracts/test/decommissioned-research-result.spec.ts` — the
  clarification/result schemas are no longer exported; retained run-status,
  follow-up and mailbox schemas remain.

### Known limitations

- `price-inquiry` / `quote-collection` source remains (dormant) because
  `quote-collection` depends on `price-inquiry`; a future sales-outreach task
  should refactor the generic mail/reply pieces onto its own owner before the
  supplier-specific draft model is removed.
- The generic follow-up worker no longer has a Market Research trigger; it is
  reachable only through retained code until a future UI/flow is defined.

### Decisions or blockers created

- Recorded the product decision in `docs/system/decisions.md`; absence of a
  public price stays a recorded evidence finding, never an outreach trigger.
- No blockers.
