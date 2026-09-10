# Reusable Agent Knowledge Base

*Updated: 2026-08-05*

---

## 1. Product Names, Synonyms and Search Terms

### Primary Names

| Name | Region/Language | Usage |
|---|---|---|
| Abachi | German-speaking markets | Most common trade name in DE/AT/CH |
| Obeche | UK, Nigeria, international trade | Common in UK and English-language trade |
| Ayous | France, Cameroon, francophone Africa | French market |
| Samba | Ivory Coast | Less common in EU |
| Wawa | Ghana | Less common in EU |
| African whitewood | Generic English | Descriptive, useful for search breadth |

### Search Term Combinations

Each product name should be combined with buyer-role keywords in the target language:

| Language | Product terms | Buyer role terms | Industry terms |
|---|---|---|---|
| German | Abachi, Obeche, Ayous | Holzimport, Holzgroßhandel, Holzhandel, Einkauf, Lieferant, Händler | Tropenholz, Schnittholz, Leisten, Profile, Möbelholz, Furnier, Saunaholz, Thermo |
| English | Obeche, Abachi, Ayous | timber importer, timber merchant, timber wholesaler, wood supplier | tropical hardwood, sawn timber, mouldings, millwork, furniture components, sauna wood |
| Swedish | Abachi, Obeche, Ayous | träimport, trähandel, trägrossist, virkesleverantör | tropiskt trä, sågat virke, lister, möbelträ, bastuträ |
| Norwegian | Abachi, Obeche, Ayous | treimport, trelasthandel, tregrossist | tropisk tre, skurlast, listverk, møbelmaterialer, badstue |
| Danish | Abachi, Obeche, Ayous | træimport, træhandel, trægrossist | tropisk træ, savet træ, lister, møbeltræ, saunatræ |

---

## 2. Target Buyer Industries and Profiles

### Verified Buyer Industries

| Industry | Confidence | Evidence |
|---|---|---|
| Mouldings/Millwork/Profilherstellung | HIGH | Abachi is a premier moulding wood — stable, paintable, easy to machine |
| Furniture manufacturing | HIGH | Used for interior framing, drawer sides, painted components |
| Interior joinery/carpentry | HIGH | Window reveals, door frames, skirting, stairs |
| Sauna manufacturing and supply | HIGH | Documented use: cool to touch, stable, durable in sauna conditions |
| Thermal wood modification | HIGH | Product explicitly marketed as suitable for thermal modification |
| Veneer/plywood production | MEDIUM | Major commercial use, but requires log form (less relevant for sawn timber) |
| Musical instruments | MEDIUM | Gibson, PRS, Fender have used it, but volumes are tiny |
| Picture frame manufacturing | MEDIUM | Used with gesso + gilding, but small volumes |
| Boat building (racing) | LOW | Historical use, small niche |
| Automotive interiors | LOW | Tesla used it historically |

### Buyer Persona Profiles

| Persona | Job Titles | Department | Decision Level |
|---|---|---|---|
| Procurement | Einkaufsleiter, Purchasing Manager, Procurement Director, Leiter Einkauf, Inköpschef | Procurement/Purchasing | BUYER |
| Owner/Director | Geschäftsführer, CEO, Owner, Inhaber, VD | Executive | DECISION_MAKER |
| Production | Produktionsleiter, Production Manager, Werkstattleiter | Production | INFLUENCER |
| Timber Buyer | Holzeinkäufer, Holzimporteur, Timber Buyer | Purchasing | BUYER |

---

## 3. Country-Specific Discovery Sources

### Germany (DE)

| Source | Type | URL | Access | Content |
|---|---|---|---|---|
| GD Holz (Gesamtverband Deutscher Holzhandel) | Trade association | gdholz.de | Public member list by region | Timber wholesalers and traders. ~1,000 members |
| VDM (Verband der Deutschen Möbelindustrie) | Trade association | moebelindustrie.de | Members page | Furniture manufacturers |
| ZDH (Zentralverband Deutsches Handwerk) | Craft association | zdh.de | Directory | Joinery and carpentry businesses |
| DIE DEUTSCHE HOLZINDUSTRIE | Trade body | holzindustrie.de | Members | Sawn timber and wood products |
| Handelsregister | Official registry | handelsregister.de | Free search | Company registration data |
| Bundesanzeiger | Official journal | bundesanzeiger.de | Free search | Financial filings, annual reports |
| Google Maps (DE) | Maps | maps.google.com | API/Search | Local businesses by category |
| Wer liefert was (WLW) | B2B directory | wlw.de | Search-indexed | Supplier directory |
| Gelbe Seiten | Directory | gelbeseiten.de | Search-indexed | Business listings |
| Firmenwissen | Company database | firmenwissen.de | Search-indexed | Company profiles from Creditreform |
| Kompass DE | B2B directory | de.kompass.com | BLOCKED — can use Google-indexed pages | Company profiles |
| Europages DE | B2B directory | europages.de | JS-rendered — use Playwright or indexed pages | European B2B |

### United Kingdom (UK)

| Source | Type | URL | Access | Content |
|---|---|---|---|---|
| TTF (Timber Trade Federation) | Trade association | ttf.co.uk | Public member list | Timber importers, merchants, manufacturers |
| BWF (British Woodworking Federation) | Trade association | bwf.org.uk | Members directory | Joinery manufacturers |
| Companies House | Official registry | gov.uk/get-information-about-a-company | Free API | Company registration |
| Google Maps (UK) | Maps | maps.google.com | API/Search | Local businesses |
| Yell.com | Directory | yell.com | Search-indexed | Business listings |
| Europages UK | B2B directory | europages.co.uk | JS-rendered | European B2B |
| Kompass UK | B2B directory | gb.kompass.com | BLOCKED | Company profiles |
| Fordaq UK | Timber marketplace | fordaq.com | BLOCKED | Timber trade listings |

### Scandinavia

| Source | Type | URL | Access | Content |
|---|---|---|---|---|
| TMF (Trä- och Möbelföretagen) — SE | Trade association | tmf.se | Members | Wood and furniture industry |
| Svenskt Trä — SE | Industry body | svenskttra.se | Public | Wood industry |
| Treindustrien — NO | Trade body | treindustrien.no | Members | Wood industry |
| Træinformation — DK | Industry body | trae.dk | Public | Wood industry |
| Proff (SE, NO, DK) | Company database | proff.se/no/dk | Search-indexed | Credit and company data |
| Eniro (SE, NO, DK) | Directory | eniro.se/no/dk | Search-indexed | Business directory |
| Google Maps (Nordics) | Maps | maps.google.com | API/Search | Local businesses |

### Lithuania (LT)

| Source | Type | URL | Access | Content |
|---|---|---|---|---|
| **Rekvizitai.lt** | Company directory | rekvizitai.lt | Public | Full company profiles, financials, contacts — practically all LT companies |
| VMI (Lithuanian Tax Authority) | Official | vmi.lt | Public | Taxpayer registry |
| Verslo žinios | Business news | vz.lt | Paywalled/subscription | Company news and rankings |
| Europages LT | B2B directory | europages.lt | JS-rendered | European B2B |
| LDB (Lithuanian Timber Association) | Trade association | — | To confirm existence | Timber industry |

### General / Multi-Country

| Source | Type | URL | Access | Content |
|---|---|---|---|---|
| Google Search (CSE / Serper) | Search | — | API (100/day free CSE, paid tiers) | Primary company discovery source |
| Google Maps Places API | Maps | — | API (monthly free tier) | Location-based business discovery |
| Fordaq | Timber marketplace | fordaq.com | BLOCKED — use Google-indexed pages | Timber trade, listings |
| Europages | B2B directory | europages.com | JS-rendered — use indexed pages or Playwright | Multi-country B2B |
| Kompass | B2B directory | kompass.com | BLOCKED — use Google-indexed pages | Global B2B |
| EUROPAGES API | B2B API | developer.europages.com | API (requires registration) | B2B supplier data |
| OpenCorporates | Company database | opencorporates.com | API (rate limited free tier) | Global company registry |
| ITC Trade Map | Trade data | trademap.org | Free registration | Import/export statistics |
| Facebook Business Pages | Social | facebook.com | Limited API | Some companies have business pages |
| Industry trade fair exhibitor lists | Events | varies (LIGNA, Holz-Handwerk, interzum, Domotex) | Public exhibitor lists | High-quality lead source |

---

## 4. Effective Search Query Patterns

### German Market (Highest Priority)

```
"abachi" OR "obeche" holzimport OR holzhandel OR holzgrosshandel
"abachi" schnittholz OR leisten OR profile
"tropenholz" import deutschland holzhandel
"obeche" timber OR lumber germany
"triplochiton scleroxylon" kaufen OR import OR einkauf
"ayous" OR "samba" OR "abachi" furnier OR möbel
abachi sauna hersteller OR lieferant
"thermoholz" hersteller deutschland
"leistenwerk" deutschland tropenholz
"holzfachhandel" abachi OR tropenholz
```

### Scandinavia

```
"obeche" OR "abachi" OR "ayous" timber supplier sweden OR norway OR denmark
"träimport" tropiskt trä OR ädelträ sverige
"trelasthandel" tropisk OR ädelträ norge OR danmark
"bastuträ" OR "bastu" leverantör OR tillverkare sverige
"listverk" OR "lister" tillverkare OR trä sverige OR norge
```

### UK

```
"obeche" timber importer OR merchant OR supplier UK
"tropical hardwood" importer OR merchant UK
"timber importer" hardwood OR mouldings UK
"hardwood merchant" UK obeche OR ayous
```

### Generic / Cross-Market

```
site:fordaq.com obeche OR abachi OR ayous
site:europages.com obeche OR abachi
site:kompass.com abachi
```

---

## 5. Source Limitations and Access

| Constraint | Details |
|---|---|
| **Kompass blocks automated scraping** | HTTP 403. Use only Google-indexed snippets and cached pages. |
| **Europages requires JavaScript** | Content rendered client-side. Options: Playwright, cached Google snippets, or Europages API. |
| **Fordaq blocks automated scraping** | HTTP 403. Use Google-indexed pages (`site:fordaq.com`). |
| **Google CSE free tier** | 100 queries/day. Paid tiers available for scale. |
| **Serper.dev** | No free tier. Starts ~$50/mo for 2,500 queries. Good for MVP scale. |
| **Google Maps Places API** | $17/1,000 searches (billed). Free monthly credit ~$200 → ~11,700 searches/month free. |
| **OpenCorporates API** | 500 requests/month free. Sufficient for company validation. |
| **ITC Trade Map** | Free with registration. Manual download of trade data. |
| **Trade fair exhibitor lists** | LIGNA: biennial (next May 2027). interzum: biennial. Good for pre-qualified leads but time-bound. |
| **LinkedIn scraping** | Not recommended for MVP. Terms of service prohibit scraping. Use for manual validation only. |

### Strategy for Blocked Sources

Directories that block scraping should still be used through:
1. **Google-indexed pages** (`site:kompass.com timber`) — cached snippets
2. **Official APIs** where available (Europages has a developer API)
3. **Playwright** for JS-rendered pages with proper rate limiting
4. **Validation** — use directory results to confirm companies found elsewhere

---

## 6. Prospect Qualification Criteria

### For the Abachi Timber Opportunity

| Criterion | Weight | Evidence required |
|---|---|---|
| **Product match** (imports/sells/buys tropical hardwood) | 30 | Website mentions tropical hardwood, hardwood timber, or specific species |
| **Industry fit** (mouldings, furniture, joinery, sauna, thermo-wood, timber wholesale) | 30 | Website, directory listing, or trade association membership |
| **Location match** (target country + logistics viable) | 15 | Address in target country, distance from Vilnius/Klaipėda |
| **Company type** (importer, manufacturer, wholesaler — not retailer-only) | 15 | Description, industry classification |
| **Size/volume fit** (can absorb ~45 m³) | 5 | Employee count, customer base, warehouse mentions |
| **Favourable signals** (mentioned on Fordaq, trade fair exhibitor, GD Holz member, imports from Africa) | 5 | Specific evidence per signal |

### Scoring

```
HIGH (score ≥ 70): Strong product/industry match with location fit. Should be contacted.
MEDIUM (score 50–69): Plausible match but missing key information. Worth validation.
LOW (score 30–49): Relevant industry but low-confidence match. Low priority.
INCONCLUSIVE (score < 30): Not enough data to assess. Defer.
```

---

## 7. Compliance Questions and Product Gaps

### Common Buyer Questions (Anticipated)

| Question | Current Answer | Gap |
|---|---|---|
| Is the wood from legal sources? | Origin: Republic of Congo | EUTR due diligence documentation not yet prepared |
| Is it FSC certified? | No | Would limit some buyers — document this upfront |
| What are the shipping terms? | Delivery can be arranged to European ports | No specific Incoterms yet |
| What is the price per m³? | Not yet determined | Critical for outreach escalation |
| What is the exact volume/weight per bundle? | ~45 m³ total | Bundle breakdown not provided |
| Are phytosanitary certificates available? | Not specified | Required for EU import |
| Is the wood bark-free / ISPM-15 compliant? | Not specified (KD process should cover this) | Should be confirmed |
| What documentation accompanies the shipment? | Not specified | Certificate of origin, invoice, packing list, phytosanitary |

### Information to Request from Seller

- Unit price per m³ (EXW Vilnius)
- Bundle/pack breakdown (pieces per dimension, weight)
- Available documentation (phytosanitary, certificate of origin, EUTR docs)
- Heat treatment / ISPM-15 status
- Preferred Incoterms
- Payment terms

---

## 8. Lessons Learned from Search Batches

### 2026-08-05 — Initial Scraping Test

- **Directories block bots**: Kompass, Europages, Fordaq all return 403 or require JS rendering. Search-engine-based discovery is the reliable path.
- **GD Holz member list is accessible**: German timber trade association publishes member lists by region. The challenge is filtering ~1,000 members to find tropical hardwood traders.
- **Timber trade is Google-unfriendly**: Many timber importers have basic websites with poor SEO. A company that imports millions in tropical timber might have a single-page WordPress site from 2015.
- **Generic contacts are the norm**: Procurement contacts are almost never public. `info@` and `verkauf@` addresses dominate.
- **Abachi has many trade names**: Searches that use only "Abachi" miss companies that call it "Obeche" or "Ayous." Multi-name queries are essential.

### 2026-08-05 — Batch 001 (Germany)

- **DuckDuckGo HTML endpoint effective but fragile**: 3-4 queries per session before CAPTCHA challenge. Not suitable for production volume. Production needs Serper, Brave Search API, or Google CSE.
- **Germany has the densest Abachi market**: 11 of 12 companies found were German. Abachi is primarily a German-trade-name phenomenon. Other countries use Obeche/Ayous. German is the right first market.
- **Two distinct buyer types emerge**: (a) Tropical hardwood importers/wholesalers who import from Africa (Cross Trade GmbH is the archetype), (b) Timber merchants who carry Abachi as one of many species in their catalog. Importers buy container loads. Merchants buy smaller volumes from importers. Both are valid but require different outreach.
- **Named procurement contacts remain elusive**: None of 12 companies listed a timber buyer or purchasing manager by name. Generic info@ addresses dominate. Named contacts are a bonus, not a requirement.
- **Cross Trade GmbH is the standout lead**: Bremen-based, explicitly imports Ayous from Africa, tropical timber specialist. A phone call to them would validate the entire Phase 0 hypothesis.
- **Default email pattern**: info@company.tld dominates German timber trader websites. verkauf@ occasionally. Named individuals: very rare.
- **Search query modifiers that worked well**: Quoting "abachi" with OR combinations ("abachi" OR "obeche" OR "ayous") produced the most relevant results. Product-only queries returned information pages. Adding "holzimport" or "holzgrosshandel" narrowed to actual traders but reduced result count.
- **GD Holz member list not useful for Abachi**: The regional member lists are dominated by construction timber merchants (KVH, BSH, decking) rather than tropical hardwood specialists. Trade association lists need filtering — not all members are relevant.

### 2026-08-05 — Multi-country search limitations

- **DuckDuckGo caps international searches by IP**: Non-English non-German queries may trigger different rate limits. Multi-country search strategy needs parallel search provider access.
- **"Abachi" is a German-language search term**: Searching for "abachi" in UK/Swedish contexts returns mostly German results. Need to use "obeche" (UK), "ayous" (FR/BE), or local name equivalents for non-DE markets.

### 2026-08-05 — Batch 002 (Lithuania)

- **Rekvizitai.lt validated as a discovery source.** Category pages accessible via GET (no form submission needed). 4,161 companies in "wood and its products" category, 1,630 in "forestry and forest goods." Company data includes: name, address, categories, description. Individual company pages load at /en/company/xxx/ with full details including website URLs, VAT info, financial data, and maps.
- **Lithuania has a sauna manufacturing cluster.** 3 sauna/tub manufacturers found in first 40 results (EDJUSTA, Elucida, Seilas). Abachi's sauna application — cool to touch, stable, widely used for sauna benches — has direct domestic Lithuanian buyers.
- **Thermo-wood is produced domestically.** ESSPO (Anykščiai) manufactures thermally modified wood. Our A+B grade is explicitly "suitable for thermal modification." This is a direct product application match in the stock country.
- **Lithuanian timber companies are smaller than German ones.** Most discovered companies are MB (small partnership) or small UAB, not national-scale wholesalers. One container (~45 m³) is a significant order for most Lithuanian timber companies.
- **Two distinct Lithuanian buyer types:** (a) timber importers/exporters who resell internationally (Diverus, Vilterra — both founded 2004, established), (b) sauna/tub/thermo manufacturers who consume wood as feedstock (ESSPO, EDJUSTA — direct application match).
- **Diverus is the standout Lithuanian lead:** "Leading timber import and export company for softwood, hardwood, sawn, and round timber, operating in Europe." Founded 2004. Based in Vilnius — same city as stock location. Explicitly handles hardwood.
- **Rekvizitai.lt search limitation:** The advanced search requires form submission (POST). Cannot be fetched via GET URL. Category browsing is the workaround — browse by category then filter visually, or use Rekvizitai's "search API" (they sell company databases in Excel format).
- **Batch 001-002 combined:** 23 qualified prospects (12 DE/NL, 11 LT). The Lithuanian prospects complement the German ones: German buyers are established importers/traders of Abachi, Lithuanian buyers are potential domestic consumers (manufacturing feedstock).

### 2026-08-05 — Combined Batches 003 (Scandinavia) & 004 (UK)

- **Brave Search is the production-grade search engine for this MVP.** Unlike DuckDuckGo (CAPTCHA after 3-4 queries) and Google/Bing (block all automated access), Brave Search returned detailed, structured results with URLs, snippets, and company names. It handles site: filters and OR operators. It showed TTF, TTJ Buyers Guide, Fordaq, and individual company website results all in one query. No rate limit observed within session. Recommended as the primary provider for Company Discovery Service.
- **Qwant returned zero visible results.** Empty search output pages across multiple queries. Not usable for automated discovery.
- **UK has the strongest Obeche market after Germany.** 9 companies stock or trade Obeche explicitly. The UK uses "Obeche" (commonwealth/nigerian trade nomenclature), unlike Germany's "Abachi." Latham Timber (LTHM.L — publicly listed) is the standout, with a dedicated Obeche product page listing dimensions 25-100mm KD.
- **Scandinavian results are thin.** Obeche/Abachi is primarily a German- and UK-market wood. In Scandinavia, the hardwood import market is dominated by American and European species (oak, ash, alder, birch). Only ETT Fine Woods (25+ tropical species direct importer) and Magna Wood (Sweden's leading hardwood importer) are relevant.
- **Fordaq lists Obeche companies but blocks access.** Brave Search indexed pages confirm Fordaq has Obeche/Abachi company directories for Norway, Slovenia, and global. Individual company names are behind login/paywall. Can be used for validation ("does this company trade Obeche on Fordaq?") but not for primary discovery.
- **UK timber trade uses TTJ Buyers Guide.** Listed timber importers by category. Accessible at ttjbuyersguide.com. Timeout on direct fetch — may need different access method.
- **Duffield Timber publishes content about Thermo-Ayous.** This directly matches our Thermo STS 3D panelling product. Third-generation family importer. They understand both the raw lumber and the thermally modified variant — the best UK prospect for both product lines.
- **Trade association member lists vary in accessibility:** TTF (UK) — timed out. TMF (Sweden) — page loaded, search is JS-only. GD Holz (Germany) — member lists browsable but region-specific and dominated by construction timber. These are secondary sources, not primary discovery.
- **Combined discovery: 38 qualified prospects from 4 markets (DE, UK, LT, Scandinavian).** 22 scored HIGH (70+). Germany and UK dominate, Lithuania has domestic manufacturing buyers, Scandinavia is thin but has key importers.
- **Vandecasteele Houtimport (Belgium) is a potential volume buyer** but our non-FSC product may be a barrier given their FSC/PEFC-certified focus.
- **Named contacts found for Magna Wood (Sweden):** andreas@magnawood.se (COO), jesper@magnawood.se (Sales) — rare find. Most other prospects still have generic contacts only.

### 2026-08-05 — Cross-Batch Pattern: Countries Where Obeche/Abachi Has Commercial Presence

- **Strong markets:** Germany, UK, Netherlands. These countries have mature tropical hardwood import sectors. Obeche/Abachi is a standard species in their product catalogs.
- **Niche markets:** Lithuania (domestic sauna/thermo manufacturing), Belgium (via Vandecasteele and port of Antwerp).
- **Thin markets:** Sweden, Norway, Denmark. Tropical hardwood is dominated by other species (mahogany, teak, iroko). Obeche/Abachi has minimal presence.
- **Search language pattern:** "Abachi" → German companies. "Obeche" → UK/commonwealth companies. "Ayous" → French/Belgian companies. Searches must use the locally-appropriate trade name.
