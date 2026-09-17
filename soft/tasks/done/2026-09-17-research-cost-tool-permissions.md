# Task: Explicit research cost/tool permissions — DONE

**Status:** COMPLETE (implementation); O-017 remains READY_FOR_HUMAN_REVIEW. No
research calls, billing changes, commit or push.

## Objective

Add explicit, persisted research cost/tool permissions to the request flow:
`FREE_ONLY` and `METERED_APPROVED` (named providers + finite call limits), shown
in the form and review summary; execution rules counting attempted calls and
checking limits before calls with resume counters; corrected fallback guidance;
harness/doc updates. No new lifecycle framework.

## Files created/changed

- `packages/contracts/src/research-requests.ts` — `ResearchCostPolicySchema`
  (`FREE_ONLY | METERED_APPROVED`), `ResearchToolProviderSchema`,
  `MeteredProviderLimitSchema`, `FREE_TIER_PROVIDERS`,
  `POTENTIALLY_BILLABLE_PROVIDERS`, `meteredProviders` on the standard scope with
  refinements, and the pure `checkProviderCall` helper.
- `packages/contracts/src/research.ts` — optional `checkpoint.providerUsage`
  counters.
- `packages/contracts/test/research-requests.spec.ts` — serialization, provider
  permissions, call-limit and resume-counter tests.
- `apps/web/lib/research-requests/schema.ts` — cost-policy/provider options, form
  values, input mapping, `describeCostPolicy`.
- `apps/web/components/research/new-request-form.tsx` — cost/tool permission card
  (radios + per-provider finite call limits) and review-summary line.
- `apps/web/lib/research-requests/schema.test.ts` — mapper + summary tests.
- `apps/api/test/research-requests-api.spec.ts` — policy persistence + validation.
- Harness/docs: `research-harness/AGENTS.md` §3.7, `coverage-and-stopping.md`
  §5–§6, `operating-manual.md` §6, `persistence-boundary.md`;
  `docs/system/decisions.md`, `project-state.md`.

## Schema/migration impact

- None (existing JSONB request parameters + run checkpoint).

## Endpoint/contract impact

- Additive: `limits.costPolicy` gains `METERED_APPROVED`; new optional
  `limits.meteredProviders [{ provider, maxCalls }]`; new optional
  `checkpoint.providerUsage`. Existing stored requests and checkpoints remain
  valid (`FREE_ONLY`, counters optional).

## Completion record

1. **Commands.** `pnpm -r build|typecheck|lint|test` pass — **175 tests**
   (contracts 29, database 17, web 81, api 48); `bash scripts/verify.sh` **60/0**;
   `git diff --check` clean.
2. **Tests.** Policy serialization (default FREE_ONLY; METERED_APPROVED requires
   finite call limits; FREE_ONLY rejects grants); review-summary text; provider
   permissions (`checkProviderCall` excludes potentially billable tools under
   FREE_ONLY, enforces permission/limit under METERED_APPROVED, counts attempted
   calls); resume counters (`checkpoint.providerUsage`); API persistence and
   validation (400 on METERED_APPROVED without providers and on FREE_ONLY with
   providers; default remains FREE_ONLY).
3. **Execution rules.** Permissions live in the request; availability is tracked
   by counters. `checkProviderCall` is pure (permissions/limits only); attempted
   calls incl. retries/failures count; limits are checked before a call; counters
   persist in `checkpoint.providerUsage` for resume. Credit ceilings are not
   offered (post-call reporting cannot guarantee a strict ceiling); no euro cap
   is promised.
4. **Fallback guidance corrected.** Gemini-grounded discovery → `webfetch`
   verification is a valid candidate fallback when permitted and available; a
   redirect citation or inaccurate candidate list does not alone make it
   unusable. No new pause reasons.
5. **Existing records preserved.** The rough-sawn request keeps its `FREE_ONLY`
   policy (a system default) and paused state; its Gemini calls are not
   retroactively labelled free or operator-approved; research was not resumed.
6. **Limitations.** There is no execution engine; call-limit enforcement is a
   harness responsibility using `checkProviderCall` + `providerUsage`. A strict
   credit/monetary ceiling remains unenforceable with the current tools.

## Rollback

- Revert the changes; existing stored requests/checkpoints stay valid.
