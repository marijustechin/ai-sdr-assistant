# Task: Contact-discovery batch 1 + stale-qualification guard (O-020 correction)

**Status:** DONE

**Archived:** 2026-09-18

**Parent:** O-020 — Source-backed business contacts for shortlisted leads

## Objective

Apply the second automation-first correction — clarify approval scope and
qualification semantics, harden stale-evidence handling — and execute the first
real contact-discovery batch for the three LT/LV/EE candidates (agent-executed,
within free-tool limits).

## Files created/changed

- `apps/api/src/modules/lead-discoverer/` — `LeadRecord.agentQualificationStale`;
  eligibility requires not-stale; `qualifyLead` refuses `QUALIFIED` on a stale
  basis (`lead_claim_not_current`).
- `apps/api/test/leads-api.spec.ts` — focused stale-evidence test.
- Web: `lib/leads/types.ts`, lead detail (staleness badge + warning), leads list.
- Docs: `docs/system/architecture.md` (§2.6 approval scope),
  `docs/system/research-harness/contact-discovery.md` (semantics + stale),
  `docs/system/decisions.md`, `docs/system/project-state.md`, `ops/backlog.md`,
  `soft/docs/data-model.md`.
- Real batch data persisted through the API (qualifications + contacts; see
  `ops/current.md`); no code changes to run it.

## Endpoint/contract impact

No new endpoints. `PATCH .../leads/:leadId/qualification` now also rejects a
stale basis; the lead read exposes `agentQualificationStale`.

## Verification

- Contracts pass; API **70** (incl. the stale-evidence test); web **100**;
  `-r typecheck`/`-lint` clean; `verify.sh` 60/0.
- Real batch: 3 agents qualified, 6 contacts persisted, re-run idempotent
  (identical ids; counts 1/3/2), UTF-8 intact, contacts render on the lead
  detail pages.

## Decisions / blockers

- Approval scope corrected: routine writes (qualification, contacts, provenance,
  progress) need no per-step approval; only sending and commercial commitments
  (and business-state suggestion application) are human-gated.
- No blockers. Not committed/pushed (per task).
