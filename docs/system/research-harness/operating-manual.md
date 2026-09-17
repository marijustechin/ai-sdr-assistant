# Operating Manual — Research Lifecycle

**Status:** Canonical operating harness (O-009). Entry point:
[`AGENTS.md`](AGENTS.md).
**Contract:** the researcher receives only an `opportunityId` (plus a `taskId`
when one exists) and reads everything else from the Research Context
(`docs/system/research-context-contract.md`).

---

## 1. Intake through the Research Context API

1. **Receive `opportunityId`** (a UUID). Reject any attempt to supply a product
   description, spec sheet, or fact by prompt, file, or request body — the
   contract forbids it (`research-context-contract.md` §1).
2. **Read the context:** `GET /opportunities/:opportunityId/research-context`
   (implemented; requires `x-internal-api-key`).
3. **Refuse unknown versions:** if `schemaVersion` is not `research_context_v1`,
   stop and report a version mismatch — do not parse best-effort.
4. **Record the `contextVersion`** for the run. It is the revision the run was
   planned against.
5. **Resolve scope** (below) and start the coverage matrix
   (`coverage-and-stopping.md` §1).

If the read fails (404 `opportunity_not_found`, 401/503 guard failures), the run
does not start; report the failure and stop. Do not fabricate a context.

## 2. Scope resolution

- The task scope is `scope.targetMarketIds` (non-empty for a market-research
  task), optionally narrowed by `scope.country` / `scope.industry`.
- In the implemented assembler, `scope` is derived from the opportunity's
  attached target markets; the `Task` table is not implemented yet. Treat the
  context's `scope` as authoritative for this run and state which markets were
  in and out of scope.
- Never widen scope on your own initiative. A new market is a **suggestion** for
  human review, not an automatic scope change.

## 3. Handling missing information (no invention)

Every context field is one of four states. Treat each explicitly:

| Context state | Researcher treatment |
|---|---|
| `facts.confirmed[]` (CONFIRMED + OPERATIONAL) | May be asserted as fact, with its resolved evidence. |
| `facts.pending[]` (PENDING) | `UNKNOWN`. Never infer or interpolate the value. |
| `facts.restricted[]` (RESTRICTED) | `UNKNOWN`. Values are redacted and must stay unexposed. |
| `unknowns[]` / absent fields | `UNKNOWN`. |

Rules:

- A question with no CONFIRMED fact yields `UNKNOWN`, never a guess.
- Do **not** fill a missing specification from a supplier's marketing page and
  present it as our product's fact — it is a market observation, clearly
  attributed, not our fact.
- On a product-data gap that blocks the research question, file a
  **clarification request** (`research-context-contract.md` §10) rather than
  answering it. Clarification requests are proposals for the product-data owner.
- If the web cannot answer a question (access blocked, no source), record it as
  an **open gap** with the access problem named — not as a negative finding.

## 4. Research planning

Plan before querying. A plan covers, at minimum:

- **Countries and regions** in scope, including whether a language-market result
  is actually registered/serving there (do not attribute a company to a country
  it only ships to or lists for).
- **Local languages** — search in the local language, not only English
  (e.g. `de`, `fr`, `nl`, `es`, `it`, `pl`). Local-language terms surface local
  sellers that English queries miss.
- **Product synonyms and naming variants** — botanical/technical name, trade
  names, local commercial synonyms, spelling variants, and abbreviations.
- **Applications and use cases** — the end uses that drive buyers of the
  product, so discovery reaches application sellers, not only name matches.
  Keep segments distinct: **sauna/bathhouse** (core in Scandinavia and the
  Baltic region) and **exterior/facade** cladding are both researched, with
  priority adapting by country; investigate each segment's importance rather
  than assuming one dominates. Cladding is kept separate from bench/slat
  products, and thermally modified Abachi separate from untreated Abachi.
- **Supplier types** — manufacturer / producer, distributor / wholesaler,
  importer/exporter, merchant/retailer, fabricator/processor, agent.
- **Distribution channels** — direct, trade/merchant, marketplace, project
  supplier, specification channels (architects/contractors), and so on.

The plan is a starting frontier, not a fixed query list: it is revised by
findings (§5).

## 5. Iterative discovery

Discovery is a queue, not a one-shot list:

1. Seed the queue from the plan.
2. For each query, record: query text, engine, language, timestamp, result
   status, and new unique sources found.
3. A source is only a **lead** until fetched and examined. Search summaries and
   snippets are discovery, never evidence.
4. **Findings generate follow-ups.** New terminology, competitors, associations,
   directories, certifications, and named applications feed new queries. A
   conclusion "no more suppliers exist" is never drawn from one query family.
5. Track **diminishing returns** (consecutive queued queries returning zero new
   unique sources) and surface it to the stop rule
   (`coverage-and-stopping.md` §4).
6. **Chase contradictory findings** — a contradiction between sources is a
   follow-up task in its own right, not something to average away.

## 6. Tool selection and fallback

Follow `docs/system/research-toolchain.md` §5. Summary:

1. **Discovery (question, no URL)** → Exa `websearch` first; cross-check with
   `firecrawl_search` on local-language queries.
2. **Grounded discovery / corroboration** → Gemini MCP (`gemini_gemini_chat`,
   Google Search grounding on). It may suggest leads and citations, but never
   stands alone as evidence for a substantive claim.
3. **Retrieval (have a URL)** → `webfetch` first.
4. **Fallback retrieval** → `firecrawl_scrape` for JS/cookie-gated or incomplete
   pages, and `firecrawl_parse` / `firecrawl_scrape` with `parsers:["pdf"]` for
   PDFs.
5. **DeepSeek is not a search path.** Its server-side web search is not accepted
   as verified; any company or URL it produces from model knowledge is an
   unverified hypothesis, not a finding or source.

**Cost/tool permissions gate every call.** Before using a provider, check the
request's persisted permissions and limits (`checkProviderCall` in
`@ai-sdr/contracts`) and count the attempt — including retries and failures —
against any finite call limit; persist the counters in the run checkpoint. Under
`FREE_ONLY`, use only tools with an established free tier (Exa, Firecrawl) and
exclude potentially billable tools whose free usage cannot be established
(`UNKNOWN` cost is not proof of free use). Provider *permissions* are separate
from temporary provider *availability*.

Fallback when discovery or retrieval fails:

- **Grounded fallback (a valid candidate).** When the request permits it and the
  provider is available, Gemini grounded discovery followed by `webfetch`
  verification of the named pages is a valid fallback path. Redirect citations
  or an inaccurate candidate list do not by themselves establish that this path
  is unusable — verify or reject individual candidates. Pause only on an
  observed access failure, exhausted permitted options, an applicable limit, or
  the coverage rules.

- Retry a **temporary** failure (429, 5xx, timeout) at most once, then stop that
  URL and record `FETCH_FAILED`.
- Do **not** retry permanent failures (404, `LINK_ROT`, `BLOCKED`); record the
  status.
- Never substitute a snippet, a cached summary, or model knowledge for a page
  that could not be retrieved. Record the retrieval outcome (on the
  `research_queries` row and/or the checkpoint) and move on.

## 7. Source verification, deduplication, conflicting evidence, freshness

**Verification.** A substantive claim needs the **fetched original page** (or
accessible PDF), not a snippet. Record for each source: title, publisher, URL,
and source type; record the retrieval date and the `VERIFIED`/`UNVERIFIED` state
on the evidence (`evidence.retrievedAt`, `evidence.verificationStatus`). The
fetch-status vocabulary (`OK` / `FETCH_FAILED` / `LINK_ROT` / `BLOCKED`) has no
dedicated source column in T-007: record it on the `research_queries` row
(`status` / `errorCode` / `errorNote`) and/or the checkpoint. Claim type is
`FACT` / `INFERENCE` / `UNKNOWN` with `HIGH` / `MEDIUM` / `LOW` confidence (see
`evidence-and-outputs.md`).

**Deduplication.** Deduplicate sources by canonical URL. The **same URL returned
by two engines is one source**, not independent corroboration. Two pages on the
same publisher's domain are usually one organisation's self-description, not two
independent sources.

**Conflicting evidence.** When sources disagree (e.g. durability class, density,
origin), do **not** pick a winner or average. Record both observations as
separate evidence with their sources, link them to the claim with an explicit
`stance` (`SUPPORTS` / `REFUTES` / `CONTEXT`), mark the claim `INFERENCE`, and
queue a follow-up to resolve it. If unresolved, report the conflict as an open
gap. (There is no `CONFLICTED` claim type; conflict is expressed by link stance.)

**Claim corrections (use the formal mechanism).** When a persisted claim itself
is wrong, mis-stated, or superseded — rather than merely contradicted by
additional evidence — retract or replace it through
`POST .../research-runs/:runId/claims/:claimId/corrections`. Never express a
correction by appending another `INFERENCE` claim, and never delete or edit the
original. The correction lifecycle (`CURRENT` / `RETRACTED` / `REPLACED`) is
separate from `ClaimType` and from evidence verification, records `reason`,
`correctedAt`, and the `replacedByClaimId`, and preserves the original claim and
its evidence links. Current reads exclude non-`CURRENT` claims;
`GET .../claims?includeHistory=true` returns the preserved history.

**Persist offerings as you verify (required — not later in a dashboard).** When a
verified source yields an in-scope **company / product / price** observation,
persist an *offering* through `POST .../research-runs/:runId/offerings` in the
same batch: cite the `evidenceId` (and its `sourceReferenceId`) and, when one
exists, the CURRENT `claimId`. Record only values the source states — company,
location, market served, product, application, treatment, dimensions, and the
**original price wording** with currency/unit — and set the explicit enums
(`vatStatus`, `priceBasis`, `sampleKind`, `matchType`). When the source states an
**unambiguous** price — a single amount with its currency, unit and VAT basis —
also record it as `priceAmountNumeric` (keeping the verbatim `priceText`). Do
**not** put a range, a "from/around" figure, or multiple bases (e.g. per pack and
per m², or wholesale and retail) into one number; leave those unstructured and
label the ambiguity. Leave anything unstated null / `UNKNOWN`; never infer a
value. Re-imports are deduplicated by a
deterministic per-run fingerprint, so re-running is safe. **Not every finding
becomes an offering** — general market findings stay claims. The dashboard is a
read-only view of these persisted offerings; do not rely on populating it by
hand after the run.

**Write non-ASCII text through the canonical helper (required).** Persist
queries, sources, evidence, claims, and offerings with
`scripts/research/ResearchApi.psm1` (`Write-ResearchJson`) — never a raw
`Invoke-RestMethod -Body <string>`, which silently best-fit-maps non-CP1252
characters (e.g. Lithuanian `ė`) on Windows PowerShell. Keep scripts ASCII-only
and pass non-ASCII text from a UTF-8 file or as .NET strings; the helper sends
UTF-8 bytes with `charset=utf-8`. **Load that input as UTF-8 as well** — correct
byte-sending cannot repair a string already corrupted at read time (e.g.
`Get-Content` without `-Encoding`, or non-ASCII literals in a BOM-less `.ps1`).
See `research-toolchain.md` §8.

**Freshness.** Record the source's publication/update date when available and
the retrieval date always. Prefer the most recent authoritative source for a
volatile claim (price, availability, leadership). Flag stale evidence
explicitly; do not silently reuse an undated page as current. Where only a
retrieval date is known and the content date is not, say so.

## 8. Progress checkpoints, recovery, completion reporting

**Checkpoints.** At a checkpoint, persist the run id, context version, scope,
coverage matrix, and pending follow-ups through the run API (`PATCH
.../research-runs/:runId` with a `checkpoint`); sources, evidence, and claims are
persisted through their own endpoints. A checkpoint is what makes a run
resumable (`persistence-boundary.md`).

**Recovery.** To resume:
1. Reload the run (recorded `contextVersion`, `status`, `pauseReason`,
   `checkpoint`) and its persisted queries, sources, evidence, and claims through
   the API.
2. Compare the run's recorded `contextVersion` with the opportunity's current
   one. If they differ, the recorded context is stale and cannot be
   reconstructed (frozen snapshots are not yet implemented): pause with
   `pauseReason = CONTEXT_CHANGED` and require an explicit human decision — do
   **not** silently continue against the new revision
   (`persistence-boundary.md` §3).
3. Continue from the unvisited frontier and unresolved gaps.
4. Re-running must **append, not duplicate**: deduplicate sources by URL and
   claims by subject+key.

**Completion reporting.** Report against the coverage matrix, not a raw count:

- coverage matrix with explicit remaining gaps and why they remain;
- evidence with retrieval dates and verification status; claims with type and
  confidence;
- prices with original value, unit, VAT treatment, and any derivation;
- exact matches vs substitutes; seller status vs buyer suitability;
- unvisited vs rejected candidates (with rejection reason);
- suggestions and clarification requests;
- stop/pause reason;
- tool usage, with cost `UNKNOWN` where unobservable.

A run ends as `status = COMPLETED`, `FAILED`, or `CANCELLED`, or is suspended
with `status = PAUSED`. The cause of a pause is not encoded as a status value:
it carries a separate `pauseReason` (`BUDGET_EXHAUSTED`, `ACCESS_BLOCKED`,
`CONTEXT_CHANGED`, `DIMINISHING_RETURNS`, `NEEDS_HUMAN`). The run is persisted
through the API (T-007); if an output genuinely cannot be persisted, pause with
`NEEDS_HUMAN` and record the gap — never substitute Markdown.
Partial coverage is normal and is recorded as gaps in the checkpoint, not as a
separate status: publish valid findings, keep failed retrievals recorded, and
never discard validated evidence because another part failed.

## 9. Researcher intake: picking up a queued research request

An operator configures a request in the dashboard and submits it; the run is
persisted as `QUEUED` and waits. The operator then hands the agent a prompt and
supplies **no ids, descriptions, or files**:

> **Operator prompt:** "Pick up the next queued market research request and run
> it using the research harness."

The researcher's procedure:

1. **Discover.** `GET /research-requests?status=QUEUED` (internal key). Each row
   carries `runId`, `opportunityId`, `productId`, `productName`, `countries` and
   `goals` — enough to choose a request without any supplied id.
2. **Read the intake.** `GET /research-requests/:runId` returns the persisted
   `request.parameters` (countries, goals, segment policy/segments, questions,
   constraints, execution limits) and the assembled `context` (product / offer /
   opportunity / target markets + facts). Nothing is passed in a prompt or file.
3. **Claim once.** `PATCH /opportunities/:opportunityId/research-runs/:runId`
   with `{ "status": "RUNNING" }`. This is a compare-and-swap: exactly one
   attempt moves `QUEUED → RUNNING`; a loser receives `409`
   (`run_not_claimable` or `run_already_running`). Do not continue if the claim
   fails.
4. **Derive search vocabulary from context.** Build queries from
   `product.name` / `category` / `scientificName` and the recorded goals — never
   from a hardcoded product or timber/sauna vocabulary. Record each query through
   `POST .../research-runs/:runId/queries`.
5. **Persist outputs** through the run-scoped endpoints: sources, evidence,
   claims, evidence-linked offerings, and checkpoints (`PATCH .../runId` with a
   `checkpoint`). Use the canonical UTF-8 write helper
   (`scripts/research/ResearchApi.psm1`; `research-toolchain.md` §8) and load
   input as UTF-8.
6. **Stay inside the approved scope.** Countries must be within
   `parameters.countries`; effort within `parameters.limits` (queries, sources,
   runtime, countries) and free-only (`costPolicy = FREE_ONLY`). Discovered
   segments are **findings/proposals**, not approvals: record them as evidence or
   claims (and, where appropriate, offerings); never mutate target markets
   automatically (`AGENTS.md` §3). A recorded `UNSPECIFIED` segment means
   "identify during research".
7. **Finish or pause** using the normal lifecycle and completion report (§8).

There is no background worker, scheduler, or automatic execution: a request is
picked up only when the operator hands the agent the prompt above.
