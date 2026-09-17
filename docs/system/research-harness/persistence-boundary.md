# Persistence Boundary — Honest Mapping to the API

**Status:** Canonical operating harness (O-009). Entry point:
[`AGENTS.md`](AGENTS.md). All "state" values below were verified against
`docs/system/project-state.md`, `docs/system/module-map.md`,
`docs/system/data-governance.md`, `soft/packages/database/prisma/schema.prisma`,
and the implemented controllers on 2026-09-15.

**Update (T-007, 2026-09-15):** the first bounded slice is **implemented** — the
run envelope (with `PAUSED`/`pauseReason` and a JSONB checkpoint), a run-scoped
`research_queries` log, and the `evidence`-owned `source_references` /
`evidence` / `claims` / `claim_evidence` store, exposed through the minimal run
+ evidence API. One refinement was made: a **first-class `evidence` entity**
replaces the planned join-only `claim_sources`, so discovery, raw evidence, and
conclusions stay structurally separate and one claim can rest on many evidence
records. The capability map below now marks the delivered surfaces `impl`; §3 is
retained as the delivered slice record.

> **Reconciled (2026-09-15, T-007).** The research-result persistence
> implementation this note was waiting on has landed (see the update above).
> §3 is therefore **no longer on hold**: it is the delivered slice record, and
> its indicative schema delta is superseded by the **actual** schema and API
> recorded in §4. The behavioral rules in the rest of this directory are
> unchanged.
>
> **Principle.** Live research state belongs in PostgreSQL, reached only through
> the API. The harness must **not** create a parallel Markdown/CSV business
> database and must **not** claim a capability that is not implemented. Where an
> output cannot be persisted, the run records the gap and pauses
> (`coverage-and-stopping.md` §4).

---

## 1. Capability map

Legend: **impl** = implemented today; **planned** = intended, not implemented;
**—** = no surface exists. **Slice** marks the slice (§3, T-007): `now` =
implemented, `later` = a separate future task.

| # | Harness need | Desired surface | Table(s) (owner) | Table | API | Slice |
|---|---|---|---|---|---|---|
| I1 | `opportunityId` | caller-supplied | — | — | — | now |
| I2 | Read the Research Context | `GET /opportunities/:id/research-context` | assembles existing tables (`control-plane`) | impl | **impl** | now |
| I3 | Scope / target markets | inside the context `scope` + `targetMarkets` | `opportunity_target_markets` (`opportunities`) | impl | **impl** (derived) | now |
| I4 | Prior research runs in context | `priorResearchRuns` section | `research_runs` (`market-researcher`) | impl | **planned** (section empty) | later |
| O1 | Create / list / get a run; bind the run to a `contextVersion` | `POST`/`GET /opportunities/:id/research-runs`, `PATCH .../:runId` | `research_runs` (`market-researcher`) | impl | **impl** | now |
| O2 | Record run scope | same endpoints | `research_run_target_markets` (`market-researcher`) | impl | **impl** | now |
| O3 | Freeze the exact context per run | `research_contexts` snapshot | `research_contexts` (`control-plane`) | planned | **planned** | later |
| O4 | Record discovery/search queries | `POST .../research-runs/:runId/queries` | `research_queries` (`market-researcher`) | impl | **impl** | now |
| O5 | Persist retrieved sources | `POST .../research-runs/:runId/sources` | `source_references` (`evidence`) | impl | **impl** | now |
| O6 | Persist evidence extracted from a source | `POST .../research-runs/:runId/evidence` | `evidence` (`evidence`) | impl | **impl** | now |
| O7 | Persist typed claims linked to evidence + run | `POST .../research-runs/:runId/claims` | `claims`, `claim_evidence` (`evidence`) | impl | **impl** | now |
| O7b | Retract or replace a claim (bounded correction lifecycle; separate from claim type and evidence verification) | `POST .../research-runs/:runId/claims/:claimId/corrections`; `GET .../claims?includeHistory=true` | `claims` (`evidence`) | impl | **impl** | now |
| O7c | Persist structured, evidence-linked company offerings (explicit values, mandatory provenance, idempotent fingerprint) | `POST/GET .../research-runs/:runId/offerings` | `research_offerings` (`evidence`) | impl | **impl** | now |
| O8 | Persist research records + findings | `research-records.createRecord/addFinding` | `research_records`, `research_findings` (`research-records`) | planned | — | later |
| O9 | Target-market suggestions (human-gated) | `opportunities.createSuggestion(...)` + approvals | `target_market_suggestions` (`opportunities`) | planned | — | later |
| O10 | Clarification requests for product-data gaps | `market-researcher` service | `clarification_requests` (`market-researcher`) | planned | — | later |
| O11 | Coverage progress + pending follow-ups (checkpoint) | run `checkpoint` + `PATCH` run | `research_runs.checkpoint` (`market-researcher`) | impl | **impl** | now |
| O12 | Generated report | produced from persisted records | reads O1/O4–O7/O11 | — | **not available** | later |
| P1 | Product-fact authoring (human/trusted only) | `POST /product-facts` | `product_facts` (`products-and-offers`) | impl | **impl** — researcher **excluded** | now |

### What this means for a run today

- **Executable now:** intake (I1–I3), planning, discovery/retrieval/verification
  with the verified toolchain, **and persistence**: start a run, record queries,
  register sources, persist evidence and claims, checkpoint, and pause/resume.
- **Not executable now:** records/findings, suggestions, clarifications, frozen
  snapshots, and DB-backed report generation (I4, O3, O8–O10, O12).
- The researcher persists through the API; it must **not** file outputs into
  Markdown/CSV as if that were the business store.

---

## 2. Minimum requirements for the end-to-end scenario

The implemented slice (T-007, §3) delivers exactly this scenario:

1. **Start** a research run for an existing opportunity.
2. **Record** which research-context version the run used.
3. **Persist** a source and a supported claim linked to that run.
4. **Save a checkpoint**, including pending follow-ups and coverage progress.
5. **Pause and resume** the run in a fresh agent session through the API, with
   no reliance on conversation history or Markdown business records.

Everything else is deliberately deferred to separate bounded tasks:
`research_contexts` frozen snapshots (I4, O3), `research-records`/findings (O6),
target-market suggestions (O7), clarification requests (O8), DB-backed report
generation (O10), and `activities`/`executions`/`jobs`/worker. No generic
workflow or orchestration framework is introduced.

## 3. Delivered slice (T-007) — "Minimum resumable research run"

> **Implemented 2026-09-15 (T-007).** Delegated via `soft/tasks/current.md` and
> completed. The **actual** schema and API are recorded in §4; the proposal text
> below is retained as the delivered record. Its indicative `claim_sources`
> delta was refined into a first-class `evidence` table plus `claim_evidence`.

**Delivered task — "Minimum resumable research run": run envelope + evidence +
checkpoint.**

**Objective:** make the §2 five-step scenario work end-to-end through the API,
reusing the existing `ResearchRun` schema
(`soft/packages/database/prisma/schema.prisma`) and the canonical Research
Context contract (`docs/system/research-context-contract.md` §3 endpoints, §8
versioning) rather than redesigning them.

**Reuse (already implemented — no redesign):**

- `research_runs` / `ResearchRun`: `contextVersion`, `status`,
  `requestedAt`/`startedAt`/`finishedAt`, `errorCode`/`errorNote`.
- `research_run_target_markets` / `ResearchRunTargetMarket`: run scope.
- The existing `x-internal-api-key` guard; the catalogue and research-context
  routes as the pattern for new routes.

**Actual schema delta (migration `20260915075316_research_persistence`, owned by
`soft/packages/database`) — see §4:**

- `ResearchRun`: add `PAUSED` to `ResearchRunStatus`; add `pauseReason`
  (nullable enum), `pauseNote` (nullable), `checkpoint` (JSONB, nullable),
  `checkpointAt` (nullable). Keep `errorCode`/`errorNote` for `FAILED`.
- New `research_queries` (owner `market-researcher`).
- New `source_references`, `evidence`, `claims`, `claim_evidence` (owner
  `evidence`). `claims.researchRunId` is the "claim linked to the run"
  requirement; the first-class `evidence` entity replaces the planned
  `claim_sources` join.

**Endpoints (delivered):**

- `POST /opportunities/:id/research-runs` — create a run for the opportunity;
  capture the current `contextVersion` and the attached target markets; status
  `RUNNING`.
- `GET /opportunities/:id/research-runs` — list runs.
- `GET /opportunities/:id/research-runs/:runId` — the **resume read**: run +
  `contextVersion` + `status` + `pauseReason` + `checkpoint` + scope + queries.
- `PATCH /opportunities/:id/research-runs/:runId` — `{ status?, pauseReason?,
  pauseNote?, errorCode?, errorNote?, checkpoint?, contextVersion? }`; validates
  transitions; used to pause, resume, checkpoint, complete, and fail.
- `POST .../research-runs/:runId/queries` — record a discovery query.
- `POST .../research-runs/:runId/sources`, `.../evidence`, `.../claims`
  (evidence write); the matching `GET` routes provide the resume/report reads.
- `POST .../research-runs/:runId/claims/:claimId/corrections` — retract
  (`RETRACTION`) or replace (`REPLACEMENT`) a claim. The original claim and its
  evidence links are preserved; the correction stores `reason`, `correctedAt`,
  and (for a replacement) `replacedByClaimId`. Current reads exclude
  retracted/replaced claims; `GET .../claims?includeHistory=true` returns the
  full preserved history.

**Writer note (non-ASCII text).** The API/database/web path round-trips
non-ASCII exactly, but a manager writing through Windows PowerShell must send
the JSON as UTF-8 **bytes** with `charset=utf-8` (a .NET *string* body is
silently best-fit-mapped to Windows-1252) and must save scripts as UTF-8 **with
BOM** or keep them ASCII-only. **Use the canonical helper**
`scripts/research/ResearchApi.psm1` (`Write-ResearchJson`), verified end to end
by `scripts/research/Test-ResearchWriteEncoding.ps1` against an isolated
database. **Load non-ASCII input as UTF-8** as well (explicit UTF-8 file read or
code points): sending bytes correctly cannot repair an input string that was
already corrupted at read time. `-ExecutionPolicy Bypass` is a process-scoped
override for the documented invocation only — never change the machine/user
policy. See `research-toolchain.md` §8. Never "fix" corrupted stored text at
display time, and never blindly transcode records.

**Checkpoint payload (run-scoped progress, not a workflow engine):**

```text
{ coverage: [ { targetMarketId, dimension, status, note } ],
  pendingFollowUps: [ { kind, ref, note } ],
  notes?: string }
```

**Lifecycle status vs pause/block reason (normative — keep them separate):**

- `status` is the lifecycle phase: `QUEUED | RUNNING | PAUSED | COMPLETED |
  FAILED | CANCELLED`.
- `pauseReason` is **why a `PAUSED` run stopped**: `BUDGET_EXHAUSTED |
  ACCESS_BLOCKED | CONTEXT_CHANGED | DIMINISHING_RETURNS | NEEDS_HUMAN`. A
  reason is **never** encoded as a status.
- `FAILED` uses `errorCode`/`errorNote`; `pauseReason` is not an error.
- Resuming sets `status = RUNNING` and clears `pauseReason`/`pauseNote`.
- Partial coverage is a **checkpoint property**, not a status; do not add a
  `PARTIALLY_SUCCEEDED` value to the run enum.

**Context changes between start and resume (normative):**

- On create, `researchRun.contextVersion` = the opportunity's `contextVersion`
  at that moment (reuse the existing field — this is scenario step 2).
- On resume, compare the run's recorded `contextVersion` with the opportunity's
  current `contextVersion`:
  - **equal** → resume (`PATCH status = RUNNING`, clear `pauseReason`);
  - **different** → **do not silently rebase**. Set `status = PAUSED` and
    `pauseReason = CONTEXT_CHANGED`, and require an explicit human decision:
    start a new run, or explicitly acknowledge the change with a recording
    `PATCH` that updates the run's `contextVersion`. Because `research_contexts`
    frozen snapshots are out of scope for this slice, the original context
    cannot be reconstructed from the run.
  - Once frozen snapshots land (O3, later), resume can read the run's frozen
    version and this restriction relaxes.

**Acceptance criteria (the minimum) — all met in T-007:**

- [x] The five-step scenario passes over the API in a **fresh session**, with no
      conversation history and no Markdown/CSV business records (API integration
      test `research-api.spec.ts`).
- [x] The run records and returns the `contextVersion` it used.
- [x] A source and a supported claim persist and are readable through the run; a
      `FACT`/`INFERENCE` claim without evidence is rejected.
- [x] The checkpoint (coverage + pending follow-ups) round-trips.
- [x] `PAUSED` + `pauseReason` is distinct from `FAILED` + `errorCode`, and
      resume clears the pause reason.
- [x] A context change is detected on resume and blocked with `CONTEXT_CHANGED`.
- [x] The migration is single-owner in `soft/packages/database` and follows the
      `@owner` tags.

**Explicitly out of scope:** `research_contexts` freeze; `research-records` and
findings; target-market suggestions; clarification requests; DB-backed report
generation; `activities`/`executions`/jobs/worker; any generic workflow,
orchestration, or agent framework; any research execution; UI.

**Why this is minimal:** one run envelope, one evidence store, and one
checkpoint field — no snapshot machinery, no records/suggestions, no new
orchestration layer. `research-records`, suggestions, clarifications, and frozen
snapshots remain separate bounded tasks.

> The delivered implementation is authoritative over the indicative shapes above;
> the actual schema and API are recorded in §4.

---

## 4. Reconciliation record — resolved (T-007, 2026-09-15)

The implementation this section was waiting on has landed and is recorded in
`docs/system/decisions.md` (2026-09-15), `docs/system/data-governance.md`, and
`soft/docs/data-model.md`. The inputs the harness requested are answered below;
no further reconciliation is pending.

**Schema (actual):**

1. Tables: `research_runs`, `research_run_target_markets`, `research_queries`
   (owner `market-researcher`); `source_references`, `evidence`, `claims`,
   `claim_evidence` (owner `evidence`). There is no `claim_sources` table.
2. Migration `20260915075316_research_persistence` applied (additive); it
   extends `research_runs` and adds the tables above.
3. `ResearchRunStatus` = `QUEUED | RUNNING | PAUSED | COMPLETED | FAILED |
   CANCELLED`. Pause reason is a separate nullable enum
   `ResearchRunPauseReason` = `BUDGET_EXHAUSTED | ACCESS_BLOCKED |
   CONTEXT_CHANGED | DIMINISHING_RETURNS | NEEDS_HUMAN`; `FAILED` uses
   `errorCode`/`errorNote`. No `PARTIALLY_SUCCEEDED` status (partial coverage is
   a checkpoint property).
4. `research_runs.context_version` (int) records the context revision the run
   used.
5. Frozen `research_contexts` snapshots do **not** exist yet; resume compares
   the run's `context_version` with the opportunity's current one and blocks
   with `CONTEXT_CHANGED` unless explicitly acknowledged.
6. Checkpoint: `research_runs.checkpoint` (JSONB) + `checkpoint_at`,
   latest-only. Shape: `{ coverage: [{ targetMarketId, dimension, status,
   note? }], pendingFollowUps: [{ kind, ref, note? }], notes? }`.
7. Claim→run: `claims.research_run_id` (FK). Claim→evidence:
   `claim_evidence(claim_id, evidence_id, stance)`, compound-unique.
   Evidence→source: `evidence.source_reference_id`; source dedup by unique URL.
8. Claim typing: `claims.type` (`FACT | INFERENCE | UNKNOWN`) + `confidence`
   (`HIGH | MEDIUM | LOW`); evidence verification
   `EvidenceVerificationStatus` (`VERIFIED | UNVERIFIED`). Cross-row rules are
   service-enforced: `FACT`/`INFERENCE` need ≥1 evidence link, `UNKNOWN` carries
   none, linked evidence must belong to the same run.
9. Market observations use the generic `evidence` table for now;
   `research_records`/`research_findings` remain planned, and domain-specific
   observations (e.g. prices) are expected to reference `evidence` later.

**API / contracts:**

10. Routes as listed in §3 (create/list/get/patch run; queries; sources;
    evidence; claims plus claim corrections, with `GET` counterparts). Current
    `GET .../claims` returns only `CURRENT` claims; pass `?includeHistory=true`
    for the preserved history.
11. Shared Zod schemas live in `soft/packages/contracts/src/research.ts`
    (`CreateResearchRunSchema`, `UpdateResearchRunSchema`,
    `ResearchRunCheckpointSchema`, `RecordResearchQuerySchema`,
    `RegisterSourceSchema`, `PersistEvidenceSchema`, `PersistClaimSchema`).
12. Transitions are validated in `market-researcher`; resume clears the pause
    reason; all routes use the `x-internal-api-key` guard.
13. Context mismatch → `409 { error: 'context_changed' }`; rejected claims →
    `400`; unknown run/opportunity → `404`.
14. `priorResearchRuns` in the Research Context remains empty (not yet wired).

**Process / ownership:**

15. The work is on the current branch with no commit (per the task's no-commit
    instruction); the programmer task record is
    `soft/tasks/done/2026-09-15-research-persistence.md`.
16. Decisions recorded: `docs/system/decisions.md` 2026-09-15 (evidence model)
    and `soft/docs/decisions.md` (same, implementation-local).

Until frozen `research_contexts` snapshots land, §3's context-change rule stands.
