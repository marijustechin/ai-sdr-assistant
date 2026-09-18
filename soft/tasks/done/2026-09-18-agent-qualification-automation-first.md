# Task: Agent qualification + automation-first eligibility (O-020 correction)

**Status:** DONE

**Archived:** 2026-09-18

**Parent:** O-020 — Source-backed business contacts for shortlisted leads

## Objective

Product-direction correction: human shortlisting must not be a mandatory gate
before contact discovery. Implement the bounded prerequisite — **agent
qualification kept separate from operator review** — and make contact-discovery
eligibility automation-first, without overwriting human review fields.

## Files created/changed

- `packages/database/prisma/schema.prisma` — `OpportunityCompany` gains
  `agentQualificationStatus` / `agentQualificationReason` / `agentAssessedAt`;
  new enum `AgentQualificationStatus`.
- `packages/database/prisma/migrations/20260918160000_add_agent_qualification/migration.sql` (new).
- `packages/contracts/src/leads.ts` — `AgentQualificationStatusSchema`, `QualifyLeadSchema`.
- `apps/api/src/modules/lead-discoverer/**` — `LeadRecord` fields +
  `eligibleForContactDiscovery`; repository `qualifyLead`; service
  `qualifyLead` (respects human `REJECTED`); controller
  `PATCH /opportunities/:opportunityId/leads/:leadId/qualification`.
- Web: `lib/leads/{types,display}.ts`, lead detail (Agent qualification card),
  leads list (badge), review/contact copy.
- Docs: `docs/system/{architecture,decisions,project-state}.md`,
  `docs/system/research-harness/contact-discovery.md`, `ops/backlog.md`,
  `ops/current.md`; `soft/docs/{data-model,data-ownership}.md`.

## Schema/migration impact

Additive `20260918160000_add_agent_qualification` (three columns + enum).
Applied to `ai_sdr` and `ai_sdr_test_api`. Rollback: drop the three columns and
the enum. Existing rows default `NOT_ASSESSED`.

## Endpoint/contract impact

- `PATCH /opportunities/:opportunityId/leads/:leadId/qualification` (guarded).
- Contracts `QualifyLeadSchema` / `AgentQualificationStatusSchema`.
- Lead read exposes `agentQualificationStatus`, `agentQualificationReason`,
  `agentAssessedAt`, `eligibleForContactDiscovery`.

## Behaviour

- Agent qualification writes **only** the agent fields; `review_*` are untouched.
- A decision other than `NOT_ASSESSED` requires a reason (evidence-backed).
- `QUALIFIED` is refused when the operator has `REJECTED` (409
  `lead_rejected_by_operator`).
- `eligibleForContactDiscovery` = not human-rejected AND (agent-qualified OR
  human-shortlisted).

## Commands run and results

- `pnpm --dir soft db:migrate` / `db:generate` → applied/generated.
- `pnpm --dir soft --filter @ai-sdr/contracts test` → pass.
- `pnpm --dir soft --filter @ai-sdr/api test` → pass (incl. new qualification tests).
- `pnpm --dir soft --filter web test` → pass (incl. updated lead display tests).
- `pnpm --dir soft -r typecheck` / `-r lint` → clean.
- `bash scripts/verify.sh` → 60 passed, 0 failed.

## Known limitations

- Qualification criteria are documented in the harness; there is no scoring
  engine (deliberately deferred to `lead-evaluator`).
- No scheduler/background worker; the agent advances the pipeline manually in
  this slice.

## Decisions / blockers

- Recorded in `docs/system/decisions.md` (2026-09-18, automation-first).
- No blockers. Not committed/pushed (per task).
