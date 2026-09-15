# Research Coverage Capability Test — Thermo-Ayous / Abachi Cladding (2026-09-14)

**Status:** NON-CANONICAL CAPABILITY EVIDENCE. Dated test record only.
**Not** live business state, **not** a product catalogue, and **not** a lead list.
No database record was created or changed. Candidates are discovery output;
substantive claims are supported only by content fetched from the candidate's own
website or an accessible PDF.

**Task:** O-007 — Equip and Validate the Market Research Toolchain.
**Subject:** Thermo-Abachi / Thermo-Ayous (and comparable thermally modified
hardwood) cladding. **Markets:** United Kingdom, Germany, France.
**Environment:** OpenCode 1.18.30 desktop on Windows 11 Pro; Exa `websearch`,
built-in `webfetch`, official Firecrawl MCP (`firecrawl_search`,
`firecrawl_scrape`), Gemini MCP (configured; connection failed — see §7).

> Search summaries and snippets below are **discovery evidence**. A company or a
> price is only treated as substantiated where a fetch of its own page (or an
> accessible PDF) is quoted. Unvisited candidates are `NOT_EVALUATED`, not
> rejected. The same source returned by two engines is **not** independent
> corroboration.

---

## 1. Queries run

Shared subset used to compare engines (same six queries on Exa and Firecrawl):

| ID | Language | Query |
|---|---|---|
| UK-1 | en | `thermo ayous cladding supplier UK` |
| UK-2 | en | `thermally modified ayous cladding manufacturer UK` |
| DE-1 | de | `Thermo Ayous Fassade Holz kaufen` |
| DE-2 | de | `Thermo-Ayous Fassadenverkleidung Hersteller Preis` |
| FR-1 | fr | `bardage thermo-ayous fabricant` |
| FR-2 | fr | `lame de bardage ayous thermo prix` |

Additional families followed during discovery: `Abachi` / `Abachi Thermoholz`
(DE commercial synonym), price-per-m² terms (`Preis pro m2`, `prix au m²`,
`price per m2`), and a French-language product-page follow-up
(`lames de bardage ayous`).

Bounded retries: the first Exa call returned a free-MCP rate-limit notice; a
single retry succeeded and normal queries followed. Firecrawl keyless calls were
issued with a short inter-call delay; no retry loop was run.

---

## 2. Candidates and verification status

Legend: **verified** = own page or accessible PDF fetched and quoted;
**ambiguous** = retrieved content incomplete or price only from a snippet;
**NOT_EVALUATED** = discovered only, not visited.

### United Kingdom

| # | Company | Relevance URL | Status | Evidence / note |
|---|---|---|---|---|
| 1 | Southgate Timber | https://southgatetimber.co.uk/catalog/thermo-ayous-cladding | **verified** (prior test + Exa) | "We supply Thermo Ayous cladding direct… fast UK delivery"; from ~£61.51/m² (site prices ex VAT) |
| 2 | Premier Forest Products | https://premierforest.co.uk/products/thermowood-ayous-cladding/ | **verified** (prior test + Exa) | Thermowood® Ayous, in-house machining; 430 kg/m³, Class 2 |
| 3 | Vincent Timber | https://www.vincenttimber.co.uk/specie/thermally-modified-ayous/ | **verified** (prior test + Exa) | Class 1, Obeche, ~390 kg/m³, profiles; Birmingham |
| 4 | Duffield Timber | https://duffieldtimber.com/cladding/thermo-ayous | **verified** (webfetch, this test) | "Thermally modified Ayous… Class 1 durability… around 400 kg/m³… Imported and machined in-house… profiles, including DTC47" (Ripon) |
| 5 | Benchmark Timber | https://www.benchmarktimber.co.uk/specie/thermally-modified-ayous/ | NOT_EVALUATED | "Elements® Thermally Modified Ayous… Obeche" (snippet only) |
| 6 | Davidson Timber | https://davidsontimber.co.uk/thermally-modified-ayous/ | NOT_EVALUATED | 10-yr UK cladding supplier (snippet only) |
| 7 | Norclad (Timber Cladding Solutions) | https://www.timbercladdingsolutions.co.uk/norclad-thermally-modified-ayous-cladding/ | NOT_EVALUATED | Thermally modified ayous (snippet only) |
| 8 | Ruby UK | https://www.ruby-group.co.uk/collections/thermo-ayous-cladding | NOT_EVALUATED | Many profiles; Devon (snippet only) |
| 9 | Coyletimber | https://coyletimber.com/product/thermo-ayous-cladding/ | NOT_EVALUATED | £7.00/m inc VAT £8.40 (snippet only) |
| 10 | Linwood Timber | https://linwoodtimber.co.uk/product/thermo-ayous-cladding/ | NOT_EVALUATED | £12.00/LM + VAT (snippet only) |
| 11 | Timber2uDirect | https://www.timber2udirect.co.uk/shop/thermo-ayous-shadow-gap-cladding-18-x-144mm-bb11/ | NOT_EVALUATED | £10.49 per LM (snippet only) |
| 12 | Co2 Timber (ThermoTimber) | https://co2thermotimber.co.uk/ | NOT_EVALUATED | Ayous Thermotimber® cladding (snippet only) |
| 13 | NBS Source (Vincent) data sheet | https://source.thenbs.com/... | NOT_EVALUATED | Manufacturer datasheet listing (snippet only) |

### Germany (German-language results)

Note: several German-language hits are Netherlands-registered web shops serving
DE (Gadero, Housewood); this is a coverage observation, not a claim about
company nationality.

| # | Company | Relevance URL | Status | Evidence / note |
|---|---|---|---|---|
| 1 | Housewood BV (NL) | https://housewood.com/de/product/thermo-ayous-geschlossenes-barcodeprofil-vario-2/ | **verified** (webfetch) | Closed barcode profile; **€74.38/m², €9.66/lm**; 22 mm × 133 mm; lengths to 4550 mm; FSC & PEFC; Groningen showroom |
| 2 | Gadero (NL) | https://gadero.de/fassadenverkleidung-ayous/ | **ambiguous** | Product-grade "Ayous / Abachi" range; snippet prices (e.g. €49.95/board ≈ €83.25/m²); page itself not fetched |
| 3 | Klöpfer Holzhandel | https://www.kloepfer.de/produkte/fassadenverkleidungen/thermoholz-fassade/c/1531288401592 | NOT_EVALUATED | B2B Thermoholz façade wholesaler (snippet only) |
| 4 | Holzhandel Online | https://www.holzhandelonline.de/thermoholz/thermoholzarten/abachi-thermoholz/ | NOT_EVALUATED | "Abachi Thermoholz – auch Ayous Thermowood" (snippet only) |
| 5 | Weltholz | https://www.weltholz.de/produkte/fassadenverkleidung/c/wh200 | NOT_EVALUATED | Modified woods incl. Thermo Ayous (snippet only) |
| 6 | Brazilian Lumber | https://brazilianlumber.com/product/thermo-ayous-wood-wall-panels-1x6/ | NOT_EVALUATED | US-based; not a German company |

### France (French-language results)

Note: several French-language hits are Belgium-registered suppliers; this is a
coverage observation, not a French-company claim.

| # | Company | Relevance URL | Status | Evidence / note |
|---|---|---|---|---|
| 1 | E-Wood | https://www.e-wood.fr/facade/bardage/bardage-ayous-thermo/ | **verified** (webfetch) | Ayous = *Triplochiton scleroxylon*, Cameroon, FAS; heat-treated ~215 °C; classes 3.1–3.2; **AAGE 34×125 from 99 €HT/m², KIRSTEN 21×125 69.90 €HT/m², saturés 89.90–119 €HT/m², KARL 21×45 2.95 €HT/ml** |
| 2 | Comptoir des Bois | https://www.comptoirdesbois.fr/wp-content/uploads/sites/35/2023/05/fiche_technique-bardage-ayous-thermo-chauffe-sans-finition.pdf | **verified** (Firecrawl PDF parse) | "FICHE TECHNIQUE BARDAGE AYOUS THERMO-TRAIT… Essence: Ayous… Origine: Afrique… Masse volumique: 340–380 kg/m³ (naturel)" |
| 3 | Gedimat | https://www.gedimat.fr/bardage-elsa-bois-thermotraite-ayous-20-x-130-mm-l-3-95-m-,1901953,1,2,45.htm | **ambiguous** | JS/cookie-gated; keyless Firecrawl returned the cookie panel and webfetch returned nav-heavy content. Snippet: **79.90 €TTC/m²**, Class 3.1, 20×130 mm, botte of 4 |
| 4 | Tecnomat (ex Bricoman) | https://www.tecnomat.fr/produits/prix-au-m2-bardage-bois-ayous-thermotraite-classe-4-90111182.html | NOT_EVALUATED | Snippet: 67.90 €TTC / 56.58 €HT per m², Classe 4 |
| 5 | ACTimber Trading / BoisPlus | https://boisplus.fr/produits/thermo-ayous ; https://actimbertrading.com/fr/produits/thermowood-ayous | NOT_EVALUATED | ThermoWood® Ayous, Cameroon/DRC (snippet only) |
| 6 | Mery Bois (BE) | https://www.mery-bois.com/bardage-ayous-thermo/ | NOT_EVALUATED | Thermo-treated; density ±400–500 kg/m³ (snippet only) |
| 7 | Bourguignon Bois (BE) | https://www.bourguignonbois.be/fr/526-bardage-ayous-thermotraite | NOT_EVALUATED | Snippet prices 3.37–8.66 €/ml, many profiles |
| 8 | Eurabo (BE) | https://www.eurabo.be/fr/produits/ayous-fsc-thermo-geneve | NOT_EVALUATED | FSC Ayous Thermo Genève; class 2; 300–330 kg/m³ (snippet only) |
| 9 | Otiva (BE) | https://otiva.be/fr/bardage-en-ayous-thermowood-lignes | NOT_EVALUATED | 82.52 €TTC (snippet only) |
| 10 | Carlier (BE) | https://pro.carlier.be/ayous-thermo-232 | NOT_EVALUATED | Snippet prices (e.g. 20.74 €TTC/ml) |
| 11 | EXZO (BE/NL) | https://exzo.be/gevelbekleding/thermowood/thermo-ayous | NOT_EVALUATED | Snippet: "€60–€120 per m²" range |

---

## 3. Supported price observations (unit, currency, VAT status)

Only rows with a fetched source are **supported**; snippet-only prices are
labelled and not asserted as fact.

| Market | Company | Product | Price | Unit | VAT | Basis |
|---|---|---|---|---|---|---|
| UK | Southgate Timber | Thermo Ayous cladding | from £61.51 | per m² | site prices shown ex VAT | own page (prior test) |
| DE | Housewood (NL) | Closed barcode Vario, 22×133 mm | €74.38 / €9.66 | m² / linear m | not stated on page | own page (fetched) |
| FR | E-Wood | AAGE 34×125 | from 99 | per m² | HT (excl. VAT) | own page (fetched) |
| FR | E-Wood | KIRSTEN 21×125 | from 69.90 | per m² | HT | own page (fetched) |
| FR | E-Wood | KARL 21×45 | from 2.95 | per linear m | HT | own page (fetched) |
| FR | E-Wood | Saturé finishes | 89.90–119 | per m² | HT | own page (fetched) |
| FR | Gedimat | ELSA 20×130 mm | 79.90 | per m² | TTC (incl. VAT) | **snippet only — ambiguous** |
| FR | Tecnomat | Ayous Classe 4 | 67.90 / 56.58 | per m² | TTC / HT | snippet only |
| UK | Coyletimber | Thermo Ayous cladding | £7.00 (£8.40 inc VAT) | per linear m | inc VAT | snippet only |
| UK | Linwood Timber | Thermo Ayous cladding | £12.00 | per linear m | plus VAT | snippet only |
| UK | Timber2uDirect | Shadow-gap BB11 18×144 mm | £10.49 | per linear m | not stated | snippet only |

**Exact match vs substitute:** items above are Thermo-Ayous / Thermowood Ayous
(*Triplochiton scleroxylon* / Obeche). Adjacent results in the same SERPs were
**substitutes** (thermo fraké, thermo épicéa/pin, thermowood pine) and are not
counted as exact matches.

**Specification observations (fetched):** density ~340–430 kg/m³; heat treatment
~200–215 °C without chemicals; durability class 1 (Vincent/Duffield) to class
3.1–3.2 service classes (E-Wood); profiles include closed/open barcode, shadow
gap, T&G, rainscreen; FSC/PEFC options.

---

## 4. Tool contribution and overlap (shared six-query subset)

| Observation | Exa (`websearch`) | Firecrawl keyless (`firecrawl_search`) |
|---|---|---|
| Queries run | 6 (shared subset) | 6 (shared subset) |
| Notable unique domains | Benchmark Timber, Davidson Timber, NBS Source, EXZO, Otiva, Eurabo, ACTimber/BoisPlus, norclad | Duffield Timber, Timber2uDirect, weltholz, bricoman/tecnomat, gadero.fr |
| Snippet quality | Richer prose highlights, dates | Compact title/URL/description; supports `includeDomains`, `categories`, `scrapeOptions` |
| Shared domains (not independent corroboration) | Southgate, Premier, Vincent, Housewood, Gadero, Klöpfer, E-Wood, Comptoir des Bois, Mery Bois, Bourguignon | same |
| Non-search extra | — | `firecrawl_scrape` (PDF parse of Comptoir des Bois fiche technique) |

Engine comparison note: the task asked for Exa vs **Gemini** on a shared subset.
Gemini could not be run (no credential/connection); the comparison is Exa vs
Firecrawl instead. See §6 and the second pass in §7.

---

## 5. Retrieval outcomes

- **Successes:** southgatetimber, duffieldtimber, housewood, e-wood (webfetch);
  Comptoir des Bois PDF (Firecrawl `firecrawl_scrape` with `parsers:["pdf"]`).
- **Incomplete / JS-gated:** gedimat.fr — first pass: keyless `firecrawl_scrape`
  returned the cookie-consent panel and `webfetch` returned a navigation-heavy
  page (recorded as **ambiguous**). Second pass: an in-session `firecrawl_scrape`
  returned the full product record — see §7 (now **verified**).
- **Hard failure then fallback:** `webfetch` returned **HTTP 503** for
  benchmarktimber.co.uk; a `firecrawl_scrape` JSON extraction then succeeded —
  see §7.
- **Rate limited:** one Exa free-MCP rate-limit response, resolved on retry.
  Firecrawl keyless is rate-limited by design; a short delay avoided repeat hits.
- **Blocked URLs:** none observed (no hard 4xx/5xx from `webfetch`).

---

## 6. Coverage gaps and why the benchmark stopped

- **Gemini not exercised.** No `GEMINI_API_KEY` / Vertex / ADC is present in this
  environment, so the Gemini MCP could not connect or complete a tool call. No
  Google Search-grounding source links were obtained. The Exa-vs-Gemini
  comparison is therefore **not done**; it remains blocked on a real credential
  (see §7).
- **Germany is thinly verified.** German-language SERPs were dominated by
  Netherlands retailers (Gadero, Housewood) and B2B wholesalers whose pages were
  not fetched. Only one DE-market price is fetched.
- **France is partly Belgian.** FR-language queries surfaced many Belgian
  suppliers (Mery Bois, Bourguignon, Eurabo, Otiva, Carlier); country attribution
  must be checked before any commercial use.
- **Many candidates are NOT_EVALUATED.** Discovery outpaced retrieval; verifying
  every candidate was out of scope for a capability test. Unvisited candidates
  are not rejections.
- **Stop reason:** the six shared queries plus a bounded number of follow-ups
  produced a stable, non-trivial set of exact-match sellers/spec sheets across
  three languages with no new category of result appearing; further queries would
  add unverified candidates rather than coverage of a new kind. Stopped to
  preserve quota and because no Verifiable claim required additional fetching.

**Usage / cost (first pass):** Exa token/usage not observable from the tool output
→ unknown. Firecrawl keyless returned `creditsUsed: 2` for a 6-result search and
exposes daily keyless limits (subscription limits not observable) → cost unknown.
No paid plan was purchased and no paid overage was enabled.

---

## 7. Second pass — in-session MCP verification and follow-ups (2026-09-14, later)

A restarted OpenCode session was used to verify the MCP servers from the inside.
Four things are distinguished — a server can pass one and fail the next:

| Capability | Firecrawl (keyless) | Exa `websearch` | Gemini MCP |
|---|---|---|---|
| **Installation** | endpoint reachable | built-in | package installs and launches |
| **Connection** | **connected in-session** | built-in | **FAILED** (`key=gemini status=failed`) |
| **Successful tool execution** | **yes** (`search`, `scrape`, `parse`) | **yes** | **none** |
| **Research coverage** | **yes** (below) | **yes** | **none** |

### 7.1 In-session tool calls (real calls, not snippets)

- `firecrawl_search` — UK-1, DE-1, FR-1 of the shared set (5 results each).
- `firecrawl_scrape` — gedimat.fr product page (previously incomplete via
  `webfetch`): returned the full record — **79.90 €TTC/m²** (164.11 €TTC/paquet),
  Class 3.1, 20×130 mm utile, origin Afrique, ref `30357998`.
- `firecrawl_scrape` — Comptoir des Bois PDF (`parsers:["pdf"]`): full 2-page
  fiche technique (Ayous/Afrique, ACFAY, 380 kg/m³ natural / 340 kg/m³ thermo,
  D-S2,d0, 212 °C thermo-traitement; profiles Alcor/Thuban/Phénix/Diablo/Libra;
  maker **LIGNALPES**, Saint-Pierre-en-Faucigny, FR).
- `firecrawl_scrape` (JSON) — benchmarktimber.co.uk: `webfetch` had returned
  **HTTP 503**; Firecrawl extracted *"Thermally Modified Ayous is a smooth,
  durable hardwood cladding made from sustainably sourced Obeche"* (UK).
- `firecrawl_scrape` (JSON) — holzhandelonline.de: Abachi Thermoholz
  ("auch Ayous Thermowood"), Germany; price token `11,75 €` (unit ambiguous).

### 7.2 Status changes from the follow-ups

| Company | First pass | Second pass | Basis |
|---|---|---|---|
| Gedimat (FR) | ambiguous | **verified** | Firecrawl full product record (price/spec) |
| Benchmark Timber (UK) | NOT_EVALUATED | **verified** | Firecrawl JSON after `webfetch` 503 |
| holzhandelonline (DE) | NOT_EVALUATED | **verified** | Firecrawl JSON (Abachi = Thermo-Ayous) |

### 7.3 Exa vs second engine

The requested **Exa vs Gemini** comparison is still **not done** — Gemini never
connected, so there is no grounded answer or source list to compare. The
available substitute is **Exa vs Firecrawl** on the shared set: Exa returned
richer prose highlights; Firecrawl returned compact structured results plus
`scrapeOptions`, and, critically, the `firecrawl_scrape`/PDF fallbacks. Firecrawl
search results overlap Exa heavily (Southgate, Vincent, Housewood, Gadero, E-Wood,
Comptoir, Mery Bois, Bourguignon, Duffield) — **overlap is not corroboration**.
Firecrawl added Timber2uDirect and Co2 Timber; Exa added Benchmark, Davidson,
Norclad, EXZO, Otiva, Eurabo, ACTimber/BoisPlus. This does **not** substitute for
Gemini.

### 7.4 What is still missing

- A real Gemini `gemini_chat` grounding call, its model name, and its returned
  source links — the key and server work and plain generation returns HTTP 200,
  but `google_search`-enabled requests return `429 RESOURCE_EXHAUSTED` with only
  `google.rpc.Help` (no quota metric details). The blocker is a **Google Search
  grounding entitlement/quota** gap, not configuration.
- The DE price unit for holzhandelonline.
- Independent verification of many NOT_EVALUATED UK/DE/FR/BE candidates.

**Second-pass usage:** observed Firecrawl `creditsUsed` — 3 searches (2 each = 6),
gedimat scrape (1), PDF parse (2), benchmark JSON (5), holzhandelonline JSON (5)
≈ 19 credits; Exa usage unobservable. No plan purchased; no paid overage enabled.

---

## 8. Third pass — Gemini grounding enabled; Exa vs Gemini (2026-09-14, later)

Billing was enabled by the human for the Default Gemini Project (Paid 1, €25
prepaid, auto-reload **off**); paid Gemini usage is authorized for this scoped
benchmark only. No billing setting was changed by the agent.

### 8.1 Gemini grounded calls (via the configured MCP, `@houtini/gemini-mcp` 2.6.2)

All six shared-set queries returned `isError=false` with grounding sources.
Provenance: **configured/requested model = `gemini-3.1-flash-lite`** (OpenCode
`GEMINI_DEFAULT_MODEL`); **response-reported model = unknown** — the
`@houtini/gemini-mcp` tool does not return the model it used. Grounding is
evidenced by the returned `vertexaisearch.cloud.google.com/grounding-api-redirect`
citation URLs (Google Search grounding redirects), not by model text alone.

| Query | Grounding sources | Companies named in the grounded answer |
|---|---|---|
| UK-1 | 15 | Southgate, Vincent, Premier Forest, Timber2uDirect, Woodstock Timber, NORclad, James E Hatch and Son |
| UK-2 | 14 | NORclad, Vincent, Benchmark, Duffield, Slatted Screen Fencing |
| DE-1 | 14 | Gadero, Holzhandelonline, Klöpfer, Housewood |
| DE-2 | 12 | Housewood B.V. (+); grounded price range **65–95 €/m² excl. MwSt.** |
| FR-1 | 12 | Lignalpes, Sivalbp, Gadero, Henry Timber, Le Commerce du Bois |
| FR-2 | 8 | grounded price ranges: **supply 50–110 €/m²; installed 100–150 €/m²** |

Grounding price ranges are model synthesis backed by source links; they were not
independently fetched, so they are **not** counted as supported price observations.

### 8.2 Exa vs Gemini — per-market contribution

| Market | Found by both (not independent corroboration) | Gemini-only (new) | Exa/Firecrawl-only |
|---|---|---|---|
| UK | Southgate, Vincent, Premier Forest, Timber2uDirect, NORclad, Benchmark, Duffield | **James E. Hatch and Son**, **Woodstock Timber**, **Slatted Screen Fencing** | Davidson, Co2 Timber, Ruby, Coyletimber, Linwood, Timbercladdingsolutions |
| DE | Gadero, Housewood, Klöpfer, Holzhandelonline | (none new) | weltholz, Brazilian Lumber (non-DE) |
| FR | Gadero, Lignalpes (also in the Comptoir PDF) | **Sivalbp**, **Henry Timber** (and trade body *Le Commerce du Bois*) | E-Wood, Comptoir des Bois, Gedimat, Tecnomat, ACTimber/BoisPlus, Mery Bois, Bourguignon, Eurabo, Otiva, Carlier, EXZO |

### 8.3 Follow-up verification of new discoveries (own sites)

| Company | Market | Status | Evidence |
|---|---|---|---|
| James E. Hatch and Son | UK | **verified** (webfetch) | "Thermo-Ayous timber cladding is produced by thermally modifying Obeche… Class 1 – Very Durable… Approx. 390kg/m3… FSC Certified" (Chorley, UK) |
| Woodstock Timber Company | UK | **verified** (Firecrawl JSON) | "Thermo Ayous Cladding is a premium engineered timber option…" (UK) |
| Sivalbp | FR | **verified — substitute, not exact** | French thermo-treatment specialist (Thônes), but its range is **Pin du Nord Thermo / Épicéa Thermo / Mélèze Thermo** — **no Ayous**. Counted as a comparable, not an exact Thermo-Ayous match. |
| Slatted Screen Fencing (UK), Henry Timber (FR), Lignalpes (FR) | — | NOT_EVALUATED | named by Gemini; own pages not fetched (out of scope for a single follow-up round) |

### 8.4 Coverage gaps / limitations (third pass)

- Gemini's grounding citations are redirect URLs without publisher domains, so
  Gemini source pages were not directly fetchable from the tool output; discovery
  was verified by independent search + `webfetch`/Firecrawl instead.
- Gemini named one non-seller (*Le Commerce du Bois*, a trade body) and one
  substitute (*Sivalbp*); naming ≠ commercial exact match.
- Germany gained **no** new Gemini-only company.
- No retrieval failures this pass.

**Third-pass usage/cost:** Firecrawl — 3 searches (2 each = 6) + 1 JSON scrape (5)
≈ 11 credits. Gemini — the MCP returns no token/cost data, so per-call cost is
**unknown**; billing shows €25 prepaid with auto-reload off. Exa — unknown. No
plan purchased, no auto-reload enabled, balance not treated as a spend target.

---

## 9. Fourth pass — Gemini native invocation + DeepSeek web-search test (2026-09-14, final)

Two separate questions were tested: (A) is the Gemini MCP callable **natively**
from the agent's own toolset; (B) did DeepSeek execute **server-side web search**
in the tested account/model/endpoint configuration? Statuses are recorded
separately and are not conflated.

### 9.1 Gemini — native in-session invocation: SUCCESS

- The `gemini_*` tools now appear in the agent toolset. `gemini_gemini_chat` was
  invoked **natively in-session** (not via a shell/diagnostic client) on the
  shared **UK-1** query (`thermo ayous cladding supplier UK`) with Google Search
  grounding enabled; `isError` was not set.
- **Grounding citations:** 15 `vertexaisearch.cloud.google.com/grounding-api-redirect`
  citation URLs (some duplicated) were returned alongside the synthesised answer —
  Google Search grounding **verified natively**. The answer named NORclad, Vincent,
  Premier Forest, Benchmark, Timber2uDirect, Southgate, Woodstock and James E.
  Hatch and Son (all already known from earlier passes) plus **The Timber Group**
  (new name).
- **Provenance:** configured/requested model = **`gemini-3.1-flash-lite`** (MCP
  default; no model passed explicitly); **response-reported model = not returned**
  by the tool; per-call usage/cost = not returned.
- **New name is discovery, not proof:** "The Timber Group" is a Gemini-only naming
  that was **not** fetched or verified this pass → `NOT_EVALUATED`.

### 9.2 DeepSeek — server-side web search: not observed / not accepted as verified

**Outcome statement:** Server-side web search was not observed in the tested
account/model/endpoint configuration on 2026-09-14. Both requests completed
without `web_search_call` items or source annotations. This path is not accepted
as a verified research tool.

Setup: existing DeepSeek auth reused from `~/.local/share/opencode/auth.json`
(`deepseek`, `type: api`). The key was read into the process at runtime and used
only as an `Authorization` header — never printed, never passed as a CLI argument,
never written to a tracked file. Model used: **`deepseek-flash`** (documented).

| Request | Body | Result |
|---|---|---|
| DS-1 | `model=deepseek-flash`, `input="thermo ayous cladding supplier UK"`, `tools:[{"type":"web_search"}]`, `tool_choice:{"type":"web_search"}` | **HTTP 200**, `status=completed`, `model=deepseek-flash` |
| DS-2 (confirmation) | same, but `tool_choice:"auto"` | **HTTP 200**, `status=completed`, `model=deepseek-flash` |

Observed `output` items (the decisive evidence):

| Request | Output item types | `web_search_call`? | Output annotations |
|---|---|---|---|
| DS-1 | `reasoning`, `message` | **none** | — |
| DS-2 | `reasoning`, `message` | **none** | **0** |

DS-1 returned a plausible supplier list, but with **no `web_search_call` item and
no annotations** it is **model prior knowledge, not search output** — exactly the
"plausible answer alone" case the task warns about. Names it produced (Silva
Timber, Russwood, iWood Timber, Ecochoice, British Hardwoods, International
Timber, James Latham, Arnold Laver) are therefore **unverified hypotheses and are
not counted as findings**.

Usage returned (token counts only; monetary cost not observable):

| Request | input_tokens | output_tokens | reasoning_tokens | total_tokens |
|---|---|---|---|---|
| DS-1 | 38 | 3721 | 3176 | 3759 |
| DS-2 | 38 | 4571 | 4105 | 4609 |

No chain-of-thought was stored — only the item types/statuses and token counts.

### 9.3 Documented wording, conflict, and why this path is not accepted

- **Documentation URL used in the latest diagnosis:**
  `https://api-docs.deepseek.com/guides/responses_api/`.
- **Relevant supported/ignored wording** (Tools table): "`web_search` /
  `file_search` / `code_interpreter` / `computer_use` / `mcp` / other built-in
  tools" — **Ignored**; "`function`" — **Supported**. The API reference
  `https://api-docs.deepseek.com/api/create-response/` adds "Built-in tool types
  are ignored." and lists output item types as `message`, `reasoning`,
  `function_call` (no `web_search_call`). `https://api-docs.deepseek.com/api/create-chat-completion`
  documents only the `function` tool type.
- **Recorded documentation conflict (no explanation asserted):** the same official
  Responses guide's "Input Items" note states that `web_search_call` items passed
  back in `input` "are still restored and concatenated into the context" and cites
  "search results produced by an earlier request with an older model". That
  wording implies `web_search` support at some point, which **conflicts** with the
  "Ignored" Tools-table classification. The conflict is recorded as observed; no
  cause is invented and **no additional API test** was run.
- **OpenCode transport:** the built-in `deepseek` provider is defined as npm
  `@ai-sdk/openai-compatible` with base URL `https://api.deepseek.com` — i.e.
  **Chat Completions**, not Responses. No provider override exists in config.
- **Direct API vs native integration are distinguished:** the direct API test
  above is the tested endpoint behaviour; OpenCode's native DeepSeek integration
  would additionally need a DeepSeek search tool over its transport. Since
  server-side search was not observed, this path is **not accepted as a verified
  research tool** and no integration was implemented.

### 9.4 Conditional step 3 not run

The task's step 3 (run the six UK/DE/FR benchmark queries through DeepSeek) was
conditional on DeepSeek search **succeeding**. It did **not**, so the six queries
were **not** run through DeepSeek. Existing Exa / Firecrawl / Gemini results were
**preserved and not rerun**.

### 9.5 Fourth-pass usage / coverage

- Firecrawl: 3 documentation scrapes for the DeepSeek API reference
  (`create-response` 1 + `responses_api` 1 + `create-chat-completion` 5) ≈ **7
  credits**; no new benchmark searches.
- Gemini: 1 native grounded call; cost not reported by the tool → unknown.
- DeepSeek: 2 bounded requests; token usage above; monetary cost unknown.
- Coverage change: Gemini grounding is now **natively verified**; DeepSeek adds
  **no** new coverage and **no** source traceability. No new exact-match seller
  was verified this pass. No paid plan purchased; no auto-reload enabled; no
  billing setting changed.
