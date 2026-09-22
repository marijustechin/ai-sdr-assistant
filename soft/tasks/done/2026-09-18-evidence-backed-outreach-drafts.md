# Task: Evidence-backed initial outreach drafts

**Status:** DONE

**Archived:** 2026-09-18

**Parent:** O-021 — Evidence-backed initial outreach drafts

## Objective

Implement the bounded `outreach-drafter` slice: prepare and persist an initial
outreach draft for an eligible lead from supported context/evidence (or an
explicit blocked outcome), expose a read-only draft section, and close the
stale-assessment revalidation loophole. No sending.

## Files created/changed

- `packages/database/prisma/schema.prisma` — `OutreachDraft` +
  `OutreachPreparationStatus`; `agent_qualification_evidence_id` /
  `agent_qualification_claim_id` on `opportunity_companies`; back-relations.
- `packages/database/prisma/migrations/{20260918180000_add_qualification_basis,20260918200000_add_outreach_drafts}` (new).
- `packages/contracts/src/outreach.ts`, `packages/contracts/src/index.ts`.
- `apps/api/src/modules/outreach-drafter/**` (new), `apps/api/src/app.module.ts`.
- `apps/api/src/modules/lead-discoverer/**` — qualification-basis snapshot; stale
  and eligibility now account for a changed basis.
- `apps/api/test/{outreach-drafts-api.spec.ts,leads-api.spec.ts,helpers/database.ts}`,
  `packages/database/test/helpers/database.ts`,
  `packages/contracts/test/outreach-contracts.spec.ts`.
- Web: `apps/web/lib/outreach/**`, `apps/web/lib/api/outreach.ts`,
  `apps/web/components/leads/outreach-draft-list.tsx`, lead detail page.
- Docs: `soft/docs/{data-model,data-ownership}.md`.

## Schema/migration impact

Additive: qualification-basis columns; `outreach_drafts` + enum. Applied to
`ai_sdr` and `ai_sdr_test_api`; `prisma migrate status` clean. Rollback: drop the
table/enum and the two columns.

## Endpoint/contract impact

- `POST /opportunities/:opportunityId/leads/:leadId/outreach-drafts`
- `GET  /opportunities/:opportunityId/leads/:leadId/outreach-drafts`
- `GET  /opportunities/:opportunityId/leads/:leadId/outreach-drafts/:draftId`
- Contracts `PrepareOutreachDraftSchema`, `OutreachPreparationStatusSchema`.

## Behaviour

- Eligibility: not rejected, not stale (finding/qualification), agent-qualified
  or human-shortlisted.
- Recipient: one usable published contact; prefers a purchasing-relevant
  published title, else the general email; unusable contacts excluded; no
  invented responsibility.
- Content: Research Context + lead evidence only; supported claims; one clear
  question; language derived from the company country (recorded); no invented
  sender/price/stock/certification/delivery/relationship.
- Blocked outcome with precise missing fields (`senderName`, `senderCompany`,
  `offerSummary`, `offerContext`, `recipientEmail`).
- Append-only/versioned + idempotent (unique fingerprint). No send path.
- Staleness loophole closed: qualification snapshots its evidence/claim basis; a
  material provenance change (incl. re-submitting a changed claim) → stale →
  drafting blocked until reassessment.

## Commands run and results

- `pnpm --dir soft db:migrate` / `db:generate` → applied/generated.
- `pnpm --dir soft --filter @ai-sdr/contracts test` → pass.
- `pnpm --dir soft --filter @ai-sdr/api test` → **78 passed** (13 files; incl. 8
  outreach tests and the extended stale/loophole test).
- `pnpm --dir soft --filter web test` → pass (incl. outreach display tests).
- `pnpm --dir soft -r typecheck` / `-r lint` → clean.
- `bash scripts/verify.sh` → 60/0; production build → exit 0.

## First real batch (agent-executed; no new searches/paid calls)

- The three existing qualifications became stale under the new basis rule
  (pre-migration rows had no basis), so each lead was **reassessed**
  (agent-qualified; human review untouched).
- A `BLOCKED` draft was persisted for each (missing `senderName`,
  `senderCompany`), with recipient `info@…`, language `lt`/`et`/`lv`, version 1;
  re-run idempotent. Human review states preserved (MB Pirties meistrai
  `SHORTLISTED`; others `UNREVIEWED`).

## Known limitations

- No sending/transport (out of scope); no follow-ups or inbox.
- Real drafts are blocked because no sender identity exists in the system; the
  `PREPARED` path is covered by isolated tests with supplied inputs.
- The body interpolates the lead's observed-activity text as recorded (may be
  English even when the draft language is local).
- Stale-qualification *recovery* remains a bounded backlog item (no first-class
  reassessment flow); this slice only closes the silent-revalidation loophole.

## Decisions / blockers

- Recorded in `docs/system/decisions.md` (2026-09-18, initial outreach drafts).
- No blockers. Not committed/pushed (per task).
