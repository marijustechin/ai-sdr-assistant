import { z } from 'zod';

/**
 * Account Intelligence / Company Brief contracts.
 *
 * A brief is a focused dossier for **human sales preparation** on one
 * company/opportunity relationship — NOT a broad market-research run. It is
 * compiled from already-persisted platform intelligence (Stage 1) and, on request,
 * augmented by a targeted public-data enrichment (Stage 2) submitted by the
 * research harness. Facts, recent enrichment and commercial hypotheses are kept
 * explicitly distinct; unavailable financials/headcount/decision-makers are never
 * invented.
 */

/** Where a brief source came from (for provenance display). */
export const BriefSourceKindSchema = z.enum([
  'PLATFORM',
  'FIRST_PARTY',
  'REGISTRY',
  'NEWS',
  'SOCIAL',
  'MARKET_RESEARCH',
  'OTHER',
]);

export const BriefSourceSchema = z.strictObject({
  url: z.url().max(2048),
  title: z.string().trim().min(1).max(512).optional(),
  publisher: z.string().trim().min(1).max(255).optional(),
  retrievedAt: z.coerce.date(),
  kind: BriefSourceKindSchema.optional(),
});

/** Distinct evidence classes: never blur a hypothesis into a fact. */
export const BriefFindingKindSchema = z.enum([
  'KNOWN_FACT',
  'RECENT_ENRICHMENT',
  'COMMERCIAL_HYPOTHESIS',
]);

export const BriefFindingSchema = z.strictObject({
  statement: z.string().trim().min(1).max(2000),
  detail: z.string().trim().max(4000).optional(),
  kind: BriefFindingKindSchema,
  sources: z.array(BriefSourceSchema).max(20).optional(),
});

const SectionSchema = z.array(BriefFindingSchema).max(200);

export const BriefSectionKeySchema = z.enum([
  'COMPANY_OVERVIEW',
  'RELEVANT_PRODUCTS_OPERATIONS',
  'WHY_THIS_ACCOUNT_FITS',
  'EXISTING_RELATIONSHIP_OUTREACH',
  'KEY_PEOPLE_CONTACTS',
  'FINANCIAL_SIZE_SIGNALS',
  'MARKETS_CUSTOMERS_CHANNELS',
  'RECENT_ACTIVITY',
  'REPUTATION_PUBLIC_FEEDBACK',
  'COMMERCIAL_HYPOTHESES',
  'THINGS_TO_KNOW_BEFORE_MEETING',
]);

/** The structured brief content stored on each snapshot. */
export const BriefContentSchema = z
  .strictObject({
    atAGlance: z.array(z.string().trim().min(1).max(500)).max(20),
    companyOverview: SectionSchema,
    relevantProductsOperations: SectionSchema,
    whyThisAccountFits: SectionSchema,
    existingRelationshipOutreach: SectionSchema,
    keyPeopleContacts: SectionSchema,
    financialSizeSignals: SectionSchema,
    marketsCustomersChannels: SectionSchema,
    recentActivity: SectionSchema,
    reputationPublicFeedback: SectionSchema,
    commercialHypotheses: SectionSchema,
    thingsToKnowBeforeMeeting: SectionSchema,
    questionsWorthAsking: z.array(z.string().trim().min(1).max(500)).max(50),
    unknownsGaps: z.array(z.string().trim().min(1).max(500)).max(50),
  })
  .refine(
    (value) =>
      value.commercialHypotheses.every(
        (finding) => finding.kind === 'COMMERCIAL_HYPOTHESIS',
      ),
    { message: 'commercialHypotheses must be labelled COMMERCIAL_HYPOTHESIS' },
  )
  .refine(
    (value) =>
      [
        value.companyOverview,
        value.financialSizeSignals,
        value.recentActivity,
        value.reputationPublicFeedback,
      ].every((section) =>
        section.every((finding) => finding.kind !== 'COMMERCIAL_HYPOTHESIS'),
      ),
    {
      message:
        'factual sections must not contain COMMERCIAL_HYPOTHESIS findings',
    },
  );

export type BriefSource = z.infer<typeof BriefSourceSchema>;
export type BriefFinding = z.infer<typeof BriefFindingSchema>;
export type BriefFindingKind = z.infer<typeof BriefFindingKindSchema>;
export type BriefSectionKey = z.infer<typeof BriefSectionKeySchema>;
export type BriefContent = z.infer<typeof BriefContentSchema>;

/** Lifecycle of a brief snapshot. */
export const CompanyBriefStatusSchema = z.enum([
  'COMPILED',
  'ENRICHMENT_REQUESTED',
  'ENRICHED',
]);

export type CompanyBriefStatus = z.infer<typeof CompanyBriefStatusSchema>;

/** Human action: request a targeted enrichment of the current brief. */
export const RequestCompanyEnrichmentSchema = z.strictObject({
  note: z.string().trim().max(2000).optional(),
});

/** Harness submission: structured enrichment findings + evidence (Stage 2). */
export const SubmitCompanyEnrichmentSchema = z.strictObject({
  findings: z
    .array(
      z.strictObject({
        section: BriefSectionKeySchema,
        statement: z.string().trim().min(1).max(2000),
        detail: z.string().trim().max(4000).optional(),
        kind: BriefFindingKindSchema,
        sources: z.array(BriefSourceSchema).max(20).optional(),
      }),
    )
    .min(1)
    .max(200),
  atAGlance: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  questionsWorthAsking: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  unknownsGaps: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  /** Existing unknowns this enrichment resolves (removed from the snapshot). */
  resolvedUnknowns: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type RequestCompanyEnrichmentInput = z.infer<
  typeof RequestCompanyEnrichmentSchema
>;
export type SubmitCompanyEnrichmentInput = z.infer<
  typeof SubmitCompanyEnrichmentSchema
>;
