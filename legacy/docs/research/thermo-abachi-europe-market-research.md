# Thermo Abachi Cladding — European B2B Market Research

**Run ID:** thermo-abachi-europe-2026-09-09
**Retrieval date:** 2026-09-09
**Harness version:** 1.0.0 (see `docs/market-research-harness.md`)
**Researcher:** manual (assisted)
**Launch language:** English

> **Evidence discipline:** Every material finding below carries a claim type (FACT / INFERENCE / UNKNOWN) and confidence (HIGH / MEDIUM / LOW) and references the source register (`thermo-abachi-source-register.csv`). Nothing about stock, origin, price-to-us, MOQ, or delivery is assumed — those stay UNKNOWN unless a source states them.

---

## 0. Run Manifest

```yaml
runId: thermo-abachi-europe-2026-09-09
opportunity: Thermo Abachi cladding (STS 3D, 20 mm, 80 mm cover, Europe, B2B)
language: en
confirmedFacts:
  product: Thermo Abachi / Thermo Ayous cladding
  profile: STS 3D
  thicknessMm: 20
  coverageWidthMm: 80
  region: Europe
  focus: B2B
  buyerGroups: [sauna manufacturers, sauna installers/contractors, specialist timber distributors, interior and wall-panel manufacturers]
unknowns: [stock qty/location, origin, delivery terms, price/MOQ, lengths/tolerances/grades/packaging/finishes, certifications/legality, thermal-performance, samples/projects]
budgets: { maxQueries: 30, maxPages: 15, maxMinutes: 60, maxSources: 40 }
```

**Historic-data rule applied:** the historic ~45 m³ KD Abachi lumber prospect batches were used only to seed terminology and to flag companies for re-validation. They are not evidence here.

---

## 1. Product Naming by Country

| Term | Market | Claim type | Confidence | Source |
|---|---|---|---|---|
| **Abachi** | Germany / German-speaking markets | FACT | HIGH | S01 |
| **Obeche** | UK, Nigeria, Commonwealth trade | FACT | HIGH | S01 |
| **Ayous** | France / francophone markets | FACT | HIGH | S01 |
| **Wawa** | Ghana | FACT | HIGH | S01 |
| **Sambawawa / Samba** | Ivory Coast | FACT | HIGH | S01 |
| **African whitewood** | generic English | FACT | HIGH | S01 |
| **Thermo-Ayous** | UK cladding trade term (thermally modified Ayous) | FACT | HIGH | S04 |

- Species = *Triplochiton scleroxylon* (Malvaceae) — FACT, HIGH (S01).
- The thermally modified cladding product is sold in the UK English-language market primarily as **"Thermo-Ayous"** (S04). The German-language equivalent naming ("Thermo-Abachi", "thermisch modifiziertes Abachi") is the expected translation but was not confirmed from a primary German source this run — **INFERENCE, LOW** (S01 naming + S03 ThermoWood terminology). Needs a German supplier source to confirm.
- **Search implication:** English-language launch should optimise on "Thermo-Ayous" and "thermally modified Ayous/Abachi", with "Obeche" as a secondary term and "Thermo-Abachi" for any DE-market targeting.

---

## 2. Priority Countries and Buyer Segments

### Priority countries

| Country | Signal | Claim type | Confidence | Source |
|---|---|---|---|---|
| **United Kingdom** | Strongest documented Thermo-Ayous cladding market; dedicated merchants, case studies, published prices | INFERENCE (from multiple supplier FACTs) | HIGH | S04, S05, S06 |
| **Germany** | Largest European tropical-sawn-wood market; uses "Abachi" name; mature thermo-wood industry | INFERENCE | MEDIUM | S01 (naming), historic methodology only |
| **Finland / Estonia / Baltics** | Origin of industrial ThermoWood; Thermory (Estonia) is the market-leading brand | FACT | HIGH | S03 |
| **France / Belgium** | "Ayous" name; francophone wood-trade demand | INFERENCE | LOW | S01 (naming only) |

### Buyer segments (initial target groups cross-referenced to evidence)

| Buyer group | Evidence fit | Claim type | Confidence |
|---|---|---|---|
| Sauna manufacturers | Thermo-wood's historical base use is sauna materials (Finland/Estonia) | INFERENCE | MEDIUM | S03 |
| Sauna installers/contractors | Thermo-wood historically supplied the sauna market | INFERENCE | LOW | S03 |
| Specialist timber distributors / merchants | Duffield Timber (UK) is the archetype — imports, machines, sells Thermo-Ayous cladding to trade | FACT | HIGH | S04, S05, S06 |
| Interior and wall-panel manufacturers | Thermo-Ayous used for interior ceilings and wall features | FACT | HIGH | S04 (interior ceiling case study), S05 |

---

## 3. Suppliers and Competing Products

| Supplier / product | Market | Evidence | Claim type | Confidence | Source |
|---|---|---|---|---|---|
| **Duffield Timber** (Melmerby, UK, est. 1957) | UK | Imports and machines Thermo-Ayous cladding; 8 cladding species, 13 profiles; FSC-certified Thermo-Ayous available; factory coatings (Burnblock, Colourflex, Chartex, SiOO:X, Teknoclad) | FACT | HIGH | S04, S05, S06 |
| **Thermory** (Estonia, brand of Brenstol) | EU-wide | Market-leading thermally modified wood brand; sauna materials + exterior cladding/decking | FACT | HIGH | S03 |
| **ThermoWood** (trademark, Intl. ThermoWood Association; Finland origin) | EU | Registered trademark / treatment standard (Thermo-S, Thermo-D) | FACT | HIGH | S03 |
| Western Red Cedar (competing species) | UK/EU | Direct competitor at cladding level; ~10–15% premium vs Thermo-Ayous | FACT | HIGH | S05 |
| Thermo-Nordic Pine, Thermo-Tulipwood CAMBIA, Accoya, Siberian Larch | UK/EU | Adjacent/competing cladding species at Duffield and other merchants | FACT | HIGH | S06 |

**Competing-product note (for positioning):** Thermo-Ayous is marketed in the UK as the *clear-grade, knot-free, medium-brown* option that undercuts Western Red Cedar on price while matching durability class. This is the existing market frame our product must enter — FACT, HIGH (S05).

---

## 4. Comparable Dimensions, Profiles and Applications

### Target product vs market evidence

| Attribute | Target product (confirmed) | Market-comparable evidence | Claim type | Confidence | Source |
|---|---|---|---|---|---|
| Thickness | **20 mm** | "Standard thickness for timber cladding is 20 mm" | FACT | HIGH | S06 |
| Profile family | **STS 3D** | UK merchants machine "DTC" profiles (DTC14/DTC19 shadow gap, DTC2/DTC3 V-groove, DTC25 featheredge, DTC27/28 rainscreen); "STS" is a proprietary/alternative nomenclature — equivalence to DTC not confirmed | INFERENCE | MEDIUM | S06 |
| Coverage width | **80 mm** | DTC14 secret-nail = 92 mm board / 78 mm cover; DTC2 V-groove = 94 mm / 86 mm cover; featheredge = 144 mm / 129 mm cover | FACT (board/cover figures) | HIGH | S06 |
| Application | wall/ceiling cladding | Exterior cladding, interior ceilings, wall features, fencing | FACT | HIGH | S04, S05, S06 |

**STS 3D profile:** no primary source defined "STS 3D" this run. It is treated as a supplier-specific profile name. **UNKNOWN** whether STS 3D is equivalent to any standard DTC profile — a decision required from Eimantas.

### Comparable applications (FACT, HIGH)

- Exterior residential cladding (shadow-gap, open, featheredge) — S04, S06.
- Interior timber ceilings and wall features — S04.
- Fencing (18 × 45 mm slats) — S05.

---

## 5. Public Prices (retail/list separated from B2B)

| Product | Price basis | Value | Unit | As of | Claim type | Confidence | Source |
|---|---|---|---|---|---|---|---|
| Thermo-Ayous vertical shadow-gap cladding (DTC14) | retail/list, excl. VAT | £57.70 | /m² | Jan 2026 | FACT | HIGH | S05 |
| Western Red Cedar vertical shadow-gap cladding (DTC14) | retail/list, excl. VAT | £67.30 | /m² | Jan 2026 | FACT | HIGH | S05 |
| Thermo-Ayous fencing slats 18 × 45 mm | retail/list, excl. VAT | £45.45 | /m² | Jan 2026 | FACT | HIGH | S05 |
| Western Red Cedar fencing 18 × 45 mm | retail/list, excl. VAT | £50.00 | /m² | Jan 2026 | FACT | HIGH | S05 |
| **B2B / trade price for Thermo-Abachi cladding** | B2B | — | — | — | **UNKNOWN** | — | — |

**Price normalisation note:** figures above are UK retail/list, excl. VAT, per m², as published by Duffield Timber (S05). They are a **market reference point only**. No B2B price, no price-to-our-product, and no price in EUR were found. Do not treat the £57.70/m² as our price — that is the *competitor's* retail/list.

**Derived (INFERENCE, LOW):** at an indicative £/m² retail in the low-£60s, Thermo-Ayous cladding is positioned below Western Red Cedar. This is a *positioning* signal, not a pricing decision.

---

## 6. Associations, Directories, Trade Fairs and Terminology

| Item | Type | Evidence | Claim type | Confidence | Source |
|---|---|---|---|---|---|
| International ThermoWood Association | Association / trademark owner | Defines ThermoWood trademark + Thermo-S/Thermo-D treatment classes | FACT | HIGH | S03 |
| Thermo-S (stability) / Thermo-D (durability) | Terminology | Standard treatment classes | FACT | HIGH | S03 |
| EN 350-2 durability classes | Standard | Thermal modification can raise durability to Class 1–3 | FACT | HIGH | S03 |
| EN 13501-1 (fire) | Standard | Burnblock-treated cladding reaches Euroclass B, B-s1,d0 | FACT | HIGH | S06 |
| DTC profile codes | Terminology | Merchant profile naming convention (DTC2…DTC50) | FACT | HIGH | S06 |
| Trade fairs | Directory | Not retrieved this run (LIGNA, interzum, Holz-Handwerk appear in historic notes only) | UNKNOWN | — | historic only |

**Thermal-performance claim rule:** thermal modification is documented to improve dimensional stability and decay resistance but *reduce* bending strength (up to ~30%) — FACT, MEDIUM (S03). We must NOT attach unverified thermal-performance numbers to our own product.

---

## 7. Risks and Market Gaps

| # | Risk / gap | Claim type | Confidence | Source |
|---|---|---|---|---|
| 1 | **"STS 3D" is not a recognised public profile name.** If buyers search by DTC profiles, we may be invisible. Profile-name equivalence must be established. | INFERENCE | MEDIUM | S06 |
| 2 | **Naming fragmentation.** UK buyers know "Thermo-Ayous"/"Obeche"; German buyers know "Abachi". A single English-language name may under-serve non-UK buyers. | INFERENCE | MEDIUM | S01, S04 |
| 3 | **Thermo-wood is dominated by established brands** (Thermory, ThermoWood trademark). Entry must differentiate on species (Ayous) and/or price/service, not on the generic "thermo" claim. | INFERENCE | MEDIUM | S03 |
| 4 | **Certification is a gate for the cladding trade.** Leading merchants sell FSC-certified Thermo-Ayous. Our certification/legality status is UNKNOWN and may be a hard requirement for distributors. | FACT (merchant sells FSC) + UNKNOWN (ours) | HIGH | S04 |
| 5 | **20 mm is the standard, not a differentiator.** "20 mm" matches the market standard; it is not a selling point by itself. | FACT | HIGH | S06 |
| 6 | **Fire performance matters for cladding.** UK merchants add Burnblock (Euroclass B) as a value-add; untreated thermo-wood cladding faces fire-regs scrutiny in some applications. | INFERENCE | MEDIUM | S06 |
| 7 | **No verified B2B price or MOQ exists for our product.** Pricing strategy cannot yet be formed. | UNKNOWN | — | — |
| 8 | **Strength reduction.** Thermo-wood is weaker; structural use is not the intended application. Must not over-claim strength. | FACT | HIGH | S03 |

---

## 8. Recommended Target-Market Suggestions (for human review — NOT applied)

These are suggestions in the sense of the harness (§8). They do not mutate any data.

| # | Suggestion | Type | Basis | Status |
|---|---|---|---|---|
| 1 | Add **United Kingdom** as the first priority country | ADD_COUNTRY | Strongest sourced Thermo-Ayous market (S04–S06) | PENDING |
| 2 | Prioritise **specialist timber distributors / cladding merchants** as the primary buyer segment | ADD_INDUSTRY | Documented archetype (Duffield Timber) | PENDING |
| 3 | Add **Germany** as secondary country (localised "Abachi" naming required) | ADD_COUNTRY | Largest tropical-wood market, "Abachi" name | PENDING |
| 4 | Confirm/establish the **"STS 3D" profile equivalence** to a known DTC profile before outreach | ADD_REQUIREMENT | Naming gap identified | PENDING |
| 5 | Obtain **certification / legality status** before approaching distributors | ADD_REQUIREMENT | FSC/legality gate identified | PENDING |

---

## 9. Limitations of This Run

- Only English-language and encyclopaedic sources were retrieved. German/French/Belgian and Nordic supplier pages were not retrieved this run (link rot on the first attempt, plus budget). Country-by-country supplier depth is incomplete.
- No B2B/trade price was obtained anywhere — public retail/list only.
- "STS 3D" was not defined by any retrieved source.
- No trade-fair or association-member directories were retrieved (historic notes only).
- The International ThermoWood Association homepage fetch returned no usable content; association details rely on the Wikipedia summary (S03).

---

## 10. Source Register

See `thermo-abachi-source-register.csv` for the full machine-readable register. Sources referenced above:

| Source ID | Title | Publisher | URL |
|---|---|---|---|
| S01 | Triplochiton scleroxylon — Wikipedia | Wikipedia | https://en.wikipedia.org/wiki/Triplochiton_scleroxylon |
| S02 | Thermally modified wood — Wikipedia | Wikipedia | https://en.wikipedia.org/wiki/Thermally_modified_wood |
| S03 | Thermally modified wood (ThermoWood trademark, Thermory, EN 350-2) | Wikipedia | https://en.wikipedia.org/wiki/Thermally_modified_wood |
| S04 | Duffield Timber — homepage / Thermo-Ayous case studies | Duffield Timber | https://duffieldtimber.com/ |
| S05 | Thermo-Ayous vs Western Red Cedar: Appearance, Cost & Properties | Duffield Timber | https://duffieldtimber.com/the-workbench/buyers-guides/thermo-ayous-vs-western-red-cedar |
| S06 | Timber Cladding (species, profiles, coatings, FAQ) | Duffield Timber | https://duffieldtimber.com/cladding |

*(S02 and S03 are the same URL but are recorded as separate logical sources in the register for the ThermoWood-specific claims; see CSV.)*

---

## 11. Decisions Required from Eimantas

1. Confirm the product's **certification / legality / EUTR status**.
2. Confirm **stock quantity and location** (must not inherit the historic 45 m³ Vilnius lot).
3. Confirm **product origin**.
4. Confirm **pricing and MOQ**.
5. Confirm **lengths, tolerances, grades, packaging, finishes**.
6. Confirm **"STS 3D" profile geometry** and its equivalence to known market profiles (e.g. DTC).
7. Confirm **thermal-performance claims** (if any) that may legally be made.
8. Confirm **samples and customer project** availability (if any) before outreach claims.
9. Approve / reject the target-market suggestions in §8.
