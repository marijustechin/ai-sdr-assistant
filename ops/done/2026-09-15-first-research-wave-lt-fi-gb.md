# O-011 — First real resumable European research wave (LT / FI / GB)

**Status:** READY_FOR_HUMAN_REVIEW (batch A + fresh-session batch B complete; research run paused)
**Type:** intake (research execution via the verified manager toolchain and the
business API) + direction
**Scope:** root manager research harness, canonical docs/`ops/`, and business
records created only through the existing application API. No `soft/**` code
changes.

## Objective

Execute the first **resumable** research wave for product
`877b9a52-6b4b-43ca-bf24-63bd7f523596`, covering the approved scope — Lithuania
(LT), Finland (FI), and the United Kingdom (GB) — with two distinct core segments
in each country: **sauna/bathhouse cladding** and **exterior/facade cladding**
suppliers, manufacturers and distributors.

Persist queries, sources, evidence, claims and checkpoints **incrementally**
through the API, then persist a checkpoint and pause so a fresh agent session can
retrieve and resume the **same run**. This is the first wave of European
research — **not** a claim of complete European coverage, and not completion of
the market research.

## Inputs / references

- root `AGENTS.md` §3, §5–§7, §9; `soft/AGENTS.md` (boundaries only)
- `docs/system/research-harness/AGENTS.md` and its supporting files
  (`operating-manual.md`, `evidence-and-outputs.md`, `coverage-and-stopping.md`,
  `persistence-boundary.md`, `verification-walkthrough.md`)
- `docs/system/research-toolchain.md`; `docs/system/research-context-contract.md`;
  `docs/system/data-governance.md`
- `ops/done/2026-09-15-research-persistence-and-product-discovery.md` (approved
  persistence + discovery foundation)
- Human authorization (2026-09-15): business-record setup, budget, and wave scope
  as stated in this task.

## Steps

1. Re-read product, offers and opportunities through the API; reuse matching
   records.
2. Create the minimal DRAFT offer `Thermo Abachi Cladding` if absent.
3. Create a clearly named research opportunity; attach the approved LT/FI/GB ×
   segment scope through the API.
4. Read the assembled Research Context **before** creating the run.
5. Create the run (bound to the context version) and execute the wave with the
   verified native Exa / Gemini / Firecrawl / webfetch capabilities, using
   local-language queries and treating historical benchmark companies as leads.
6. Persist each query, source, evidence, claim and checkpoint incrementally; keep
   unvisited candidates and pending follow-ups in the checkpoint.
7. Persist a checkpoint and pause after a meaningful first batch.
8. Report the run id, saved-record counts, strongest sourced findings, coverage
   gaps, and next queued actions. Do not claim fresh-session acceptance; do not
   mark the research complete.

## Deliverables

- Business records via the API: offer (if created), opportunity, target markets,
  research run, queries, sources, evidence, claims, checkpoint.
- `ops/current.md` (this task) + `ops/backlog.md` updates; canonical docs if a
  consequential correction is required (e.g. `project-state.md`, a benchmark/
  wave record under `docs/`).

## Budget (hard)

- ≤ **30** discovery tool calls combined across providers (Exa, Firecrawl search,
  Gemini chat). Retries count.
- ≤ **50** page/PDF retrieval calls (webfetch, Firecrawl scrape/parse). Retries
  count.
- No recursive bulk crawls, separate deep-research jobs, new subscriptions,
  credit purchases, or billing changes.
- Record observed usage; unknown monetary cost stays `UNKNOWN`.

## Acceptance criteria

- [ ] Offer / opportunity / target markets exist (created or reused) and the
      Research Context was read before the run.
- [ ] Run created and bound to the context version; scope non-empty.
- [ ] Queries, sources, evidence, claims and a checkpoint persisted through the
      API; unvisited candidates and follow-ups recorded in the checkpoint.
- [ ] Run is `PAUSED` (not `COMPLETED`); resume is possible from the API alone.
- [ ] Budget respected; observed usage reported; cost `UNKNOWN` where
      unobservable.
- [ ] Public list prices kept separate from B2B prices and unknown units; product
      form and treatment verified before counting an exact match.
- [ ] No invented specifications/prices/stock/certifications/suitability; our
      unconfirmed specifications remain `UNKNOWN`.
- [ ] No commit or push; unrelated dashboard changes untouched.

## Out of scope

- Completing European coverage; any `soft/**` code change; outreach; commercial
  commitments; commit/push; unrelated dashboard (`soft/apps/web/**`) changes.

## Verification

- API reads of the run, queries, sources, evidence, claims and checkpoint.
- Usage accounting against the budget.

## Rollback/blocked conditions

- No schema or `soft/**` change to roll back. A blocked site pauses that coverage
  area only, not the run; the run pauses at a checkpoint, never silently.

## Completion record — batch A (2026-09-15)

**Status:** READY_FOR_HUMAN_REVIEW. Not archived (the research run is paused and
resumable). No commit or push.

1. **Business records created through the API** (re-use checked first; no
   duplicates):
   - offer `0871f2e4-0278-445c-8892-b3c3977f6f14` — `Thermo Abachi Cladding`
     (DRAFT) on product `877b9a52-6b4b-43ca-bf24-63bd7f523596`;
   - six target markets — LT/FI/GB × `sauna/bathhouse cladding` and
     `exterior/facade cladding`;
   - opportunity `9c5d94d6-b9fe-4e8d-a0bb-b41eeb9e2627` —
     `Thermo Abachi Cladding - European wave 1 (LT/FI/GB)`, all six markets
     attached;
   - Research Context read **before** the run (schemaVersion
     `research_context_v1`, contextVersion `7`, 0 confirmed/pending/restricted
     facts, 0 unknowns, scope = 6 markets);
   - run `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1`, contextVersion `7`.
2. **Research records persisted incrementally via the API:** 7 discovery
   queries (6 Exa + 1 Gemini), 8 sources, 8 verified evidence rows, 7 claims
   (4 FACT, 1 INFERENCE, 2 UNKNOWN), a checkpoint with 15 coverage cells and 9
   pending follow-ups. Verified by re-reading the run: status `PAUSED`,
   `pauseReason = NEEDS_HUMAN`.
3. **Budget:** discovery 7 / 30; retrieval 12 / 50 (8 pages retrieved; 3
   `webfetch` 403/404, of which 1 recovered via Firecrawl fallback). Firecrawl
   credits observed: 2; Exa and Gemini monetary cost **UNKNOWN**. No recursive
   crawls, deep-research jobs, subscriptions, credit purchases, or billing
   changes.
4. **Strongest sourced findings (all from fetched pages; public list prices kept
   separate from B2B and unknown units; never normalised):**
   - **GB exterior/facade is well covered.** Six verified sellers of Thermo
     Ayous cladding: Premier Forest Products (Class 2, 430 kg/m³, 4–7% MC),
     Southgate Timber (from ~£61.51/m²), Eva Timber (Class 1, imports from its
     Estonia facility), James E. Hatch & Son (Class 1, ~390 kg/m³, FSC),
     Linwood Timber (£12.00/linear m + VAT), Kebur Garden Materials
     (£11.80/linear m, 18×144 mm shadow gap).
   - **FI sauna/bathhouse covered:** Thermo Abachi (Abura, *Triplochiton
     scleroxylon*) sauna cladding on saunaabc.com/baltic/fi — manufacturer
     Thermory AS (EE), supplier Intercom Group OÜ (EE), treatment up to 240 °C;
     observed price was a 300 mm sample (€3.91 incl. 21% VAT), not a cladding
     price.
   - **LT exterior/facade partially covered:** Consolva UAB (Kaunas) lists a
     thermally modified Ayous facade cladding product.
   - **Conflicting evidence recorded, not averaged:** durability Class 1 vs
     Class 2 and density ~390 vs ~430 kg/m³ disagree across GB sources.
   - **Our product remains UNKNOWN:** no confirmed ProductFacts; explicit
     `UNKNOWN` claims state that suitability for facade and for sauna is not
     established by supplier descriptions of *their* products.
5. **Coverage gaps (in the checkpoint):** FI exterior/facade (no FI-based
   thermo-Abachi/Ayous facade seller verified); GB sauna/bathhouse (no GB
   thermo-Abachi sauna-cladding seller verified); LT sauna (MatoSauna URL now
   404; pirtele.lt and SaunaBee snippet-only/unfetched); LT/FI prices largely
   GAP.
6. **Next queued actions (in the checkpoint):** re-find MatoSauna's current
   product URL; fetch pirtele.lt and Marronwood (verify thermo treatment);
   verify the Gemini lead companies on their own pages (Vincent, Benchmark,
   Woodstock, Egerton's, UK Timber Cladding; HJT-Holz, SWM-Wood; Ara-Sauna,
   Woodline); target the FI-facade and GB-sauna gaps.
7. **Known limitations / notes:** no app process was launched this step (the
   already-running API on `:3003` was used read/write; the staged Node v24.20.0
   remains the compliant runtime if one is launched). `priorResearchRuns` and
   frozen `research_contexts` snapshots remain unimplemented, so a context change
   would block resume with `CONTEXT_CHANGED`. Fresh-session acceptance of this
   run has **not** been performed and is **not** claimed; the overall market
    research is **not** complete. `soft/**` and the unrelated dashboard changes
    were not touched; nothing committed or pushed.

## Completion record — batch B, fresh session (2026-09-15)

**Status:** READY_FOR_HUMAN_REVIEW. Run remains `PAUSED` / `NEEDS_HUMAN`; not
archived. No commit or push.

1. **Fresh-session recovery (API only).** State was rebuilt exclusively from
   persisted records: the opportunity via the product-scoped route
   `GET /products/877b9a52-…/opportunities` (one opportunity, six ACTIVE target
   markets), the Research Context (`research_context_v1`, contextVersion `7`),
   and run `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1` (PAUSED / NEEDS_HUMAN). The
   run's recorded `contextVersion` equalled the current `7`, so the existing
   guard allowed resume; `PATCH {status: RUNNING}` cleared the pause. No new
   opportunity or run was created.
2. **Batch A reclassification (corrections appended, originals preserved).**
   The API has no claim/evidence update or delete, so corrections are new
   `INFERENCE` claims that cite the original evidence via `CONTEXT` links
   (ids `bd8c6cab…`, `2a6813fd…`, `8435a851…`):
   - batch-A `541dbb6a…` narrowed: the evidence supports GB sales of
     **thermo-Ayous (Triplochiton scleroxylon)**, not a conflated
     "Ayous = Abachi" exact-match;
   - batch-A `035cb1ed…` corrected: the saunaabc sauna product is labelled
     inconsistently ("THERMO ABACHI" vs "Material: Thermo-Abura (Triplochiton
     scleroxylon)"; Abura is normally *Mitragyna ciliata*), so its species
     identity is **UNRESOLVED** and its €3.91 price is a 300 mm **sample**, not
     a cladding price; a Finnish-language/baltic variant page does not by
     itself prove Finnish market service;
   - batch-A `396492bd…` corrected: Class 1 vs 2 and ~390/430 kg/m³ are
     **product-specific** values for different suppliers' products, not a
     contradiction of the same product under comparable conditions.
   - **Limitation reported (not silently overwritten):** no API mechanism can
     mutate or retract a claim/evidence row; the original rows remain and the
     coverage matrix carries the corrected status.
3. **New sourced findings (wave 1, all from fetched pages, 2026-09-15).**
   - **LT sauna/bathhouse now covered incl. full-product prices:** Pirtele.lt
     (UAB Pirtelė) STS 18x140 mm A-grade at **69.00 €/m²** (Vilnius/Kaunas
     stores); MatoSauna 18x140 mm 3D boards **18.26 €–35.93 €/board** (1550–3050
     mm). Untreated Abachi (Vilniaus Medienos Centras, 46.79–52.00 €/m²) is
     adjacent, not an exact match.
   - **FI full-product prices (separate from the batch-A sample):** PK-Puu
     Thermo Royal "Apachi" STS3 panels **9.99 € (18x140)**, **12.99 € (18x190)**,
     **24.90 € (18x300, from 29.90 €)** per piece; VAT not stated. FI supply
     chain confirmed across ≥4 organisations: Marron Wood Oy (Lahti; import +
     "Thermo Royal"), PK-Puu, Puutoimi Oy (Ylöjärvi), and manufacturer
     Kymifloor / PR Wood Oy (Strömfors, Loviisa).
   - **GB facade broadened:** Coyletimber (£7.00/m ex VAT) and The Timber Group
     (20x144 mm T&G/Shadow Gap £8.45 ex VAT / £10.14 inc VAT per m) added to the
     six batch-A sellers.
   - **GB sauna:** no GB thermo-Abachi sauna **cladding** seller found; Sauna
     Direct (sauna-timber.co.uk) sells thermo-Abachi **bench slats** only
     (adjacent); thermo-aspen cladding is the substitute. **FI facade:** no
     FI-based thermo-abachi/Ayous facade seller found; FI exterior results were
     thermo pine/spruce (substitutes). Both remain **GAP**.
4. **Persistence (all via API):** +13 evidence (10 wave-1 + 3 wave-2), +13 claims
   (8 wave-1 + 2 wave-2 + 3 corrections), 11 discovery queries. Totals now:
   **20 sources, 21 evidence, 20 claims, 18 queries**; checkpoint **18 coverage
   cells** (all six approved areas present) and **11 pending follow-ups**.
5. **Budget (cumulative for the wave):** discovery **18 / 30** (incl. one Exa
   429 recorded FAILED, not retried); retrieval **26 / 50** (incl. 3
   blocked/failed; SaunaInter UK 403 recorded as access-blocked, not a negative
   finding). Firecrawl credits observed this session: **4**. Exa and Gemini
   monetary cost **UNKNOWN**. No crawls, deep-research jobs, subscriptions,
   credit purchases, or billing changes.
6. **Known limitations / notes:** our product still has **no confirmed
   ProductFacts**, so facade/sauna suitability remains `UNKNOWN`; species
   nomenclature (Abura vs Abachi/Ayous) is unresolved and queued; frozen
   `research_contexts` snapshots remain unimplemented. Final run state:
   `PAUSED` / `NEEDS_HUMAN` at a persisted checkpoint, resumable from the API
   alone. The overall European market research is **not** complete. `soft/**`
   and the unrelated dashboard changes were untouched; nothing committed or
   pushed.

## Completion record — batch C, same-session continuation (2026-09-15)

**Status:** READY_FOR_HUMAN_REVIEW. Run `PAUSED` / `DIMINISHING_RETURNS`; not
archived. No commit or push. Fresh-session recovery already demonstrated
(previous batch), so no new session was used.

1. **Recovery/counters (API-verified).** Checkpoint counters at recovery:
   discovery 18/30, retrieval 26/50. Run read as `PAUSED` / `NEEDS_HUMAN`,
   `contextVersion 7` = current; `PATCH RUNNING` resumed it.
2. **Species correction (the requested fix).** CIRAD (`AYOUS.pdf`) records
   Abachi, Ayous, Obeche, Samba and Wawa as names of one species,
   *Triplochiton scleroxylon*; TRADA records **Abura** as a different species
   (*Hallea ciliata* / *Mitragyna ciliata* / *H. stipulosa* / *M. stipulosa*).
   The unsupported Ayous-vs-Abachi distinction is therefore retracted by an
   appended correction; the unresolved label issue is **Abura**. Species
   equivalence does not prove treatment/profile equivalence.
3. **Market-absence assertions replaced** with search-bounded findings: "No
   GB-based thermo-Abachi sauna **cladding** seller, and no dedicated FI-based
   thermo-Abachi/Ayous **facade** product, was found in the sources checked so
   far."
4. **Traceable corrections (append-only; PROVISIONAL).** The API has no
   claim/evidence update or delete, so corrections are appended `INFERENCE`
   claims and **do not implement formal retraction or supersession**. Ledger is
   recorded in the run checkpoint: affected `bd8c6cab`→`403d9ebf` (Ayous/Abachi);
   `8a47fa94`→`53e87136` (PK-Puu unit per **linear metre**, not piece);
   `47498ee0`→`8efa09ee` and `0e67d2a0`→`2a50625c` (market-absence → bounded).
   Batch-A originals `541dbb6a`/`035cb1ed`/`396492bd` are superseded by
   `bd8c6cab`/`2a6813fd`/`8435a851` and excluded from the current synthesis.
5. **New sourced findings.** LT facade exact matches with price: **MDS Terasos
   Termo Ayous 20x117x3000 = 68.97 €/m² incl. VAT** (24.21 €/board), and
   Consolva Termo AYOUS 3100×20×40 (no price, out of stock). PK-Puu Thermo
   Royal STS3 price corrected to **9.99 €/linear m** (≈75.1 €/m² derived via the
   page's 7.52 jm/m²; VAT UNKNOWN), and the page states exterior/facade use
   when surface-treated. SaunaInter (Intercom Group, EE) full-product dark
   sauna lining **USD 127.06/6-pc pack (67.95 $/m²), VAT not incl.**, labelled
   "Thermo-Abura (Triplochiton scleroxylon)". ARA Sauna offers Abachi Thermo
   T&G cladding (18×176/185, 18×83/92) treated 160–240 °C. Finnmark (GB) sells
   a decorative Thermo Abachi panel at €591.95/m² (adjacent).
6. **Persistence & counters now:** 28 sources, 29 evidence, 31 claims,
   23 queries; checkpoint **19 coverage cells**, **8 follow-ups**. Cumulative
   usage: discovery **23/30**; retrieval **35/50** (this session +5 discovery,
   +9 retrieval, incl. 1 PDF and 1 404). Firecrawl credits observed this
   session: PDF 4 + 3 scrapes; Exa/Gemini cost UNKNOWN.
7. **Actual stopping reason:** `DIMINISHING_RETURNS` in the two remaining open
   areas (FI facade dedicated product; GB sauna GB-based cladding). Budget
   headroom remains (7 discovery / 15 retrieval) but repeated FI/GB queries
   across engines returned only substitutes/adjacent products. Not a
   permission request; recorded as the run's stop condition.
8. **VAT honesty:** captured only as stated (MDS Terasos incl.; SaunaInter not
   incl.; PK-Puu/Pirtele/MatoSauna UNKNOWN); never assumed.

**Whole-wave consolidated account (batch A + B + C)**

- **Sourced findings.** *GB exterior/facade is the strongest segment:* eight
  verified sellers of thermo-Ayous cladding (Premier, Southgate, Eva, Hatch,
  Linwood, Kebur, Coyletimber, The Timber Group), with GBP prices per linear m
  (£7.00–£8.45 ex VAT; £8.40–£10.14 inc VAT) and ~£61.51/m². *LT:* LT sauna
  covered (Pirtele 69.00 €/m²; MatoSauna 18.26–35.93 €/board), LT facade now
  covered (MDS Terasos 68.97 €/m² incl. VAT; Consolva listing). *FI:* domestic
  thermo-Abachi/"Thermo Royal" supply chain (Marron Wood, PK-Puu, Puutoimi,
  Kymifloor/PR Wood) with PK-Puu full-product prices; SaunaInter/Sauflex EE
  also serve FI. *EU supplier context:* ARA Sauna (Abachi Thermo cladding).
- **Comparable prices.** GB GBP/linear m (mixed VAT) and ~£61.51/m²; LT sauna
  69.00 €/m² (VAT UNKNOWN); LT facade 68.97 €/m² (incl. VAT); FI sauna
  9.99–24.90 €/linear m per size (VAT UNKNOWN; ≈75.1 €/m² derived);
  SaunaInter USD 67.95/m² (excl. VAT). Units/bases differ; no averaging, no
  cross-currency normalisation.
- **Adjacent products (not exact matches).** Untreated Abachi (Vilniaus
  Medienos Centras 46.79–52.00 €/m²); Abachi/thermo-Abachi **bench slats**
  (Sauna Direct GB; PK-Puu "laudelaudat"); decorative thermo-Abachi panels
  (Finnmark; SaunaABC HEXACON/ATHENA); thermo pine/spruce/ash cladding
  substitutes (Siparila, Puupuoti, Lunawood, Vastern, UK Hardwoods, MDS
  Terasos pine, marwood.lt).
- **Unresolved claims.** Whether our product is suitable for facade and for
  sauna (UNKNOWN, no ProductFacts); Abura vs Abachi/Ayous identity of the
  saunaabc/SaunaInter listing; whether any GB-based thermo-Abachi sauna
  cladding seller exists; whether a dedicated FI thermo-Abachi facade product
  exists.
- **Coverage by country/application.** GB facade: COVERED (suppliers);
  LT facade: COVERED (suppliers+prices); LT sauna: COVERED (suppliers+prices);
  FI sauna: COVERED (suppliers+prices); FI facade: PARTIAL/GAP; GB sauna:
  PARTIAL/GAP. All six approved areas present in the checkpoint.
- **Cumulative usage.** Discovery 23/30; retrieval 35/50. Firecrawl credits
  observed across the wave: 2 (A) + 4 (B) + 7 (C) = 13; Exa/Gemini cost
  UNKNOWN. No crawls, deep-research jobs, subscriptions, credit purchases or
  billing changes.
- **Pending work.** FI facade and GB sauna require trade/specification channels
  or direct RFQ rather than more SERP queries; species disambiguation;
  company-lead verification; remaining PK-Puu SKUs/VAT basis; kymifloor/PR Wood
  product-level data.

The overall European market research is **not** complete. `soft/**` and the
unrelated dashboard changes were untouched; nothing committed or pushed.

## Note — batch D: claim-correction mechanism + proposed mapping (2026-09-15)

**O-011 remains `PAUSED` / `DIMINISHING_RETURNS`.** The run was only **read**
through the API for this note; no research records were created, corrected,
resumed, or otherwise modified. The implementation work was delegated through
the programmer loop (`soft/tasks/current.md` → archived). The new mechanism
lets a claim be retracted or replaced without editing/deleting it:

- `POST /opportunities/:id/research-runs/:runId/claims/:claimId/corrections`
  (`{ kind: RETRACTION | REPLACEMENT, reason, replacementClaimId? }`);
- `GET .../claims` returns only `CURRENT` claims; `?includeHistory=true` returns
  the preserved history (`lifecycleStatus` + `correctionReason` +
  `correctedAt` + `replacedByClaimId`).

### Correction mapping for the real run (APPROVED and APPLIED 2026-09-15)

Derived from the API on 2026-09-15 (31 claims), approved by the human, then
applied through the correction API. Not every appended `INFERENCE` was treated
as a replacement: the six original claims below were replaced by clean, current
findings, while three appended "correction" artifacts were retracted as
redundant rather than chained. Verification (53 checks, 0 failures): 22
`CURRENT`, 31 with `includeHistory=true`, 6 `REPLACED`, 3 `RETRACTED`; originals
and evidence links preserved; `contextVersion` 7; run still `PAUSED` /
`DIMINISHING_RETURNS`. See `soft/tasks/done/2026-09-15-claim-corrections.md`.

**Group A — replace the original claim:**

| Affected claim | Kind | Replacement | Reason |
|---|---|---|---|
| `541dbb6a` (FACT GB merchants) | REPLACEMENT | `4fb567ae` | Ayous was conflated with a distinct "Abachi"; CIRAD shows Ayous = *Triplochiton scleroxylon*, and the GB finding is thermo-Ayous supply. |
| `035cb1ed` (FACT FI sauna) | REPLACEMENT | `14773f20` | Species label internally inconsistent ("Abura" vs *Triplochiton scleroxylon*); €3.91 is a 300 mm sample; an EE supplier's FI variant ≠ Finnish market service. |
| `396492bd` (INFERENCE conflicting specs) | REPLACEMENT | `8435a851` | Class 1 vs 2 and ~390/430 kg/m³ are product-specific values for different suppliers, not a contradiction under comparable conditions. |
| `47498ee0` (UNKNOWN GB sauna) | REPLACEMENT | `8efa09ee` | Market-absence wording replaced by a search-bounded finding. |
| `0e67d2a0` (UNKNOWN FI facade) | REPLACEMENT | `2a50625c` | Market-absence wording replaced by a search-bounded finding. |
| `8a47fa94` (FACT FI prices) | REPLACEMENT | `53e87136` | PK-Puu price is per linear metre (JM), not per piece. |

**Group B — retract the redundant correction artifacts (no replacement):**

| Affected claim | Kind | Reason |
|---|---|---|
| `bd8c6cab` | RETRACTION | Its Ayous-vs-Abachi distinction is unsupported (CIRAD); the clean statements are `c0a020ed` (species equivalence) and `4fb567ae` (GB finding). |
| `403d9ebf` | RETRACTION | Redundant re-correction of `bd8c6cab`; the clean current statement is `c0a020ed`. |
| `2a6813fd` | RETRACTION | Redundant correction of `035cb1ed`; the clean current statement is `14773f20`. |

**Group C — leave `CURRENT` (findings and still-valid batch-A claims).**
`9266e14c`, `5224eb2c`, `4fb567ae`, `14773f20`, `72b7a55e`, `c3b4b80c`,
`967d6cc5`, `53e87136`, `8435a851`, `8efa09ee`, `2a50625c`, `c0a020ed`,
`3386eb90`, `bb38e1a6`, `df0b6de4`, `479d9a64`, `9e9a89a4`, `4b659843`, plus the
still-valid batch-A `7d48280e`, `a19cb76e`, `62de4b4d`, `033d70f4`.

**Caveats.** (1) Applying Group A/B is order-independent because no replacement
target is itself retracted. (2) `8435a851`, `53e87136`, `8efa09ee` and
`2a50625c` carry self-referential "CORRECTION (appended)…" text; a human may
prefer fresh, self-contained successor claims instead of reusing them as
replacement targets. (3) The API was restarted from the implemented build under
the compliant Node runtime before applying. (4) The mapping was applied while
the run stayed `PAUSED` (corrections need no resume). The overall European
market research remains **not** complete.

## Closure — O-011 accepted (2026-09-15)

**Status:** CLOSED / ACCEPTED. The human accepted the **first bounded research
wave** (LT / FI / GB) and the claim-correction work built on it.

1. **Accepted scope.** The wave's persisted research (sources, evidence, claims,
   checkpoint), the fresh-session recovery, the bounded claim-correction
   lifecycle, and the applied six replacements + three retractions are accepted.
   This does **not** declare European market research complete: coverage gaps
   remain (FI facade dedicated product; GB sauna GB-based cladding) and our
   product facts remain `UNKNOWN`.
2. **Database run unchanged.** Run `ba1fcdd0-60c0-4478-a489-e0d5508b9ab1`
   remains `PAUSED` / `DIMINISHING_RETURNS`, `contextVersion 7`, with its
   checkpoint (19 coverage cells, 8 follow-ups), usage counters (discovery
   23/30; retrieval 35/50) and claim lifecycle (22 `CURRENT`, 6 `REPLACED`,
   3 `RETRACTED`, 31 total) unchanged. Closing the manager task does **not**
   resume, complete, or cancel the run.
3. **Delivered under this task (see completion records A–D above and the
   delegated task archives):** research persistence (`market-researcher` +
   `evidence` modules, migration `…_research_persistence`), the market-researcher
   operating harness, product-scoped discovery APIs, the bounded claim-correction
   lifecycle (migration `…_claim_corrections`), the admin product-management UI,
   and the canonical/implementation documentation updates. The finalization
   (backup, verification, commit, push) is recorded in
   `ops/done/2026-09-15-finalize-first-milestone.md` and the final report.
4. **Exclusions.** No unfinished or unrelated work was auto-included; anything
   excluded is reported in the finalization record.

