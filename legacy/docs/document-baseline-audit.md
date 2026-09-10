# Document Baseline Audit

**Date:** 2026-09-09
**Scope:** Every repository file except `soft/node_modules/**` (dependency content) and generated build artifacts (`soft/apps/api/dist/**`, `soft/apps/api/src/generated/prisma/**`).
**Purpose:** Establish what is a current source of truth, what is historical, what is superseded, and what needs a human decision — before any new work references it.

---

## 1. Classification Scheme

| Class | Meaning |
|---|---|
| **CANONICAL** | Active source of truth. New work must follow it. |
| **HISTORICAL** | Useful prior research or methodology. Not current evidence. May guide terminology only. |
| **SUPERSEDED** | Conflicts with the current scope. Must not guide new work. |
| **UNCERTAIN** | Needs a human business decision before it can be trusted or reused. |

---

## 2. Document Inventory and Classification

### Root level

| File | Classification | Notes |
|---|---|---|
| `README.md` | SUPERSEDED | Points to a docs structure that does not match the real architecture doc (`ai-sdr-assistant-mvp-plan-v2.md`). No runnable-app status described. |
| `products.md` | SUPERSEDED | Describes the historic ~45 m³ KD Abachi lumber opportunity (Congo origin, Vilnius stock, A/A+B grades, non-FSC). This is the *previous* opportunity. Must NOT be treated as evidence for Thermo Abachi cladding. |
| `ai-sdr-assistant-mvp-plan-v2.md` | **CANONICAL** | Architecture source of truth. Opportunity-centred design, domain model, services, persistence, roadmap, decisions log. |

### `docs/` (application planning, pre-v2)

| File | Classification | Notes |
|---|---|---|
| `docs/vision.md` | HISTORICAL | Early product vision. Describes "AI reply analysis", lead scoring 95/100, etc. Contains ideas the v2 plan later de-scoped or re-framed. Useful as origin story only. |
| `docs/architecture.md` | SUPERSEDED | Bare component diagram (Next.js → NestJS → BullMQ → Redis → OpenAI → PostgreSQL → Mail Provider). No domain model, no services, no rationale. Contradicts v2 (v2 has no Next.js frontend in MVP and no Mail Provider). |
| `docs/decisions.md` | SUPERSEDED | Two early decisions (NestJS over Express; PostgreSQL over MongoDB). Absorbed by v2 §15 and §26, which are more complete. |
| `docs/features.md` | SUPERSEDED | Stub with empty "Description" placeholders. No content. |
| `docs/roadmap.md` | SUPERSEDED | Early 6-phase roadmap ("Website/Landing page", "CRM", "Billing", "SaaS"). Contradicts v2 §23 phase plan (no website/landing page in MVP; billing/SaaS explicitly excluded). |
| `docs/workflow.md` | SUPERSEDED | Minimal workflow diagram that ends with "Reply Analysis" and auto "Sending". Contradicts v2 (no auto-send, no reply analysis in MVP). |
| `docs/market-research-harness.md` | (was empty) | Now replaced by the harness design in this task (see below). |

### `phase-0-research/` (historic ~45 m³ KD Abachi lumber opportunity)

| File | Classification | Notes |
|---|---|---|
| `african-timber-opportunity.md` | HISTORICAL | Product research + scraping reality check for the *historic KD lumber* opportunity. The species identity (Triplochiton scleroxylon, trade names) is safely reusable; stock/origin/certification claims are not. |
| `knowledge-base.md` | HISTORICAL | Reusable search terminology (trade names by country, query patterns, directory source lists, buyer personas). Terminology is reusable for the new opportunity; prospect and stock facts are not evidence. |
| `findings.md` | HISTORICAL | Phase 0 validation summary for the historic opportunity. Search-provider findings (Brave Search works; Google/Bing/DDG/Qwant issues) remain methodologically useful. Prospect lists and scores are historic. |
| `batch-001-qualified-prospects.md` | HISTORICAL | 12 DE/NL prospects for historic KD lumber. Company names only reusable as *re-validation candidates*, not evidence. |
| `batch-002-qualified-prospects.md` | HISTORICAL | 11 LT prospects. Same treatment. |
| `batch-003-scandinavia-batch-004-uk.md` | HISTORICAL | 6 SE/NO/BE + 10 UK prospects. Same treatment. |
| `top-5-deep-dives-outreach.md` | HISTORICAL | Deep-dives + outreach drafts for historic KD lumber. Contains an error correction (ETT Fine Woods is US, not SE) worth remembering as a lesson. |

### `soft/` (implementation scaffold)

| File | Classification | Notes |
|---|---|---|
| `soft/package.json` | UNCERTAIN | Bun workspaces monorepo. References `apps/web` in `dev:web` script but no `apps/web` directory exists. |
| `soft/index.ts` | SUPERSEDED | Bun hello-world placeholder. |
| `soft/tsconfig.json`, `soft/bun.lock`, `soft/README.md` (empty), `.gitignore` | UNCERTAIN | Build tooling only; no business decisions. |
| `soft/apps/api/package.json` | UNCERTAIN | NestJS 11 + Prisma 7 + Fastify. Diverges from v2 §15 (v2 says "NestJS command runner", REST + Express-style; no BullMQ/Redis wired yet). |
| `soft/apps/api/prisma/schema.prisma` | **SUPERSEDED** | Only `Product` + `ProductCategory`. Uses `categoryId` relation and no `origin` field — contradicts v2 §6.2 (`category: string`, `origin?: string`). Generator output `../src/prisma` mismatches imports from `../../generated/prisma/client.js`. |
| `soft/apps/api/src/**` | UNCERTAIN | Scaffold. `ProductService.create()` logs and returns `null`; `ProductController.getProduct` is missing `@Param`; `product.dto.ts` is copy-pasted auth DTO (`password`, email validation messages). `app.module.ts` imports only Prisma + Product. |
| `soft/apps/api/.env` | UNCERTAIN | Contains hardcoded local DB credentials. Security note: should not be committed. |
| `soft/apps/api/docker-compose.yml` | UNCERTAIN | Local Postgres only (port 5434). No Redis/BullMQ despite v2 §15. |
| `soft/apps/api/dist/**` and `src/generated/prisma/**` | (build artifacts) | Generated output. Excluded from classification; ignore. |

---

## 3. Contradictions Between Documents

| # | Contradiction | A | B | Resolution |
|---|---|---|---|---|
| 1 | Frontend technology | `docs/architecture.md` shows a Next.js frontend | v2 §22 excludes a web frontend from MVP (CLI-first, Phase 8 web is "only after CLI works") | Follow v2. `architecture.md` is superseded. |
| 2 | Auto-send / reply analysis | `docs/vision.md` + `docs/workflow.md` include AI reply analysis and (implied) sending | v2 §22 excludes auto-send, inbox sync, reply analysis | Follow v2. |
| 3 | Roadmap | `docs/roadmap.md` has Website/Landing, CRM, Billing, SaaS phases | v2 §23 has 8 phases (Phase 0–8) with no website/landing in MVP | Follow v2 §23. |
| 4 | Product entity shape | `soft/apps/api/prisma/schema.prisma`: `categoryId` relation + `ProductCategory` table, no `origin` | v2 §6.2: `category: string`, `origin?: string` | Follow v2. The scaffold's schema must be corrected before it becomes canonical. |
| 5 | Prisma generator output path | `schema.prisma` output `../src/prisma` | code imports from `../../generated/prisma/client.js` (and `dist/` shows `src/generated/prisma`) | Fix to a single consistent path before any new module is added. |
| 6 | "No runnable app exists" assumption vs reality | Task premise ("does not yet prove a runnable NestJS/Prisma app exists") | `soft/apps/api` is a real NestJS 11 + Prisma 7 scaffold (with placeholders) | The scaffold is *non-canonical and incomplete*, not "missing". It proves toolchain viability but not business functionality. |
| 7 | The "product" being sold | `products.md` + all `phase-0-research/*` describe ~45 m³ KD Abachi lumber (Congo, Vilnius, non-FSC) | New opportunity is Thermo Abachi cladding (STS 3D, 20 mm, 80 mm cover, Europe, B2B) | The historic opportunity is SUPERSEDED for evidence. Only species terminology carries over. |

---

## 4. Facts That Are Safe to Reuse

These are species-level or methodology-level facts that are independent of the historic stock:

1. **Species identity** — Thermo Abachi / Thermo Ayous is thermally modified *Triplochiton scleroxylon* (Malvaceae). Trade names: African whitewood, Abachi (DE), Obeche (UK/Nigeria), Ayous (Cameroon/FR), Wawa (Ghana), Samba/Sambawawa (Ivory Coast). *(Re-verified independently in this task's research run.)*
2. **Naming by country** — "Abachi" is the German-market name; "Ayous" the French/Belgian; "Obeche" the UK/Commonwealth. Search must use the local name. *(Safe to reuse; re-verified.)*
3. **Thermo-wood terminology** — ThermoWood is a registered trademark (International ThermoWood Association); treatment classes Thermo-S (stability) and Thermo-D (durability). Thermal modification improves dimensional stability and decay resistance but reduces bending strength. *(Re-verified.)*
4. **Discovery methodology** — Search-engine-based discovery is more reliable than scraping blocked directories (Kompass, Fordaq, Europages return 403 or require JS). Brave Search was the working provider in Phase 0. Trade-association member lists vary in accessibility. *(Methodology; still needs a fresh run.)*
5. **Buyer-segment logic** — Two distinct buyer types (traders/importers who resell vs manufacturers who consume as feedstock) applies to cladding as well (distributors vs installers/manufacturers). *(Reusable as a frame, not a fact.)*
6. **Evidence-labelling rules** — The FACT / INFERENCE / UNKNOWN distinction (v2 §11, §6.10 `evidenceStatus`) is canonical and must be applied to all new research.

## 5. Claims That Must Be Re-Verified Externally

Do not carry these forward without a fresh source and retrieval date:

1. Stock quantity or location for the *new* Thermo Abachi cladding opportunity (historic 45 m³ Vilnius is the old opportunity).
2. Product origin (historic "Republic of Congo" applies to the old lumber; the new cladding origin is UNKNOWN).
3. Certification status (historic "not FSC-certified"). The new product's FSC/PEFC/EUTR status is UNKNOWN.
4. Prices — historic documents contain no verified cladding prices. (This run captured new retail/list prices; B2B prices remain UNKNOWN.)
5. Supplier/prospect company lists — all 38 historic prospects require fresh re-validation before reuse.
6. Durability/density figures (historic "380 kg/m³" vs "450 kg/m³" discrepancy was flagged; treat all figures as UNKNOWN until re-sourced).
7. Search-provider availability (Brave Search worked in Aug 2026; re-verify before committing).

## 6. Claims That Must Never Be Carried Into the New Opportunity Without Confirmation

1. **Stock quantity/location** — "~45 m³ in Vilnius" is the historic KD lumber opportunity, not Thermo Abachi cladding.
2. **Product origin** — "Republic of Congo" belongs to the old lumber lot.
3. **Grade/spec** — "A / A+B grade, 25×210 mm, 25×95 mm, 2–6 m, 10–12 % MC" are the old lumber specs, not the cladding.
4. **Certification** — "not FSC-certified" and "EUTR from Congo" are historic.
5. **Delivery terms / price / MOQ** — nothing was ever established; do not invent.
6. **Thermal-performance / durability claims** — never asserted with evidence historically; do not invent for the new product.
7. **Samples / customer projects** — historic outreach drafts mention offering samples/projects; these were not facts, only draft text.

## 7. Proposed Documentation Hierarchy

```
README.md                         (top-level entry; update to point at canonical docs — TBD)
ai-sdr-assistant-mvp-plan-v2.md   (CANONICAL — architecture + domain + roadmap + decisions)
docs/
  market-research-harness.md      (CANONICAL — research operating procedure, this task)
  document-baseline-audit.md      (this file — meta)
  research/                       (versioned research outputs per opportunity)
    thermo-abachi-europe-market-research.md
    thermo-abachi-source-register.csv
    thermo-abachi-implementation-backlog.md
  decisions.md                    (future: decision records; replace current stub)
  vision.md                       (archive as historical)
  architecture.md                 (archive as superseded)
  features.md                     (archive as superseded)
  roadmap.md                      (archive as superseded)
  workflow.md                     (archive as superseded)
phase-0-research/                 (freeze as HISTORICAL; do not edit)
products.md                       (freeze as SUPERSEDED; superseded by per-opportunity offers in v2)
soft/                             (implementation workspace; reconcile schema with v2 before extension)
```

### Hierarchy rules

1. `ai-sdr-assistant-mvp-plan-v2.md` is the single architecture authority. Nothing in `docs/` may contradict it.
2. Each new commercial opportunity gets its own folder under `docs/research/` with a research report, a source register (CSV), and an implementation backlog.
3. `phase-0-research/` and `products.md` are frozen. They may inform search terminology only, never evidence.
4. Future human decisions are logged as dated decision records (see v2 §26 style), not scattered across files.
5. The `soft/` scaffold must be reconciled with v2 (schema, paths) before new modules are added to it.

---

## 8. Open Business Decisions (for Eimantas)

1. Confirm the canonical architecture doc is `ai-sdr-assistant-mvp-plan-v2.md` (vs the older `docs/*` set).
2. Confirm whether `soft/apps/api` is the intended implementation workspace, or whether a fresh scaffold should replace it.
3. Confirm whether historic `phase-0-research/` and `products.md` should be archived/removed or left as-is.
4. Decide whether `README.md` should be updated to point at the canonical docs.
