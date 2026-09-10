# AI SDR Assistant — MVP Plan

> **Note on structure:** This document is the master MVP blueprint. Some sections (domain model, persistence, API design, roadmap, decisions) are substantial enough to become separate files once implementation starts and sections begin changing independently. For now, they live in one document for coherence.

---

## 1. Product Vision

AI SDR Assistant is a sales research and prospecting workspace for companies that need to find buyers for a specific product, service, or commercial opportunity.

The system reduces repetitive work:

- market research
- company discovery
- lead qualification
- company research
- contact discovery
- outreach preparation
- activity tracking

The system does **not** replace the salesperson.

AI prepares the information, evidence, and drafts. A human reviews the results, decides who should be contacted, approves messages, and takes over when a prospect shows genuine interest.

---

## 2. Core Product Principle

> Every workflow starts with a real business opportunity.

Example:

> We have one container of African walnut available in Germany and want to find buyers in the furniture industry.

The opportunity—not the AI—is the center of the system.

Each opportunity contains its own:

- product information
- commercial objectives
- target markets
- buyer criteria
- discovered companies
- contacts
- research
- outreach drafts
- communication history
- status

This keeps the system focused on business outcomes instead of technical abstractions.

---

## 3. MVP Goal

The MVP should prove one complete workflow:

1. Create an opportunity.
2. Define what is being sold.
3. Define the target market.
4. Discover possible buyer companies.
5. Qualify and rank those companies.
6. Research the best companies.
7. Find relevant contacts.
8. Prepare personalized outreach drafts.
9. Allow a human to approve or reject the drafts.
10. Store all results for later use.

The MVP does not need to send emails automatically.

Its first job is to produce a small list of credible, well-researched prospects with usable outreach drafts.

---

## 4. Primary User

The initial user is a small or medium-sized business owner, trader, exporter, importer, manufacturer, or salesperson who has a real product or commercial opportunity but does not have a large sales operations team.

The user may currently rely on:

- Google
- spreadsheets
- email
- LinkedIn
- trade directories
- personal contacts

The product should be understandable without requiring knowledge of terms such as:

- RevOps
- GTM engineering
- intent data
- sequencing
- sales automation architecture

The interface should use direct business language:

- Opportunity
- Product
- Target market
- Potential buyer
- Contact
- Research
- Draft email
- Follow-up

---

## 5. Main Workflow

```text
Create Opportunity
        ↓
Add Product and Commercial Details
        ↓
Define Target Markets and Buyer Criteria
        ↓
Research Market
        ↓
Review Market Suggestions and Refine Target Markets
        ↓
Discover Buyer Companies
        ↓
Qualify and Rank Companies
        ↓
Research Selected Companies
        ↓
Find Relevant Contacts
        ↓
Prepare Personalized Outreach
        ↓
Human Review and Approval
        ↓
Track Progress
```

Each step must be independently repeatable.

For example, the user should be able to:

- rerun company discovery for another country
- change qualification criteria
- research only one selected company
- regenerate one outreach draft
- add a contact manually
- reject an unsuitable company

---

## 6. Core Domain Model

The domain model distinguishes between **persisted entities** (what goes into the database) and **read models** (hydrated representations returned by the API). The interfaces below describe persisted entities unless explicitly labeled as a read model.

### 6.1 Opportunity

The central entity of the system.

```typescript
interface Opportunity {
  id: string;
  name: string;
  description?: string;

  offerId: string;
  targetMarketIds: string[];

  objective: string;
  deadline?: Date;
  priority: OpportunityPriority;
  status: OpportunityStatus;

  createdAt: Date;
  updatedAt: Date;
}
```

Possible statuses:

```typescript
type OpportunityStatus =
  | 'DRAFT'
  | 'RESEARCHING'
  | 'PROSPECTING'
  | 'QUALIFYING'
  | 'PREPARING_OUTREACH'
  | 'READY_FOR_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';
```

#### Opportunity Workspace (read model)

The full opportunity returned to the user is a hydrated assembly, not a single database row:

```typescript
interface OpportunityWorkspace {
  opportunity: Opportunity;
  offer: OpportunityOffer;
  product: Product;
  targetMarkets: TargetMarket[];
}
```

---

### 6.2 Product

Describes a reusable product or service that may be sold across multiple opportunities.

```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  description: string;

  origin?: string;

  generalAttributes: Record<string, string>;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

Examples of `generalAttributes`:

```json
{
  "species": "African walnut",
  "moisture": "8–12%",
  "grade": "A/B",
  "dimensions": "custom lengths"
}
```

This flexible structure allows the system to support wood, textiles, food, machinery, and other product categories without redesigning the database for every industry.

Products describe **what** the thing is. Details that vary per opportunity—quantity, location, price, deadline, delivery terms—belong elsewhere.

---

### 6.3 Opportunity Offer

Holds the commercial terms specific to one opportunity. Quantity, current location, price, availability date, delivery terms, certifications, and other attributes that can differ between deals involving the same product.

```typescript
interface OpportunityOffer {
  id: string;
  opportunityId: string;
  productId: string;

  quantity?: string;
  unit?: string;
  currentLocation?: string;

  price?: string;
  minimumOrder?: string;
  availabilityDate?: Date;

  deliveryTerms: string[];
  certifications: string[];
  documents: string[];

  attributes: Record<string, string>;
}
```

Example:

```json
{
  "quantity": "45",
  "unit": "m³",
  "currentLocation": "Hamburg, Germany",
  "price": "€1,200/m³",
  "availabilityDate": "2026-09-01",
  "deliveryTerms": ["EXW Hamburg", "FOB Hamburg"],
  "certifications": ["FSC", "KD"],
  "attributes": {
    "containerVolume": "45 m³"
  }
}
```

The MVP supports exactly one offer per opportunity. The database enforces this with a unique constraint on `OpportunityOffer.opportunityId`.

---

### 6.4 Target Market

Defines where and to whom the product should be sold.

```typescript
interface TargetMarket {
  id: string;
  opportunityId: string;

  countries: string[];
  industries: string[];
  companyTypes: string[];

  companySize?: {
    minEmployees?: number;
    maxEmployees?: number;
  };

  buyerTitles: string[];
  requirements: string[];
  exclusions: string[];

  createdAt: Date;
  updatedAt: Date;
}
```

Example:

```json
{
  "countries": ["Germany", "Netherlands"],
  "industries": ["Furniture manufacturing", "Interior design"],
  "companyTypes": ["Manufacturer", "Wholesaler"],
  "buyerTitles": ["Purchasing Manager", "Owner", "Procurement Director"],
  "requirements": ["Uses imported hardwood"],
  "exclusions": ["Retail-only businesses"]
}
```

---

### 6.5 Target Market Suggestion

Market research outputs suggestions rather than silently mutating the user-defined target market. Suggestions must be reviewed and accepted before they affect the target definition.

```typescript
interface TargetMarketSuggestion {
  id: string;
  targetMarketId: string;
  researchRecordId: string;

  type:
    | 'ADD_INDUSTRY'
    | 'REMOVE_INDUSTRY'
    | 'ADD_COMPANY_TYPE'
    | 'ADD_COUNTRY'
    | 'ADD_REQUIREMENT'
    | 'ADD_EXCLUSION';

  suggestedValue: string;
  explanation: string;
  sourceIds: string[];

  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

  createdAt: Date;
  resolvedAt?: Date;
}
```

The path is `Opportunity → TargetMarket → TargetMarketSuggestion`. A suggestion does not belong directly to the opportunity; it belongs to a specific target market, which itself belongs to the opportunity.

---

### 6.6 Company

Represents a potential buyer organization.

```typescript
interface Company {
  id: string;

  name: string;
  website?: string;
  domain?: string;

  country?: string;
  city?: string;
  address?: string;

  industries: string[];
  companyType?: string;
  employeeCount?: number;
  estimatedRevenue?: string;

  description?: string;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

Sources are stored via the `CompanySource` join table (see §6.14), not as a raw `sourceUrls` array on the entity. This gives each source a retrieval date, type, and metadata.

The same company may appear in more than one opportunity. Opportunity-specific information is stored on `OpportunityCompany`.

---

### 6.7 Opportunity Company

Connects a company to an opportunity.

```typescript
interface OpportunityCompany {
  id: string;
  opportunityId: string;
  companyId: string;

  status: CompanyOpportunityStatus;

  latestQualificationId?: string;
  rejectionReason?: string;

  discoveredAt: Date;
  lastReviewedAt?: Date;
}
```

The latest qualification result is referenced via `latestQualificationId` rather than storing `fitScore`/`fitVerdict`/`qualificationSummary` directly on the join entity. This preserves a history of qualification runs and makes it clear which profile version was used.

---

### 6.8 Qualification Record

Stores the result of a qualification run at a point in time, including which customer profile version was used. Prevents historical scores from appearing to have been calculated with a later version of the profile.

```typescript
interface QualificationRecord {
  id: string;
  opportunityCompanyId: string;
  customerProfileId: string;
  customerProfileVersion: number;

  fitScore?: number;
  verdict: 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';

  matchedCriteria: QualificationCriterion[];
  missingInformation: string[];
  concerns: string[];

  summary: string;
  sources: SourceReference[];

  createdAt: Date;
}
```

When a company is re-qualified, a new `QualificationRecord` is created and `OpportunityCompany.latestQualificationId` is updated. Historical records are preserved.

---

### 6.9 Contact

Represents a person associated with a company.

```typescript
interface Contact {
  id: string;
  companyId: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;

  jobTitle?: string;
  department?: string;
  seniority?: string;

  email?: string;
  emailStatus?: 'UNKNOWN' | 'GUESSED' | 'VALID' | 'INVALID' | 'RISKY';
  phone?: string;
  linkedInUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

Sources are stored via the `ContactSource` join table (see §6.14), not as a raw `sourceUrls` array.

Company discovery and contact discovery remain separate. Finding a relevant company does not mean that the correct decision-maker has been found.

---

### 6.10 Research Record

Stores structured research so it can be reused.

```typescript
interface ResearchRecord {
  id: string;

  opportunityId: string;
  companyId?: string;
  contactId?: string;

  type:
    | 'MARKET'
    | 'COMPANY'
    | 'CONTACT'
    | 'COMPETITOR'
    | 'IMPORT_EXPORT';

  summary: string;
  findings: ResearchFinding[];

  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';

  createdAt: Date;
}
```

```typescript
interface ResearchFinding {
  label: string;
  value: string;
  relevance?: string;
  evidenceStatus: 'VERIFIED' | 'USER_PROVIDED' | 'INFERRED' | 'UNVERIFIED';
  evidenceSourceIds: string[];
}
```

The `confidenceLevel` is a coarse overall assessment (not a pretend-precise number). The primary trustworthiness check is `evidenceStatus` on individual findings, combined with source quality.

Sources are stored via the `ResearchRecordSource` join table (see §6.14), not as an inline `sources` array. Each `ResearchFinding.evidenceSourceIds` references entries in that join relationship.

---

### 6.11 Outreach Draft

```typescript
interface OutreachDraft {
  id: string;

  opportunityId: string;
  companyId: string;
  contactId?: string;

  channel: 'EMAIL' | 'LINKEDIN' | 'PHONE_NOTE';

  subject?: string;
  body: string;
  callToAction: string;

  personalizationFacts: string[];
  sourceIds: string[];

  buyerPersonaVersionId?: string;
  valuePropositionVersionIds: string[];

  status:
    | 'DRAFT'
    | 'NEEDS_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'SENT';

  createdAt: Date;
  updatedAt: Date;
}
```

Every personalized claim must point to a real source or an explicitly provided user fact.

The system must never invent:

- recent company expansion
- hiring activity
- partnerships
- product usage
- certifications
- purchasing needs

`buyerPersonaVersionId` and `valuePropositionVersionIds` record which versions of the knowledge base were used when the draft was generated. This protects historical drafts from appearing to be based on messaging that changed after the draft was created. Simple `archivedAt` on the Knowledge Base entity is not enough—the draft needs to know exactly what it was generated from.

---

### 6.12 Outreach Draft Research

Explicitly links an outreach draft to the research records it was built from. Provides better traceability than reconstructing the relationship later from source IDs.

```typescript
interface OutreachDraftResearch {
  outreachDraftId: string;
  researchRecordId: string;
}
```

---

### 6.13 Activity

Business-facing, user-visible audit history of the opportunity.

```typescript
interface Activity {
  id: string;

  opportunityId: string;
  companyId?: string;
  contactId?: string;

  executionId?: string;

  type:
    | 'NOTE'
    | 'RESEARCH_COMPLETED'
    | 'COMPANY_QUALIFIED'
    | 'CONTACT_FOUND'
    | 'DRAFT_CREATED'
    | 'DRAFT_APPROVED'
    | 'EMAIL_SENT'
    | 'REPLY_RECEIVED'
    | 'FOLLOW_UP_DUE';

  description: string;
  metadata?: Record<string, unknown>;

  createdAt: Date;
}
```

A business activity may reference the execution that produced it, but not every technical event becomes an activity.

---

### 6.14 Execution

Technical and operational record of system work. Primarily for debugging, cost control, monitoring, and admin reporting. Should not normally clutter the user timeline.

```typescript
interface Execution {
  id: string;
  jobId?: string;
  opportunityId: string;

  operation: string;
  status: ExecutionStatus;

  providerCalls: ProviderCall[];
  metrics: ExecutionMetricsRecord;
  errors: ExecutionError[];

  createdAt: Date;
  completedAt?: Date;
}
```

```typescript
interface ProviderCall {
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED';
}

interface ExecutionMetricsRecord {
  sourceCount: number;
  pageFetchCount: number;
  pageFetchFailures: number;
  totalDurationMs: number;
}

interface ExecutionError {
  code: string;
  message: string;
  provider?: string;
  itemId?: string;
  retryable: boolean;
}
```

---

### 6.15 Source Link Tables

Instead of storing raw `sourceUrls: string[]` on domain entities, sources are connected through explicit join tables. This gives each source link a retrieval date, source type, and metadata—and allows a single `SourceReference` to be reused by multiple entities.

```typescript
interface CompanySource {
  companyId: string;
  sourceReferenceId: string;
  retrievedAt: Date;
}

interface ContactSource {
  contactId: string;
  sourceReferenceId: string;
  retrievedAt: Date;
}

interface ResearchRecordSource {
  researchRecordId: string;
  sourceReferenceId: string;
}

interface OutreachDraftSource {
  outreachDraftId: string;
  sourceReferenceId: string;
}
```

---

## 7. Sales Knowledge Base

The system needs reusable business context. Knowledge Base entities are introduced incrementally in the phase that first consumes them. They share one module and persistence layer but are not all required before prospecting begins.

### 7.1 Incremental Build Strategy

| Entity | Introduced in Phase | Consumed by |
|---|---|---|
| `Product` | Phase 1 — Opportunity Foundation | All phases |
| `CustomerProfile` | Phase 4 — Qualification | Qualification, Company Research |
| `BuyerPersona` | Phase 6 — Contact Discovery | Contact Discovery, Outreach |
| `ValueProposition` | Phase 7 — Outreach | Outreach |

A small `knowledge-base` module can exist from Phase 1, but most of its entities are added later when their requirements are real.

### 7.2 Customer Profile

```typescript
interface CustomerProfile {
  id: string;
  name: string;

  industries: string[];
  companyTypes: string[];
  countries: string[];

  minEmployees?: number;
  maxEmployees?: number;

  positiveSignals: string[];
  negativeSignals: string[];
  requiredAttributes: string[];

  version: number;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

The `version` field is incremented on each update. Qualification records reference the version used at qualification time.

### 7.3 Buyer Persona

```typescript
interface BuyerPersona {
  id: string;
  name: string;

  jobTitles: string[];
  departments: string[];
  seniorityLevels: string[];

  responsibilities: string[];
  painPoints: string[];
  buyingMotivations: string[];
  objections: string[];

  preferredTone?: string;

  version: number;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

The `version` field is referenced by `OutreachDraft.buyerPersonaVersionId`.

### 7.4 Value Proposition

```typescript
interface ValueProposition {
  id: string;
  name: string;

  productId?: string;
  targetPersonaId?: string;

  positioning: string;
  benefits: string[];
  differentiators: string[];
  proofPoints: string[];
  approvedClaims: string[];
  forbiddenClaims: string[];

  version: number;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

The `version` field allows `OutreachDraft.valuePropositionVersionIds` to reference specific versions.

### 7.5 Deletion Policy

Hard deletion is not exposed for entities that have a `version` or `archivedAt` field. Instead, the API exposes archive and restore endpoints. Once an entity has been used in a qualification or outreach draft, archiving is the only removal path—the version referenced by historical records remains available.

---

## 8. Application Services

The MVP should use explicit application services instead of a general-purpose orchestrator.

Each service owns one business operation.

```text
OpportunityService
MarketResearchService
TargetMarketSuggestionService
CompanyDiscoveryService
CompanyQualificationService
CompanyResearchService
ContactDiscoveryService
OutreachDraftService
OutreachContextService
ActivityService
```

These services can use AI where useful, but AI is an implementation detail—not the application architecture.

---

### 8.1 Opportunity Service

Responsibilities:

- create and update opportunities
- attach an `OpportunityOffer` to a `Product`
- attach target markets
- manage status
- return the complete opportunity workspace (`OpportunityWorkspace` read model)
- validate that required information exists before a workflow step runs

A product should be reusable. The API should support either referencing an existing product or creating one inline:

```typescript
type ProductReferenceInput =
  | { productId: string; product?: never }
  | { productId?: never; product: CreateProductInput };

interface CreateOpportunityInput {
  name: string;
  offer: CreateOpportunityOfferInput;
  objective: string;
  targetMarkets: CreateTargetMarketInput[];
}

interface CreateOpportunityOfferInput {
  product: ProductReferenceInput;
  quantity?: string;
  unit?: string;
  currentLocation?: string;
  price?: string;
  minimumOrder?: string;
  availabilityDate?: Date;
  deliveryTerms: string[];
  certifications: string[];
  attributes: Record<string, string>;
}
```

For MVP convenience, the API may also offer `POST /opportunities/with-product` for creating a product and opportunity together, but the underlying model must not duplicate products every time.

---

### 8.2 Market Research Service

Purpose:

Understand where and how the product may be sold.

Input:

```typescript
interface MarketResearchInput {
  opportunityId: string;
  targetMarketId?: string;
  country?: string;
  industry?: string;
}
```

When an opportunity has multiple target markets, the service requires `targetMarketId` to focus the research scope.

Output:

```typescript
interface MarketResearchOutput {
  observations: string[];
  suggestions: TargetMarketSuggestionInput[];
  competitors: CompanyReference[];
  importExportFindings: string[];
  risks: string[];
  sources: SourceReference[];
}

interface TargetMarketSuggestionInput {
  targetMarketId: string;
  type: 'ADD_INDUSTRY' | 'REMOVE_INDUSTRY' | 'ADD_COMPANY_TYPE' | 'ADD_COUNTRY' | 'ADD_REQUIREMENT' | 'ADD_EXCLUSION';
  suggestedValue: string;
  explanation: string;
  sourceIds: string[];
}
```

Responsibilities:

- search public sources
- identify likely buyer industries
- identify useful trade directories and associations
- find market-specific terminology
- identify obvious competitors or alternative suppliers
- summarize available import/export information
- separate facts from assumptions
- produce actionable suggestions, not silent mutations

The service must clearly label uncertain conclusions.

---

### 8.3 Target Market Suggestion Service

Purpose:

Manage the lifecycle of market research suggestions.

Responsibilities:

- persist suggestions from market research output
- list pending suggestions for a target market
- accept a suggestion and apply its change to the target market
- reject a suggestion
- record an activity and source reference for every accepted change

Endpoints:

```text
POST   /target-market-suggestions/:id/accept
POST   /target-market-suggestions/:id/reject
GET    /target-markets/:id/suggestions?status=pending
```

---

### 8.4 Company Discovery Service

Purpose:

Find organizations that may buy the product.

Input:

```typescript
interface CompanyDiscoveryInput {
  opportunityId: string;
  targetMarketId: string;
  limit?: number;
}
```

Output:

```typescript
interface CompanyDiscoveryOutput {
  companies: DiscoveredCompany[];
  searchQueries: string[];
  sources: SourceReference[];
}
```

Responsibilities:

- generate focused search queries
- search multiple public sources
- extract company names and websites
- normalize domains
- remove duplicates
- reject obviously irrelevant results
- store discovery sources via `CompanySource` join table
- avoid pretending that every discovered company is a qualified lead

---

### 8.5 Company Qualification Service

Purpose:

Evaluate whether a discovered company is worth further research.

Input:

```typescript
interface CompanyQualificationInput {
  opportunityId: string;
  companyId: string;
}
```

Output:

```typescript
interface CompanyQualificationOutput {
  qualificationRecord: QualificationRecord;
  sources: SourceReference[];
}
```

The output includes the full `QualificationRecord` which captures the customer profile version used. The service writes a new `QualificationRecord` and sets `OpportunityCompany.latestQualificationId`.

Suggested scoring categories:

| Category | Weight |
|---|---:|
| Industry fit | 25 |
| Product-use likelihood | 25 |
| Geography and logistics | 15 |
| Company type | 15 |
| Company size or purchasing capacity | 10 |
| Positive business signals | 10 |

The score must be explainable and reproducible.

A low-information company should receive `INCONCLUSIVE`, not an artificially precise score.

---

### 8.6 Company Research Service

Purpose:

Create a reusable company profile before outreach.

The service should research:

- what the company does
- products and markets
- likely relevance to the opportunity
- company locations
- size indicators
- procurement clues
- recent factual developments
- certifications
- potential objections
- possible conversation starters

Output:

```typescript
interface CompanyResearchOutput {
  companySummary: string;
  relevantActivities: string[];
  opportunityFit: string[];
  possibleNeeds: string[];
  possibleObjections: string[];
  conversationStarters: string[];
  unknowns: string[];
  sources: SourceReference[];
}
```

Possible needs and objections must be presented as hypotheses unless directly supported by evidence.

---

### 8.7 Contact Discovery Service

Purpose:

Find people who are likely to influence or make a purchasing decision.

Input:

```typescript
interface ContactDiscoveryInput {
  opportunityId: string;
  companyId: string;
  buyerPersonaIds?: string[];
}
```

Output:

```typescript
interface ContactDiscoveryOutput {
  contacts: ContactCandidate[];
  emailPatterns: EmailPattern[];
  unresolvedRoles: string[];
  sources: SourceReference[];
}
```

Responsibilities:

- identify relevant job functions
- locate publicly available names and roles
- collect public professional profiles
- infer email patterns only when clearly marked as inferred
- validate emails where legally and technically appropriate
- avoid collecting unnecessary personal data

---

### 8.8 Outreach Context Service

Purpose:

Assemble the complete context needed to produce a personalized outreach draft. Provides a single entry point so the draft service receives structured data rather than querying scattered records itself.

```typescript
interface OutreachContextService {
  build(input: {
    opportunityId: string;
    companyId: string;
    contactId?: string;
  }): Promise<OutreachContext>;
}

interface OutreachContext {
  opportunity: Opportunity;
  offer: OpportunityOffer;
  product: Product;
  targetMarkets: TargetMarket[];
  company: Company;
  contact?: Contact;

  latestQualification: QualificationRecord;

  marketResearch: ResearchRecord[];
  companyResearch: ResearchRecord[];
  contactResearch: ResearchRecord[];

  persona?: BuyerPersona;
  valuePropositions: ValueProposition[];
}
```

The lookup uses:

- `opportunityId` + `companyId` + optional `contactId`
- research type filtering
- freshness (newer records preferred)

---

### 8.9 Outreach Draft Service

Purpose:

Prepare evidence-based outreach drafts.

Input:

```typescript
interface CreateOutreachDraftInput {
  opportunityId: string;
  companyId: string;
  contactId?: string;
  channel: 'EMAIL' | 'LINKEDIN';
}
```

The service uses the `OutreachContextService` to assemble context, then records which version of each Knowledge Base entity was used in the draft.

Rules:

1. Never invent personalization.
2. Use one or two relevant facts, not a research dump.
3. Keep the message short.
4. Explain the business relevance clearly.
5. Use a simple call to action.
6. Avoid fake familiarity.
7. Avoid exaggerated claims.
8. Require human approval before sending.

Output:

```typescript
interface OutreachDraftOutput {
  subject?: string;
  body: string;
  callToAction: string;
  personalizationFacts: string[];
  supportingSources: SourceReference[];
  warnings: string[];
}
```

The draft must also record exactly which research records were consumed via the `outreach_draft_research_records` join table, and which Knowledge Base versions were used via `buyerPersonaVersionId` and `valuePropositionVersionIds`.

---

## 9. AI and LLM Layer

The LLM layer should remain replaceable.

```typescript
interface LlmService {
  generateStructured<T>(
    request: LlmRequest,
    schema: Schema<T>,
  ): Promise<LlmResponse<T>>;
}
```

Responsibilities:

- send prompts to the model
- request structured output
- validate output against a schema
- retry malformed responses
- record token usage
- record model and prompt version
- enforce timeout and cost limits

The business services should not depend directly on OpenAI-specific classes.

Example:

```text
CompanyQualificationService
        ↓
LlmService interface
        ↓
OpenAiLlmService
```

A future provider can be added without rewriting the domain services.

---

## 10. Tools and External Data

Tools should be small infrastructure adapters.

```text
SearchProvider
WebPageFetcher
WebPageExtractor
CompanyWebsiteAnalyzer
EmailPatternDetector
EmailVerificationProvider
ImportExportDataProvider
```

### Example interfaces

```typescript
interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
```

```typescript
interface WebPageFetcher {
  fetch(url: string): Promise<FetchedPage>;
}
```

```typescript
interface ContentExtractor {
  extract(page: FetchedPage): Promise<ExtractedContent>;
}
```

The application services should not care whether search results come from:

- Google Custom Search
- Bing
- Brave Search
- Serper
- another provider

---

## 11. Sources and Evidence

Every important finding should preserve its origin.

```typescript
interface SourceReference {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  retrievedAt: Date;
  excerpt?: string;
  sourceType:
    | 'COMPANY_WEBSITE'
    | 'SEARCH_RESULT'
    | 'DIRECTORY'
    | 'GOVERNMENT'
    | 'TRADE_ASSOCIATION'
    | 'NEWS'
    | 'USER_DOCUMENT'
    | 'OTHER';
}
```

### Entity-to-Source Linking

Sources are connected to domain entities through join tables (`CompanySource`, `ContactSource`, `ResearchRecordSource`, `OutreachDraftSource`)—see §6.15. This gives each link a context (retrieval date, relation type) rather than a bare URL array.

### Evidence Status

The application should distinguish between:

- verified fact
- user-provided fact
- inference
- assumption
- missing information

```typescript
type EvidenceStatus =
  | 'VERIFIED'
  | 'USER_PROVIDED'
  | 'INFERRED'
  | 'UNVERIFIED';
```

This distinction is more useful than exposing model reasoning. `confidenceLevel` on `ResearchRecord` provides a coarse overall assessment, but `evidenceStatus` on individual findings is the primary trustworthiness check.

---

## 12. Background Jobs

BullMQ and Redis are appropriate for expensive or long-running work.

Use background jobs for:

- market research
- bulk company discovery
- qualification of multiple companies
- company research
- contact discovery
- draft generation

Suggested queues:

```text
research
company-discovery
qualification
contact-discovery
outreach
```

Suggested job fields:

```typescript
interface BaseJobData {
  jobId: string;
  opportunityId: string;
  requestedBy: string;
  createdAt: string;
}
```

Each job should support:

- status tracking
- retry limits
- timeout
- cancellation
- progress
- error recording
- idempotency

The MVP should avoid complicated workflow graphs.

A service may enqueue the next explicit step only when the previous result has been stored successfully.

---

## 13. CLI and REST API

The CLI should expose deterministic commands.

```bash
# Products
npm run cli -- product:create
npm run cli -- product:list
npm run cli -- product:archive <product-id>

# Create an opportunity
npm run cli -- opportunity:create

# Research the market (for a specific target market)
npm run cli -- market:research <target-market-id>

# Review and accept/reject suggestions
npm run cli -- suggestions:list <target-market-id>
npm run cli -- suggestion:accept <suggestion-id>
npm run cli -- suggestion:reject <suggestion-id>

# Discover companies (for a specific target market)
npm run cli -- companies:discover <target-market-id>

# Qualify all discovered companies
npm run cli -- companies:qualify <opportunity-id>

# Qualify a single company
npm run cli -- company:qualify <opportunity-id> <company-id>

# Research one company
npm run cli -- company:research <opportunity-id> <company-id>

# Find contacts
npm run cli -- contacts:discover <opportunity-id> <company-id>

# Generate an outreach draft
npm run cli -- outreach:create <opportunity-id> <company-id>

# Inspect execution
npm run cli -- execution:status <execution-id>
npm run cli -- execution:retry <execution-id>
```

The REST API should expose the same business operations.

### Opportunity endpoints

```text
POST   /opportunities
GET    /opportunities/:id
PATCH  /opportunities/:id

GET    /opportunities/:id/activities
```

### Target Market and Workflow endpoints

```text
POST   /opportunities/:id/target-markets/:targetMarketId/market-research
POST   /opportunities/:id/target-markets/:targetMarketId/company-discovery

POST   /opportunities/:id/companies/qualify
POST   /opportunities/:id/companies/:companyId/qualify

POST   /opportunities/:id/companies/:companyId/research
POST   /opportunities/:id/companies/:companyId/contacts
POST   /opportunities/:id/companies/:companyId/outreach-drafts
```

### Product endpoints

```text
GET    /products
POST   /products
GET    /products/:id
PATCH  /products/:id
POST   /products/:id/archive
POST   /products/:id/restore
```

### Customer Profile endpoints

```text
GET    /customer-profiles
POST   /customer-profiles
GET    /customer-profiles/:id
PATCH  /customer-profiles/:id
POST   /customer-profiles/:id/archive
POST   /customer-profiles/:id/restore
```

### Buyer Persona endpoints

```text
GET    /buyer-personas
POST   /buyer-personas
GET    /buyer-personas/:id
PATCH  /buyer-personas/:id
POST   /buyer-personas/:id/archive
POST   /buyer-personas/:id/restore
```

### Value Proposition endpoints

```text
GET    /value-propositions
POST   /value-propositions
GET    /value-propositions/:id
PATCH  /value-propositions/:id
POST   /value-propositions/:id/archive
POST   /value-propositions/:id/restore
```

### Opportunity association endpoints

Associates Knowledge Base entities to an opportunity. The MVP supports exactly one customer profile, multiple buyer personas, and multiple value propositions per opportunity.

```text
PUT    /opportunities/:id/customer-profile
  Body: { "customerProfileId": "..." }

PUT    /opportunities/:id/buyer-personas
  Body: { "buyerPersonaIds": ["...", "..."] }

PUT    /opportunities/:id/value-propositions
  Body: { "valuePropositionIds": ["...", "..."] }
```

The underlying join entities are `OpportunityBuyerPersona` and `OpportunityValueProposition`.

### Target Market Suggestion endpoints

```text
GET    /target-markets/:id/suggestions?status=pending
POST   /target-market-suggestions/:id/accept
POST   /target-market-suggestions/:id/reject
```

### Execution endpoints

```text
GET    /executions/:id
POST   /executions/:id/retry
POST   /executions/:id/cancel
```

Natural-language commands can be added later as a convenience layer.

They should not be required for the core system to work.

---

## 14. Proposed NestJS Structure

```text
src/
├── opportunities/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   ├── presentation/
│   └── opportunities.module.ts
│
├── products/
├── target-markets/
├── target-market-suggestions/
├── companies/
├── contacts/
├── research/
├── qualification/
├── outreach/
├── knowledge-base/
│   ├── customer-profiles/
│   ├── buyer-personas/
│   └── value-propositions/
├── activities/
├── executions/
├── jobs/
├── llm/
├── search/
├── scraping/
├── sources/
├── cli/
└── app.module.ts
```

A more detailed feature structure:

```text
companies/
├── domain/
│   ├── company.entity.ts
│   ├── opportunity-company.entity.ts
│   └── company.repository.ts
│
├── application/
│   ├── discover-companies.service.ts
│   ├── qualify-company.service.ts
│   ├── research-company.service.ts
│   └── dto/
│
├── infrastructure/
│   ├── prisma-company.repository.ts
│   ├── company-search.adapter.ts
│   └── company-website.adapter.ts
│
├── presentation/
│   ├── companies.controller.ts
│   └── companies.cli.ts
│
└── companies.module.ts
```

This structure keeps domain rules separate from external APIs and LLM providers without inventing a custom agent framework.

---

## 15. Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | NestJS | Modular architecture, dependency injection, validation |
| Language | TypeScript | Strong typing across domain and infrastructure |
| Database | PostgreSQL | Relationships, reporting, search, structured data |
| ORM | Prisma | Type-safe database access and migrations |
| Queue | BullMQ | Background jobs, retries, progress |
| Queue storage | Redis | BullMQ dependency and short-lived job state |
| LLM provider | OpenAI initially | Strong structured output and tool support |
| Validation | Zod or class-validator | Validate external and AI-generated data |
| CLI | NestJS command runner or dedicated CLI adapter | Fast MVP testing |
| API | REST | Simple integration and future frontend support |
| Static scraping | Cheerio | Fast extraction from HTML |
| Browser automation | Playwright | Only for sites that require JavaScript |
| Testing | Vitest or Jest | Unit and integration testing |
| Logging | Pino | Structured logs |
| Containers | Docker Compose | PostgreSQL and Redis locally |

---

## 16. Data Source Strategy

The original assumption that free sources will fully support the MVP is risky.

Free sources are useful for validation, but they are inconsistent and limited.

The MVP should use a provider abstraction from the beginning.

### Initial sources

| Need | Initial approach | Main risk |
|---|---|---|
| Web search | Google CSE or another search API | Low daily quota |
| Company websites | Direct fetch with Cheerio | Inconsistent HTML |
| JavaScript websites | Playwright | Slow and resource-heavy |
| Trade directories | Public pages | Terms and anti-bot restrictions |
| Import/export data | Government and public datasets | Country-specific formats |
| Contact names | Company websites and public profiles | Incomplete data |
| Email patterns | Public emails and pattern inference | High error rate |
| Email verification | External provider or cautious SMTP checks | Deliverability and legal concerns |

### Important constraints

- Do not treat LinkedIn scraping as a dependable MVP foundation.
- Do not promise unlimited free scraping.
- Respect robots.txt, terms of service, rate limits, and data protection rules.
- Store source timestamps because company information becomes outdated.
- Add paid providers later where they provide clear value.

---

## 17. Human Review

Human approval is a product feature, not a temporary limitation.

The user should be able to:

- approve or reject a company
- correct extracted information
- edit qualification criteria
- mark a research claim as incorrect
- approve or reject a contact
- edit an outreach draft
- approve a draft for sending
- accept or reject a target market suggestion
- add notes
- pause the opportunity

The system should learn from user corrections only inside the user's workspace unless explicit consent is provided for any broader use.

---

## 18. Privacy and Compliance

The system must follow data minimization principles.

Store only information needed for legitimate B2B sales activity.

Requirements:

- record where personal and company data came from
- avoid sensitive personal data
- provide data deletion mechanisms
- define retention periods
- encrypt secrets
- protect customer data from cross-tenant access
- avoid using customer data for model training without explicit consent
- review GDPR and PECR requirements before enabling automated outreach
- maintain suppression and do-not-contact lists
- require human approval before sending in the MVP

"Publicly available" does not automatically mean "unrestricted for any use."

---

## 19. Observability and Cost Control

AI and research workflows can become expensive quickly.

Each execution is tracked via the `Execution` entity (see §6.14).

Add limits for:

- companies discovered per run
- pages fetched per company
- LLM requests per operation
- maximum token usage
- retry count
- Playwright usage
- daily search quota

---

## 20. Error Handling and Partial Results

Partial results are normal in this type of system. The system should distinguish between different completion outcomes.

### Operation Status

```typescript
type OperationStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'PARTIALLY_SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';
```

### Result Envelope

```typescript
interface OperationResult<T> {
  status: OperationStatus;
  data?: T;

  warnings: OperationWarning[];
  errors: OperationError[];

  processedItems: number;
  successfulItems: number;
  failedItems: number;

  retryable: boolean;
  executionId: string;
}

interface OperationWarning {
  message: string;
  itemId?: string;
}
```

### Error Codes

```typescript
interface OperationError {
  code:
    | 'SEARCH_QUOTA_EXHAUSTED'
    | 'PROVIDER_RATE_LIMITED'
    | 'PAGE_FETCH_FAILED'
    | 'EMPTY_PAGE'
    | 'SCRAPING_BLOCKED'
    | 'LLM_TIMEOUT'
    | 'LLM_INVALID_OUTPUT'
    | 'EMAIL_VERIFICATION_FAILED'
    | 'UNKNOWN';

  message: string;
  provider?: string;
  itemId?: string;
  retryable: boolean;
}
```

### User-Facing Behaviour

Examples of what the user should see:

- > Company discovery partially completed. 24 companies were stored. 5 pages could not be processed. The failed pages can be retried.

Instead of:

- > Job failed.

### Retry Behaviour

Retries should be selective:

- retry HTTP 429 and temporary 5xx failures
- retry LLM timeouts
- retry invalid structured output a limited number of times
- do not repeatedly retry permanent 404s
- do not retry blocked scraping indefinitely
- do not discard already stored successful items

### Partial Result Examples

| Scenario | Behaviour |
|---|---|
| 20 companies found, 4 websites failed | Store 20. Mark 4 as failed. Allow retry on failures. |
| 8 companies qualified, 2 timed out | Store 8. Mark 2 as incomplete. |
| Company research completed, news search failed | Store profile. Mark news section as unavailable. |
| Contact found, email could not be verified | Store contact. Mark email as `UNKNOWN`. |
| Search provider rate limited mid-batch | Pause. Record progress. Allow resume or retry. |

### Idempotency

Rerunning a step must update or append results rather than duplicating everything. Use the `OpportunityCompany(opportunityId, companyId)` unique constraint to detect duplicates during subsequent discovery runs.

### Execution Lifecycle Endpoints

```text
GET  /executions/:id
POST /executions/:id/retry
POST /executions/:id/cancel
```

For bulk work, failed items should be retryable individually.

---

## 21. Persistence Design

### Core Relations

```text
Product
  └── OpportunityOffer
        └── Opportunity (1:1 via offerId, unique constraint on OpportunityOffer.opportunityId)

Opportunity
  ├── TargetMarket[]
  │     └── TargetMarketSuggestion[]
  ├── OpportunityCompany[]
  │     └── QualificationRecord[]
  ├── ResearchRecord[]
  ├── OutreachDraft[]
  ├── Activity[]
  └── Execution[]

Company
  ├── OpportunityCompany[]
  ├── Contact[]
  ├── ResearchRecord[]
  ├── OutreachDraft[]
  └── CompanySource[]

Contact
  ├── ResearchRecord[]
  ├── OutreachDraft[]
  └── ContactSource[]

ResearchRecord
  └── ResearchRecordSource[]

OutreachDraft
  ├── OutreachDraftResearch[]
  └── OutreachDraftSource[]

CustomerProfile
  └── QualificationRecord[] (via customerProfileId)

BuyerPersona
  ├── OpportunityBuyerPersona[]
  └── OutreachDraft[] (via buyerPersonaVersionId)

ValueProposition
  ├── OpportunityValueProposition[]
  └── OutreachDraft[] (via valuePropositionVersionIds)
```

### Important Unique Constraints

| Constraint | Scope |
|---|---|
| `Company.domain` | Globally unique |
| `OpportunityOffer.opportunityId` | One offer per opportunity |
| `OpportunityCompany(opportunityId, companyId)` | One company per opportunity |
| `Contact(companyId, email)` | One email per company |
| `QualificationRecord(id)` | Primary key |

### Important Indexes

```text
Opportunity(status, updatedAt)
OpportunityCompany(opportunityId, status)
OpportunityCompany(opportunityId, companyId)
QualificationRecord(opportunityCompanyId, createdAt DESC)
ResearchRecord(opportunityId, type, createdAt)
ResearchRecord(companyId, type, createdAt DESC)
ResearchRecord(contactId, type, createdAt)
Contact(companyId, jobTitle)
OutreachDraft(opportunityId, status)
OutreachDraft(companyId, status)
Activity(opportunityId, createdAt)
Execution(opportunityId, status, createdAt)
SourceReference(url)
```

The `ResearchRecord(companyId, type, createdAt DESC)` index is especially important for freshness queries during outreach context assembly.

### Join Table Indexes

```text
CompanySource(companyId, sourceReferenceId)
ContactSource(contactId, sourceReferenceId)
ResearchRecordSource(researchRecordId, sourceReferenceId)
OutreachDraftSource(outreachDraftId, sourceReferenceId)
OutreachDraftResearch(outreachDraftId, researchRecordId)
OpportunityBuyerPersona(opportunityId, buyerPersonaId)
OpportunityValueProposition(opportunityId, valuePropositionId)
```

### JSON Fields

Use JSON selectively for flexible product attributes and provider metadata. Do not hide core searchable fields inside JSON.

**Good JSON candidates:**

- `Product.generalAttributes`
- `OpportunityOffer.attributes`
- `Execution.providerCalls`
- `Execution.metrics`
- `Activity.metadata`

**Bad JSON candidates:**

- company industries
- target countries
- contact roles
- qualification status

Those will likely need filtering and reporting.

### Versioning Strategy

Entities with a `version` field (`CustomerProfile`, `BuyerPersona`, `ValueProposition`) increment their version on each `PATCH`. Records that reference these entities (`QualificationRecord`, `OutreachDraft`) store the version at the time of creation. This ensures historical traceability without needing full snapshot copies.

### Deletion Behaviour

- Deleting an opportunity may cascade to opportunity-owned records (offers, target markets, suggestions, opportunity-company links, research records, outreach drafts, activities, executions).
- Deleting a company globally should normally be restricted if it is referenced by any active opportunity.
- Research and activity history should not disappear accidentally.
- Source references used by drafts should remain available.
- Knowledge Base entities use `POST .../archive` and `POST .../restore` endpoints. The API does not expose hard `DELETE` for entities that have a `version` or `archivedAt` field.

---

## 22. MVP Scope

### Included

- opportunity creation
- reusable products with opportunity-specific offers
- target market definition
- market research with suggestions workflow
- reusable sales knowledge (customer profiles, buyer personas, value propositions)
- company discovery
- duplicate detection
- company qualification with versioned records
- company research
- contact discovery from public sources
- personalized outreach drafts with Knowledge Base version snapshots
- outreach-to-research traceability
- entity-to-source join tables
- human approval
- activity history
- execution tracking
- partial result handling and selective retries
- CLI
- REST API with archive/restore semantics
- background jobs
- PostgreSQL persistence

### Excluded

- automatic email sending
- inbox synchronization
- reply analysis
- automatic follow-up sequences
- CRM synchronization
- LinkedIn automation
- WhatsApp automation
- meeting scheduling
- quotations
- contracts
- logistics management
- billing
- multi-tenant SaaS administration
- autonomous negotiation

These exclusions prevent the MVP from becoming a full CRM before the core prospecting workflow has been proven.

---

## 23. Implementation Roadmap

## Phase 0 — Validation

Before building the full workflow:

- select one real opportunity
- define the product precisely
- define one target country
- manually research 10–20 companies
- identify which data is actually available
- test search and scraping limitations
- measure the quality of AI qualification
- produce several outreach drafts
- confirm what the salesperson considers useful

Deliverable:

> A manually assisted prospecting report for one real opportunity.

This phase validates the business process before architecture grows.

---

## Phase 1 — Opportunity and Product Foundation

Build:

- `Product` entity, CRUD, and archive/restore endpoints
- `OpportunityOffer` entity (with unique constraint on `opportunityId`)
- `Opportunity` entity
- `TargetMarket` entity
- `Activity` entity
- `SourceReference` entity and source link tables (`CompanySource`, `ContactSource`, `ResearchRecordSource`, `OutreachDraftSource`)
- `Execution` entity
- PostgreSQL schema with all Phase 1 tables
- Prisma repositories
- create/read/update API
- basic CLI commands

Deliverable:

> The user can create a product, create an opportunity linked to that product with an offer, define target markets, and inspect the complete opportunity workspace.

---

## Phase 2 — Market Research and Suggestions

Build:

- search provider interface + first adapter
- web page fetcher
- content extractor
- `ResearchRecord` entity (market type)
- `ResearchRecordSource` join table
- market research service
- `TargetMarketSuggestion` entity
- suggestion accept/reject workflow
- source persistence
- structured AI output
- partial-result handling

Deliverable:

> The system creates a sourced market research report for one opportunity, produces actionable target market suggestions, and allows the user to review and accept or reject them.

---

## Phase 3 — Company Discovery

Build:

- `Company` entity
- `OpportunityCompany` entity
- company discovery service
- domain normalization
- duplicate detection using unique constraints
- relevance filtering
- company discovery queue
- execution tracking and idempotent reruns
- manual approve/reject actions

Deliverable:

> The system produces a deduplicated list of possible buyer companies.

---

## Phase 4 — Qualification and Customer Profiles

Build:

- `CustomerProfile` entity with versioned updates
- customer profile CRUD and archive/restore endpoints
- opportunity/customer-profile association
- `QualificationRecord` entity
- qualification criteria and weighted scoring
- evidence-backed verdicts
- `INCONCLUSIVE` handling
- bulk qualification jobs
- manual correction
- `OpportunityCompany.latestQualificationId` update logic

Deliverable:

> The system ranks companies, explains the score using stored evidence, and preserves the customer profile version used for each qualification.

---

## Phase 5 — Company Research

Build:

- company website analysis
- targeted web search
- company `ResearchRecord` persistence
- fact/inference distinction (`evidenceStatus` on findings)
- possible objection hypotheses
- conversation starters
- research freshness timestamps

Deliverable:

> The user can open a qualified company and see a concise, sourced research profile with clear evidence labelling.

---

## Phase 6 — Buyer Personas and Contact Discovery

Build:

- `Contact` entity
- `ContactSource` join table
- `BuyerPersona` entity with versioned updates
- buyer persona CRUD and archive/restore endpoints
- `OpportunityBuyerPersona` join entity
- role matching
- public contact discovery
- email pattern inference
- email confidence status
- manual contact entry
- contact approval

Deliverable:

> The user can identify one or more relevant people at a selected company, matched against defined buyer personas.

---

## Phase 7 — Value Propositions and Outreach

Build:

- `ValueProposition` entity with versioned updates
- value proposition CRUD and archive/restore endpoints
- `OpportunityValueProposition` join entity
- approved and forbidden claims
- messaging rules
- `OutreachContextService` — assembles all context for a draft
- `OutreachDraftResearch` join table
- email draft generation with `buyerPersonaVersionId` and `valuePropositionVersionIds` snapshots
- source-backed personalization
- draft review status
- edit and approval flow

Deliverable:

> The system produces a credible draft that a salesperson can review and send manually, with full traceability to the research records and Knowledge Base versions that informed it.

---

## Phase 8 — Minimal Web Interface

Only after the CLI workflow works:

- opportunity list
- opportunity overview
- company pipeline
- company research view
- contact list
- outreach draft editor
- activity history
- job status and errors
- target market suggestion review
- knowledge base entity management

Deliverable:

> A usable workspace for operating the validated workflow without the CLI.

---

## 24. MVP Success Criteria

The MVP is successful when a real user can take one opportunity and obtain:

- at least 20 relevant companies
- no obvious duplicates
- a useful qualification ranking
- credible sourced research for the best companies
- relevant contacts where publicly available
- outreach drafts that require editing rather than complete rewriting
- a clear history of what the system did
- results that save meaningful manual research time

Technical completion alone is not success.

The real test is:

> Would a salesperson use the produced shortlist and drafts to contact these companies?

---

## 25. Design Principles

1. **The opportunity is the center of the product.**
   Products, companies, contacts, research, and outreach belong to a business opportunity.

2. **AI supports business operations.**
   AI is used inside explicit services. It is not the architecture.

3. **Human decisions remain visible.**
   Users approve companies, contacts, messages, and target market suggestions.

4. **Evidence is more important than model confidence.**
   Important claims must point to sources. `evidenceStatus` is the primary trustworthiness check.

5. **Facts, inferences, and unknowns must be separated.**
   The system should admit when information is missing.

6. **Workflows should be deterministic where possible.**
   Natural-language control can be added later.

7. **Stored research should be reusable.**
   Do not repeat expensive work without a reason.

8. **Providers must be replaceable.**
   Search, LLM, scraping, and email validation services need interfaces.

9. **The MVP must solve one complete business workflow.**
   A partially built collection of AI features is not enough.

10. **Privacy and compliance are product requirements.**
    They cannot be postponed until after automatic outreach is implemented.

11. **Knowledge Base entities are added incrementally.**
    Build them when the first workflow step that needs them is implemented, not before.

12. **The system handles partial success gracefully.**
    Failing to retrieve one source or process one company should not lose results already obtained.

13. **Historical records remain traceable.**
    Qualification scores and outreach drafts record which versions of profiles, personas, and value propositions were used.

14. **Source links are first-class data.**
    A company, contact, research record, or draft references sources through typed join tables, not raw URL arrays.

---

## 26. Decisions Log

### 2026-07-15 — Opportunity-centered architecture

The product will be organized around business opportunities rather than AI agents.

Reason:

- opportunities are the actual business objects
- the model supports multiple industries
- research and outreach remain connected to a commercial goal
- the architecture can later expand beyond SDR work

---

### 2026-07-15 — No general orchestrator in the MVP

The MVP will use explicit services and commands.

Reason:

- deterministic workflows are easier to test
- debugging is simpler
- user intent does not need AI classification for basic operations
- a natural-language command layer can be added later

---

### 2026-07-15 — No custom agent framework

The system will use domain services, provider interfaces, queues, and structured LLM calls.

Reason:

- avoids premature abstraction
- keeps AI replaceable
- reduces framework maintenance
- focuses implementation on business functionality

---

### 2026-07-15 — Evidence instead of chain-of-thought

The system will store summaries, findings, sources, confidence level, and execution logs.

Reason:

- private model reasoning is not a dependable API contract
- sources are auditable
- concise explanations are more useful to users
- evidence can be verified independently

---

### 2026-07-15 — CLI and REST before conversational control

The first interface will use explicit commands and API endpoints.

Reason:

- easier testing
- predictable behavior
- lower token usage
- simpler authorization
- conversational control can later call the same application services

---

### 2026-07-15 — Human approval before outreach

The MVP will create drafts but will not send them automatically.

Reason:

- reduces compliance risk
- protects brand reputation
- allows quality evaluation
- keeps the salesperson responsible for communication

---

### 2026-07-15 — Product / OpportunityOffer split

A reusable `Product` describes what the thing is. `OpportunityOffer` holds the commercial terms specific to one deal (quantity, location, price, deadline, delivery terms).

Reason:

- the same product may be sold in multiple opportunities with different terms
- changing quantity or location for one deal must not affect the reusable product definition
- clean separation between product catalog and deal-specific commercial data

---

### 2026-07-15 — Incremental Knowledge Base strategy

Knowledge Base entities (`Product`, `CustomerProfile`, `BuyerPersona`, `ValueProposition`) are introduced in the implementation phase that first consumes them, not in a standalone phase.

Reason:

- avoids building a generic knowledge-management subsystem before knowing how the data will actually be used
- entities have real requirements and consumer workflows from the start
- prevents an empty CRUD shell sitting unused for multiple phases

---

### 2026-07-15 — TargetMarketSuggestion workflow over silent mutations

Market research produces structured suggestions. The user reviews, accepts, or rejects them. Accepted suggestions update the target market through an explicit command.

Reason:

- the user-defined target market remains the source of truth
- every change is recorded with its origin and reasoning
- rejected suggestions do not pollute the definition
- the workflow is auditable

---

### 2026-07-15 — Execution and Activity separation

`Execution` records technical and operational details (provider calls, tokens, duration, errors). `Activity` records business-facing events users care about. An `Activity` may reference its `Execution`.

Reason:

- the user timeline should not be cluttered with token counts and provider 429 errors
- technical data is needed for debugging and cost control
- the link provides traceability between business outcomes and technical operations

---

### 2026-07-15 — Partial result handling and selective retries

The system distinguishes `SUCCEEDED`, `PARTIALLY_SUCCEEDED`, `FAILED` statuses. Retries are selective: temporary failures (429, 5xx, LLM timeout) retry; permanent failures (404, blocked scraping) do not. Already-stored successful items are never discarded.

Reason:

- partial completion is normal when scraping and searching the open web
- discarding 20 valid companies because 4 pages failed is unacceptable
- retrying permanent failures wastes resources and delays user visibility of results

---

### 2026-07-15 — OutreachContextService and draft-to-research linkage

An `OutreachContextService` assembles all data needed for a draft (opportunity, offer, company, contact, research records, persona, value propositions). A join table (`OutreachDraftResearch`) records exactly which research records informed each draft.

Reason:

- the draft service should receive structured context, not query scattered records itself
- explicit linkage enables auditing: which research fact was used in which draft
- better traceability than reconstructing relationships later from source IDs

---

### 2026-07-15 — Persisted entities and read models are separated

Domain entities like `Opportunity` hold foreign keys (`offerId`), not nested objects. A separate `OpportunityWorkspace` read model assembles the opportunity, its offer, the product, and target markets for the API response.

Reason:

- prevents circular-looking ownership between `Opportunity` and `OpportunityOffer`
- the persisted schema and the API representation serve different purposes
- read models can optimize query patterns without changing the database layout

---

### 2026-07-15 — Source link tables replace raw sourceUrls arrays

Sources are connected to domain entities through typed join tables (`CompanySource`, `ContactSource`, `ResearchRecordSource`, `OutreachDraftSource`) instead of `sourceUrls: string[]` fields.

Reason:

- each source link gets a retrieval date, context, and source type
- a single `SourceReference` can be reused by multiple entities
- prevents duplicated URLs with inconsistent metadata
- queries for "which sources were used for this company" are indexed and explicit

---

### 2026-07-15 — QualificationRecord and Knowledge Base versioning

`QualificationRecord` captures the customer profile version used at qualification time. `OutreachDraft` captures `buyerPersonaVersionId` and `valuePropositionVersionIds`. `CustomerProfile`, `BuyerPersona`, and `ValueProposition` each have a `version` number.

Reason:

- editing a customer profile after qualification should not make the old score appear to have been calculated from the new profile
- an outreach draft generated before a value proposition was changed should preserve its original messaging context
- `archivedAt` alone is not sufficient—a draft needs to know exactly which version it was built from

---

### 2026-07-15 — Archive/restore instead of hard DELETE for Knowledge Base entities

The API uses `POST /products/:id/archive` and `POST /products/:id/restore` instead of `DELETE /products/:id`. Same pattern for customer profiles, buyer personas, and value propositions.

Reason:

- hard-deleting a profile that was used in historical qualification records breaks traceability
- archiving accurately describes the business action: "this entity is no longer active"
- restore provides a clear undo path

---

### 2026-07-15 — One offer per opportunity in the MVP

`OpportunityOffer.opportunityId` has a unique constraint. The MVP supports exactly one offer per opportunity.

Reason:

- covers the current use case without premature generality
- later, the system could support multiple products or lots per opportunity by removing the unique constraint
- keeps the domain model and API simple for validation
