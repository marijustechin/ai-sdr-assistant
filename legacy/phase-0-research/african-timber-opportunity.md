# Phase 0 - Validation Research

**Opportunity**: One container (~45 m³) of Abachi timber from Congo, currently in Vilnius
**Target**: Scandinavia, Germany, UK, other European countries
**Date**: 2026-08-05

---

## 1. Product Research Summary

### Material Identity

- **Botanical name**: *Triplochiton scleroxylon*
- **Trade names**: Abachi (Germany), Obeche (Nigeria/UK), Ayous (Cameroon/France), Wawa (Ghana), Samba (Ivory Coast), African whitewood
- **Origin**: Republic of Congo (Congo-Brazzaville), natural range extends across tropical West and Central Africa
- **Density**: ~380 kg/m³ (lightweight hardwood, similar to basswood)
- **Appearance**: Pale yellow, bland grain, sometimes ribbon-stripe on quartersawn
- **Workability**: Easy to work, stains well, good gluing, good finishing
- **Durability**: Non-durable, poor termite/bore resistance — needs proper drying

### Products in Stock

| Product | Specs | Typical Application |
|---|---|---|
| A-Grade KD lumber | 25×210mm, 2-6m, 10-12% MC, predominantly white | Premium mouldings, furniture, joinery |
| A+B Grade KD lumber | 25×95mm, 2.1-6m, 10-12% MC, some discoloration/wormholes | Mouldings, thermal modification feedstock |
| Thermo STS 3D panelling | 20mm, 80mm covering width, thermally modified | Wall/ceiling panelling, decorative interiors |

### Certification

- Not FSC-certified
- Not CITES-listed (species is not regulated under CITES)
- EUTR due diligence documentation would be needed for EU buyers
- Origin: Republic of Congo — buyer will likely ask about legality verification

---

## 2. Buyer Industries (Validated)

Based on technical data (Wood Database, Wikipedia, trade references) and the product dimensions:

### Primary Target Industries

| Industry | Why Abachi fits | Product match |
|---|---|---|
| **Mouldings / Millwork** | Light, easy to machine, paints/stains well, stable once dry | A-grade KD lumber at 25×210mm is an ideal moulding blank |
| **Furniture manufacturing** | Used for interior framing, drawer sides, painted furniture components | Both grades, especially A+B for painted/composite pieces |
| **Interior joinery / carpentry** | Window reveals, door frames, skirting boards, stair components | A-grade KD lumber |
| **Veneer / plywood production** | Major commercial use — sliced/peeled for face veneers, plywood core | Requires log form, less relevant for sawn timber |
| **Sauna construction** | Doesn't overheat, feels cool to skin, used for 25+ years in saunas | Sauna bench seating, wall linings |
| **Thermal modification processors** | A+B grade explicitly "suitable for thermal modification" | Feedstock for thermo-wood producers |
| **Guitar / musical instruments** | Lightweight tonewood, Gibson/PRS/Fender have used it | Body blanks (niche, small volume) |
| **Picture frames** | Easy to work, stable, good for gesso + guilding | Narrower dimensions |

### Likely Purchase Departments

- Procurement Manager / Purchasing Director
- Holzimport / Einkauf (timber buying)
- Production Manager (if smaller company)
- Owner / Geschäftsführer (smaller companies)

---

## 3. Web Scraping Reality Check

### What Worked

- **Wikipedia**: Excellent species info (uses, properties, distribution)
- **Wood Database**: Detailed technical properties, user comments about real applications (sauna, boats, guitars, Tesla dashboards)
- **GD Holz** (German timber trade association): Member list accessible, but fragmented by region and mostly construction timber traders

### What Blocked

| Site | Issue | Implication |
|---|---|---|
| **Kompass.com** | HTTP 403 — bot protection | Major B2B directory is inaccessible to automated scraping |
| **Europages** | JavaScript rendered, content not in HTML | Another major directory needs JS rendering (Playwright) |
| **Fordaq** | HTTP 403 — bot protection | Largest timber trade marketplace blocks automated access |
| **TTF.co.uk** (UK timber trade federation) | Timeout | Possible but slow |
| **TRADA** (UK timber research) | 404 on /obeche/ page | Link rot — content moved |

### Key Insight for MVP

Large commercial directories (Kompass, Europages, Fordaq) are the most valuable data source for company discovery, but they **actively block automated scraping**. This means:

1. **Search engine APIs (Google CSE, Serper) are the more reliable path** — scrape search results, not directory pages
2. **Playwright will be essential** for JS-rendered pages (Europages, Fordaq)
3. **Trade association member lists** (GD Holz, TTF, etc.) are more accessible than commercial directories
4. **Direct company website scraping** is the highest-quality but lowest-volume path

The MVP's "free sources" strategy needs to acknowledge that batch company discovery via directory scraping has a real bot-detection challenge. The search-engine-based approach is more realistic.

---

## 4. Search Query Strategy

Based on the industry and product understanding, effective Google search patterns for finding buyers:

### German-language queries

```text
"Abachi" "Holzimport" OR "Holzgroßhandel" OR "Holzhandel"
"Abachi" kaufen OR Import OR einkaufen
"Tropenholz" Import Deutschland "Furnier" OR "Leisten"
"Obeche" Schnittholz Lieferant
"Ayous" bois import Allemagne
"abachi leisten" OR "abachi profil" Hersteller
"thermoholz" abachi
"saunaholz" hersteller deutschland
```

### English-language queries

```text
"obeche" timber importer UK
"ayous" wood supplier Sweden OR Norway OR Denmark
"abachi" "sauna" manufacturer
"obeche" mouldings manufacturer
tropical hardwood importer scandinavia
timber merchant tropical hardwood germany
```

### Industry-specific queries

```text
"moulding manufacturer" germany "hardwood"
"furniture components" tropical timber
"sauna wood" supplier europe
"thermally modified" wood producer europe
"leistenhersteller" deutschland
"furnierwerk" tropenholz
```

### Abachi-specific competitive intelligence

```text
Companies currently listing Abachi on Fordaq
Companies in GD Holz member list trading tropical hardwood
Companies with "abachi" on their website
```

These search patterns would be programmatically generated by the Company Discovery Service, combining product names (Abachi, Obeche, Ayous, Samba) with buyer role keywords in each language.

---

## 5. Trade Data Snapshot

### Key Import Markets for Tropical Hardwood (General)

Based on ITC trademap patterns (not directly confirmed due to API limits):

- **Germany**: Largest European importer of tropical sawnwood, strong furniture and mouldings industry
- **Netherlands**: Major re-export hub, especially Rotterdam port logistics
- **UK**: Significant tropical timber consumption, strong joinery and mouldings sector
- **Belgium**: Antwerp is a major timber port
- **Nordics**: Higher import of softwood, but niche tropical hardwood for sauna, joinery, furniture

### Relevance to Vilnius Location

Stock in Vilnius, Lithuania means:
- **Logistics radius**: Baltic Sea ports (Klaipėda, Gdansk, Gdynia) → short-haul to Scandinavia, Germany, Poland
- **Natural target**: Nordic/Baltic buyers looking for smaller volumes (one container is small for a major German importer)
- **Cost implication**: Transport from Vilnius to UK adds cost vs. Rotterdam-based stock

---

## 6. Sample Company Deep-Dive (Manual)

I attempted to research individual known tropical timber traders:

| Company | What I could access | What I couldn't |
|---|---|---|
| **Van Dam & Van Stijn** (NL) | Website exists, known tropical hardwood trader | Obeche product page failed to load (transport error) |
| **TT Timber** (DE) | Website exists | /abachi product page returned 404 |

**Key finding**: Even when you know a company name, individual product pages on timber trader websites can be unreliable (404s, dead links, JS rendering). Product catalogs change. Scraping a known importer's website doesn't guarantee you'll find their current inventory.

---

## 7. Email Validation Test

Abachi-specific observation: email discovery will be challenging because:

- Timber importers are often smaller family businesses — contact info is on static "Kontakt" pages, not LinkedIn
- Procurement contacts are rarely public
- Generic `info@` and `verkauf@` addresses are the norm
- Phone-first culture in the timber trade (many German Holzimport companies prefer calls)

This means the Contact Discovery Service should prioritize:
1. Finding ANY contact (even generic `info@`) — better than nothing
2. Flagging phone numbers when available
3. Not generating a fake email if the pattern can't be inferred

---

## 8. Critical Path for Automated MVP

What must work for the system to produce useful output:

1. **Search API → Company names + websites**: Google CSE or Serper reliably returns search results with company names and URLs. This is the core data pipeline.

2. **Website scraping → Company information**: Once you have a URL, basic scraping (Cheerio) can extract company description, location, industries. Most timber trader websites are static HTML or WordPress, not heavy SPA apps.

3. **LLM-based qualification → Fit/no-fit**: Given a company description and the ICP (tropical hardwood importer, manufacturing buyer in target industries), the LLM can score. This is the least risky part — LLMs are good at classification.

4. **Email discovery → Pattern or nothing**: The hardest part. Many companies won't have public procurement emails. The system should accept `emailStatus: 'UNKNOWN'` as a valid outcome and not force-feed fake emails.

### What's Hard and Should NOT Be Over-Promised

- Per-contact personalized emails — there won't be enough research data for most companies
- Contact discovery at scale — most timber traders don't list procurement staff online
- Batch email verification — verifying 100 emails requires a paid provider

A more realistic Phase 0 goal: **20 companies, 5 with usable emails, 3 with credible outreach drafts**. That would already beat manual spreadsheet work.

---

## 9. Draft Email Template (Manual)

Based on the product and target industries:

```
Subject: Abachi KD lumber — 45 m³ from Vilnius

Hallo Herr [Name],

wir haben aktuell etwa 45 m³ kammergetrocknetes Abachi-Schnittholz (10-12% MC) in Vilnius verfügbar — A-Grade (25x210mm, 2-6m) und A+B-Grade (25x95mm, 2,1-6m).

Herkunft ist die Republik Kongo. Bei Interesse kann ich Ihnen ein detailliertes Angebot mit Abmessungen und Lieferkonditionen zukommen lassen.

Mit freundlichen Grüßen
[Name]
```

This is 3-4 sentences. It states what's available with actual dimensions. It's shorter than most cold emails. It doesn't pretend to know the company's specific needs. A human could send this to 20 timber traders in 10 minutes.

---

## 10. MVP Implications Summary

| What the plan assumed | What Phase 0 reveals |
|---|---|
| Directories like Kompass/Europages are scrapable | They actively block bots. Search-engine-based discovery is more realistic. |
| Company websites contain rich procurement data | Most timber trader sites are basic — contact info is generic email, not named buyers. |
| Free email verification works at scale | Not tested yet, but the bigger problem is finding emails at all. |
| LLM can deeply research each company | Market-level research (industries, trends) is LLM-strong. Company-level research depends on available web content — thin for small traders. |
| 20 companies with personalized outreach is achievable | 20 companies? Yes. 20 with personalized (not generic) emails? Unlikely — most won't have enough public data. 5 with credible personalization is realistic. |
| Contact discovery is separate from company discovery | Confirmed essential. Finding a company ≠ finding the buyer. |

---

## Bottom Line

The workflow is viable. The biggest risk is not the AI quality — it's the **data scarcity** downstream of company discovery. A German timber importer's website will typically have: company name, address, product categories, and an `info@` email. That's enough to decide "yes, they probably buy Abachi" but not enough to write a deeply personalized email.

The system should produce output like:

```
Company: XYZ Holzimport GmbH
Industry: Tropical timber wholesale
Location: Hamburg, DE
Website: xyz-holz.de
Fit: HIGH (imports tropical hardwood, has own kilns, ships EU-wide)
Contact: info@xyz-holz.de (generic, no named buyer found)
Draft: "We have 45m³ KD Abachi in Vilnius, A-grade 25x210mm..."
Status: Ready for human review — consider calling for buyer name
```

This is a "warm lead list" model rather than a "personalized cold email" model. That distinction matters for the MVP scope.
