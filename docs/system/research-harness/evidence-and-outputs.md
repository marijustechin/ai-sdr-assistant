# Evidence and Commercial Outputs

**Status:** Canonical operating harness (O-009). Entry point:
[`AGENTS.md`](AGENTS.md).
**Informs:** the `evidence` module's operating rules (source/evidence/claim
persistence is implemented, T-007) and the still-planned `research-records`
module. This file defines what the researcher must record and how it maps to the
implemented contracts; it does not itself authorize writing any table or schema.

---

## 1. Every material claim carries four things

| Field | Meaning | Persisted as (T-007) |
|---|---|---|
| **Original source URL** | The exact page (or PDF) fetched — not a search-engine result URL, not a redirect. | `source_references.url` (deduplicated by URL) |
| **Retrieval date** | When the researcher fetched it (ISO-8601 date). | `evidence.retrievedAt` |
| **Supporting evidence** | The quoted/paraphrased fact from that page that supports the claim. | `evidence.evidenceText` |
| **Verification status** | `VERIFIED` (the fetched source states it) or `UNVERIFIED` (lead only; not yet fetched). `INFERENCE` is **not** an evidence state — it is a claim `type` (see below). | `evidence.verificationStatus` |

Rules:

- A claim without a retrievable URL is `UNKNOWN` — never `FACT`. (In the model, a
  `FACT`/`INFERENCE` claim requires ≥1 linked evidence record.)
- A snippet, search summary, or grounded-answer citation is **discovery**, not
  evidence. Google-grounding redirect URLs without a publisher domain must be
  confirmed on the company's own page before a claim based on them is
  `VERIFIED`.
- `INFERENCE` claims must state (and link) the verified evidence they rest on.
- Never store chain-of-thought or model reasoning; store evidence, decisions,
  inputs, outputs, limitations (`AGENTS.md` §3).

### Claim types

| Type | Definition | Persisted as (T-007) |
|---|---|---|
| `FACT` | Directly stated by a fetched, dated source. | `claims.type = FACT`, with ≥1 `claim_evidence` link |
| `INFERENCE` | A reasonable conclusion from ≥1 `FACT`; labelled as such. | `claims.type = INFERENCE`, with ≥1 `claim_evidence` link |
| `UNKNOWN` | Not established. Must not carry a price or an invented value. | `claims.type = UNKNOWN`, with **no** evidence links |

Confidence is coarse: `HIGH` (≥1 fetched primary source), `MEDIUM` (secondary
source, or primary with caveats), `LOW` (single secondary, or inference from
weaker sources). No pretend-precise scoring. Persisted as `claims.confidence`
(`HIGH | MEDIUM | LOW`).

### 1.1 Source → evidence → claim (implemented mapping)

- `source_references` — `url` (unique), `title`, `publisher`, `sourceType`.
- `evidence` — `sourceReferenceId`, `researchRunId`, `evidenceText`,
  `verificationStatus` (`VERIFIED | UNVERIFIED`), `retrievedAt`.
- `claims` — `researchRunId`, `type`, `statement`, `confidence`; linked to
  evidence via `claim_evidence` with `stance`
  (`SUPPORTS | REFUTES | CONTEXT`).
- `claims.lifecycleStatus` — the bounded correction lifecycle (`CURRENT` /
  `RETRACTED` / `REPLACED`), **separate** from `type` and from evidence
  verification. A correction records `reason`, `correctedAt`, and (for a
  replacement) `replacedByClaimId`; the original claim and its evidence links
  are preserved. Current reads exclude non-`CURRENT` claims; history is
  retrievable with `?includeHistory=true`.

A claim may rest on many evidence records (and vice versa). Discovery queries are
recorded separately in `research_queries`; a search snippet is never evidence.

**Not yet modelled (do not fake it):** the source fetch-status vocabulary used by
`operating-manual.md` §7 (`OK` / `FETCH_FAILED` / `LINK_ROT` / `BLOCKED`) has no
dedicated column in T-007. Record a blocked or failed retrieval on the
`research_queries` row (`status`, `errorCode`, `errorNote`) and/or in the run
checkpoint, and report it as a gap; a per-source status column is deferred.

## 2. Price capture

For every price, preserve — verbatim where stated:

- **currency** and **amount**;
- **unit** (per m², per linear m, per board/pack, per tonne, …);
- **VAT treatment** (included / excluded / not stated) — never silently add or
  remove VAT;
- **dimensions / specification** (thickness × width, profile, grade);
- **pack size / minimum order** where stated;
- **commercial conditions** (trade/B2B vs retail/list; volume; lead time;
  incoterms; validity date).

Rules:

1. **Always separate price basis** — retail/list vs B2B/trade. Never conflate.
2. A price is a `FACT` only when the source states the number, currency, and
   unit (ideally with a date). Otherwise record `UNVERIFIED` evidence and label
   the ambiguity (unit/basis) in the evidence text — there is no `AMBIGUOUS`
   enum.
3. **Normalise only when the conversion inputs are known.** If converting to a
   common unit (e.g. €/m²), store the **original** value and the **derived**
   value; mark the derived value `INFERENCE` with the exact conversion inputs
   (exchange rate + date, or the dimension calculation). If inputs are unknown,
   do not normalise.
4. If no B2B price is found, leave `B2B price = UNKNOWN`. Do not invent a
   discount factor or infer a price from a retail price.
5. **Non-comparable products** (different species, thickness, profile, treatment,
   region) may be recorded for context and clearly labelled `NOT_COMPARABLE`;
   they are never averaged into the target product's price.
6. Keep the original value and calculation together so the derivation is
   auditable.

## 3. Required separations

The researcher must keep these distinctions explicit in every output; when in
doubt, state both rather than collapsing them:

| Separation | Rule |
|---|---|
| **Exact product match vs substitute** | A substitute (different species/treatment/profile) is context, never counted as an exact match and never used as the target's price. |
| **Sauna/bathhouse vs exterior/facade application** | Both are **core** research segments, not substitutes for one another. Cover both; segment importance is itself an evidenced finding and its priority adapts by country (sauna/bathhouse leads in Scandinavia and the Baltic region). Never demote either to incidental or substitute-only coverage. |
| **Cladding vs bench/slat product form** | Cladding (wall/ceiling/facade boards) and bench/slat products are adjacent categories. A bench/slat supplier or listing is context and a possible lead, never automatically an exact cladding match or a price basis. |
| **Thermally modified Abachi vs untreated Abachi** | Heat-treated Abachi/Ayous and untreated Abachi/Ayous are different products. Untreated-Abachi suppliers are adjacent leads, never exact matches and never a price basis for thermo-treated cladding. |
| **Application investigation vs product suitability** | Researching an application (sauna or facade) does **not** establish that *our* product is suitable for it. Suitability claims are attributed to the specific product and source they describe; our unconfirmed specifications remain `UNKNOWN`. |
| **Company location vs markets served** | A company's registered/HQ country is distinct from the markets it serves or ships to. Do not attribute a company to a country it merely lists for. |
| **Confirmed seller status vs potential buyer suitability** | Being a confirmed seller/manufacturer/distributor does not make an organisation a suitable buyer for our product. Seller status and buyer suitability are separate judgements; buyer suitability is a hypothesis for human review. |
| **Unvisited vs rejected candidate** | A discovered-but-unfetched candidate is `UNVISITED` (not evaluated), never "rejected". Rejection requires a stated reason (e.g. wrong species, out of scope, defunct). |
| **Observed evidence vs researcher inference** | Observations are separate from conclusions drawn from them; each inference states its basis. |

**Adjacent categories reveal suppliers but are not exact matches.** Bench/slat
products and untreated Abachi are useful discovery routes (a supplier of one may
supply the other), but they stay in the adjacent category until a source shows
the specific product form and treatment in scope.

## 4. Commercial output categories

A run aims to cover:

- **Suppliers / manufacturers / distributors** — with supplier type, verified
  home market, markets served, and the page that establishes it.
- **Product specifications** — dimensions, profiles, treatment, density,
  durability/class, certifications, origin; attributed to the source product,
  kept separate from our product's own facts.
- **Public prices** — captured per §2, with basis and VAT.
- **Pricing gaps** — where a market/segment/channel has no public price, or only
  ambiguous/partial pricing. A gap is a finding to report, not a gap to fill by
  guessing.
- **Substitute and adjacent products** — labelled as substitutes, with the
  attribute that makes them non-comparable.
- **Market observations** — structure, terminology, channels, associations,
  trade fairs, regulation/import context, demand signals, all sourced and dated.

## 5. What the researcher may and may not write

- **May write** sources, evidence, and claims, record queries and run
  checkpoints, and retract/replace its own claims through the correction
  endpoint, through the implemented `evidence` / `market-researcher` API
  (T-007 + claim-correction lifecycle).
- **May propose** (human-gated; none mutate business state automatically):
  target-market suggestions, research records/findings, and clarification
  requests — through the owning modules' services **when those services exist**
  (`persistence-boundary.md`).
- **May never write:** `product_facts`, or any business table directly
  (`data-governance.md` §7). The researcher never authors a product fact.

Generated reports are outputs produced from persisted records — not a substitute
for persistence. Where a required output has no endpoint yet (records/findings,
suggestions, clarification requests), the researcher records the gap and pauses
with `NEEDS_HUMAN` rather than writing business records to Markdown
(`persistence-boundary.md`).
