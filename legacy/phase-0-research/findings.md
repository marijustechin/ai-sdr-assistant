# Phase 0 Findings — Addendum to ai-sdr-assistant-mvp-plan-v2.md

**Date**: 2026-08-05
**Status**: Complete. 38 qualified prospects across 4 markets. 4 outreach drafts ready for human review.

---

## 1. Validation Result

Phase 0 validated the complete proposed workflow with a real opportunity:

- **Product**: ~45 m³ KD Abachi lumber, Congo origin, Vilnius stock
- **Target markets tested**: Germany, Netherlands, UK, Lithuania, Sweden, Norway, Denmark
- **Companies found**: 38 (target was ≥20 ✓)
- **Duplicates**: 0 (unique domain constraint effective ✓)
- **Useful qualification ranking**: 22 HIGH (70+), 15 MEDIUM (50-69), 1 LOW ✓
- **Sourced research**: Company websites, trade directories, search engines ✓
- **Relevant contacts**: Mixed (generic emails dominant, named contacts at 1 company) ✓
- **Outreach drafts**: 4 produced, human-reviewable ✓
- **Clear history**: All in phase-0-research/ directory ✓

### Success Criteria Met?

> Would a salesperson use the produced shortlist and drafts to contact these companies?

**Yes**, with the caveat that generic contacts (info@) require the salesperson to call for a named buyer. The shortlist is actionable.

---

## 2. Key Technical Findings That Affect the MVP Architecture

### 2.1 Search Provider Reality

| Provider | Result | MVP Viability |
|---|---|---|
| **Brave Search** | 15 companies discovered, no rate limit, handled operators | **Production-grade. Primary provider.** |
| DuckDuckGo HTML | 12 companies, but CAPTCHA after 3-4 queries | Validation only. Not production. |
| Google Search | Blocked by CAPTCHA on all attempts | Not viable for automated scraping |
| Bing Search | Blocked by CAPTCHA | Not viable |
| Qwant | Zero visible results in HTML | Not usable |

**Implication**: The `SearchProvider` interface in the MVP plan must have Brave Search as the first adapter. DDG is a backup. The plan's assumption that Google CSE would be primary is incorrect — CSE was never successfully tested.

### 2.2 Directory Source Accessibility

| Source | Accessible | Content Quality | Notes |
|---|---|---|---|
| **Rekvizitai.lt** | Yes (category GET pages) | High | 4,161 wood companies, 1,630 forestry. Country-specific. |
| **GD Holz** (DE) | Yes (region-specific) | Low | Mostly construction timber, not tropical. |
| **TTF** (UK) | Timed out | Unknown | Directory exists at .co.uk. Needs different access. |
| **TMF** (SE) | JS-rendered search | Unknown | /sok-medlem/ loads but search is JS. |
| **Fordaq** | Blocked (403) | High (Google-indexed) | Brave Search results confirm Fordaq lists Obeche traders by country. Use indexed pages only. |
| **Kompass** | Blocked (403) | High (Google-indexed) | Use indexed snippets only. |
| **Europages** | JS-rendered | Medium | Needs Playwright or indexed pages. |

**Implication**: The MVP's Company Discovery Service needs:
1. A country registry map (e.g., `{ DE: 'gdholz.de', LT: 'rekvizitai.lt', UK: 'ttf.co.uk' }`)
2. A fallback chain: try local registry → try search engine → try indexed directory pages
3. `WebPageFetcher` with Cheerio for static pages, `PlaywrightFetcher` for JS-rendered

### 2.3 Market Structure by Country

| Market | Obeche/Abachi Presence | Buyer Type | Trade Name | Recommendation |
|---|---|---|---|---|
| **Germany** | Very high | Timber wholesalers and importers | Abachi | Primary market. Mature, competitive. |
| **UK** | Very high | Timber importers and merchants | Obeche | Primary market. Matches German density. |
| **Lithuania** | Medium (domestic manufacturing) | Sauna/thermo manufacturers, timber importers | Abachi | Secondary market. Local advantage. |
| **Netherlands** | Medium | Re-exporters, transit hub | Mixed | Secondary market. Port of Rotterdam. |
| **Sweden** | Low | Dedicated tropical importers only | Mixed | Niche market. |
| **Norway/Denmark** | Very low | None found | Unknown | Not recommended for initial outreach. |

**Implication**: Phase 1-7 of the MVP roadmap should prioritize Germany + UK as primary markets, Lithuania as secondary (local advantage), and defer Norway/Denmark.

### 2.4 Contact Discovery Reality

- **Generic emails dominate** (info@, verkauf@, sales@) — 37 of 38 prospects
- **Named contacts found**: 1 company (Magna Wood — andreas@, jesper@)
- **Phone-first culture in timber trade**: German and Lithuanian timber traders prefer calls
- **Email status default** should be `UNKNOWN` or `GUESSED`, not `VALID`

**Implication**: The MVP should treat named contacts as a bonus (see plan §6.8). The Contact Discovery Service should:
- Flag `emailStatus: 'UNKNOWN'` as a valid outcome
- Prioritize finding ANY company email over finding a named person
- Collect phone numbers when available (timber trade phone preference)

### 2.5 Product Knowledge Gaps Affecting Outreach

Based on website scraping, all prospects have specific product knowledge our initial product.md didn't capture:

| What they know | What we should add to products.md |
|---|---|
| FSC certification status | Non-FSC. EUTR documentation from Congo. This is a gate-check for serious EU buyers. |
| Exact density | Ours: ~380 kg/m3. Carl Götz lists theirs at 450. Different origins/specs — need to clarify. |
| MC comparison | Ours: 10-12%. Latham stocks Obeche unspecified MC. Cross Trade: 16%. We're drier — advantage. |
| Grade nomenclature | UK uses "Selects & Better" / "FAS". Germany uses "A" / "A+B". Need equivalence table. |
| Application keywords | Each market uses different terms: Germany — Leisten, Saunabankleisten, Profile. UK — mouldings, joinery, woodwork. |

### 2.6 Response to Objections (Pre-Filled)

| Objection | Response |
|---|---|
| "Is it FSC?" | No. EUTR documentation from Congo available. |
| "What's the price?" | Not yet determined. Can provide on request. |
| "Why Vilnius?" | Stock is physically in Vilnius. Delivery to European ports available. |
| "Is it KD?" | Yes, 10-12% MC. Drier than some market alternatives (Cross Trade lists 16%). |

---

## 3. Adjustments Recommended for the MVP Plan

### 3.1 Data Source Strategy (§16)

Add Brave Search as primary search provider with note:
> Brave Search returned 15 structured results with URLs and snippets in a single session with no rate limit. DuckDuckGo HTML endpoint triggered CAPTCHA after 3-4 queries. Google and Bing block automated access entirely. The `SearchProvider` interface should have `BraveSearchAdapter` as the first implementation.

### 3.2 Knowledge Base Incremental Strategy (§7.1)

Add Phase 0 learnings to the knowledge base:
> Country-specific registries (Rekvizitai.lt for Lithuania, GD Holz for Germany) have been validated. Trade names vary by market: "Abachi" (DE), "Obeche" (UK), "Ayous" (FR/BE). Search queries must use the locally-appropriate name.

### 3.3 Contact Entity (§6.8)

Add note about timber trade contact reality:
> Named procurement contacts are rare in the timber trade. Finding any company email (info@, sales@) is the realistic outcome for automated discovery. Named contacts are a bonus. Phone numbers should be collected when available — timber traders prefer phone communication.

### 3.4 Error Handling (§20)

Add partial result example from Phase 0:
> Batch 003 (Scandinavia): 3 companies found, zero results from Qwant, Brave Search returned all discoverable data. ETT Fine Woods incorrectly classified as Swedish (actually US-based). Scraping validation step caught this. The error handling system should flag country-mismatch discoveries for manual review.

### 3.5 Outreach Rules (§8.9)

Add rule from Phase 0 testing:
> 9. State non-certification upfront if relevant. Do not waste the prospect's time if FSC/PEFC is a hard requirement.

---

## 4. What Phase 0 Did Not Test (Gaps for Phase 1)

| Untested | Why | Impact |
|---|---|---|
| Email verification | No verification provider used | Cannot assess email deliverability |
| Batch qualification via BullMQ | All manual research | Queue-based qualification still theoretical |
| Multi-provider search fallback | Brave Search was sole working provider | Redundancy untested |
| Database persistence | All data in markdown files | Prisma/PostgreSQL integration untested |
| User-facing CLI commands | No NestJS built | CLI design theoretical |
| Lithuanian directory API | Rekvizitai.lt GET-browsed only | API integration untested |
| Non-German language markets | French, Dutch, Polish not searched | Market coverage incomplete |

---

## 5. Immediate Next Steps (Not Architecture)

1. **Send the 4 outreach drafts** — Cross Trade GmbH (call), Latham Timber (email), Duffield Timber (email), Carl Götz (email)
2. **Add origin documentation to products.md** — EUTR docs, phytosanitary, certificate of origin status
3. **Determine price per m³** — Needed before any prospect converts
4. **Diverus website confirmed** — http://www.diverus.com
5. **Test Brave Search API** for programmatic use — rate limits, pricing, structured output

---

## 6. Files Produced During Phase 0

| File | Content |
|---|---|
| `phase-0-research/african-timber-opportunity.md` | Product research, buyer industries, scraping reality check |
| `phase-0-research/knowledge-base.md` | Reusable agent knowledge: names, industries, directories, queries, criteria |
| `phase-0-research/batch-001-qualified-prospects.md` | 12 German/Dutch prospects |
| `phase-0-research/batch-002-qualified-prospects.md` | 11 Lithuanian prospects from Rekvizitai.lt |
| `phase-0-research/batch-003-scandinavia-batch-004-uk.md` | 6 Scandinavian + 10 UK prospects |
| `phase-0-research/top-5-deep-dives-outreach.md` | Deep-dive analysis + outreach drafts for top prospects |
| `phase-0-research/findings.md` | This file |
