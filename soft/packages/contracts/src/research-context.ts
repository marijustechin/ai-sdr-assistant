import { z } from 'zod';

/**
 * Research Context contract (`research_context_v1`).
 *
 * This is the implementation of the canonical contract in
 * `docs/system/research-context-contract.md` (repository root). Redaction is
 * enforced at assembly time in `control-plane`; this file defines the shape and
 * the schema version literal.
 */

export const SCHEMA_VERSION = 'research_context_v1' as const;

/** A consumer must refuse a payload whose `schemaVersion` it does not know. */
export const ResearchContextSchemaVersionSchema = z.literal(SCHEMA_VERSION);

export const FactSubjectSchema = z.enum(['PRODUCT', 'OFFER', 'OPPORTUNITY']);

export const ResolvedSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string(),
  retrievalDate: z.string(),
});

/** CONFIRMED + OPERATIONAL fact — safe to assert, carries its value. */
export const AssertableFactSchema = z.object({
  id: z.string(),
  subject: FactSubjectSchema,
  subjectId: z.string(),
  key: z.string(),
  status: z.literal('CONFIRMED'),
  version: z.number().int().positive(),
  value: z.string(),
  unit: z.string().optional(),
  /** Implemented source metadata (evidence module is not built yet). */
  sourceLabel: z.string().optional(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  confirmedAt: z.string(),
  asOf: z.string(),
  /** Resolved evidence; empty until the `evidence` module exists. */
  evidence: z.array(ResolvedSourceSchema),
  explanation: z.string().optional(),
});

/** PENDING or RESTRICTED fact — no value is ever present. */
export const RedactedFactSchema = z.strictObject({
  id: z.string(),
  subject: FactSubjectSchema,
  subjectId: z.string(),
  key: z.string(),
  status: z.enum(['PENDING', 'RESTRICTED']),
  version: z.number().int().positive(),
  explanation: z.string(),
});

export const TaskScopeSchema = z.object({
  targetMarketIds: z.array(z.string()),
  country: z.string().optional(),
  industry: z.string().optional(),
});

export const TargetMarketContextSchema = z.object({
  id: z.string(),
  countries: z.array(z.string()),
  industries: z.array(z.string()),
  companyTypes: z.array(z.string()),
  buyerTitles: z.array(z.string()),
  requirements: z.array(z.string()),
  exclusions: z.array(z.string()),
});

export const ResearchContextSchema = z.object({
  schemaVersion: ResearchContextSchemaVersionSchema,
  contextVersion: z.number().int().positive(),
  frozenAt: z.string(),

  scope: TaskScopeSchema,

  opportunity: z.object({
    id: z.string(),
    name: z.string(),
    objective: z.string(),
    status: z.string(),
    priority: z.string().optional(),
    deadline: z.string().optional(),
  }),

  product: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
  }),

  offer: z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.string().optional(),
    unit: z.string().optional(),
    currentLocation: z.string().optional(),
    price: z.string().optional(),
    minimumOrder: z.string().optional(),
    availabilityDate: z.string().optional(),
    deliveryTerms: z.array(z.string()),
    certifications: z.array(z.string()),
  }),

  facts: z.object({
    confirmed: z.array(AssertableFactSchema),
    pending: z.array(RedactedFactSchema),
    restricted: z.array(RedactedFactSchema),
  }),

  unknowns: z.array(z.string()),

  targetMarkets: z.array(TargetMarketContextSchema),

  priorResearchRuns: z.array(
    z.object({
      runId: z.string(),
      contextVersion: z.number().int().positive(),
      status: z.string(),
      completedAt: z.string().optional(),
      summary: z.string().optional(),
    }),
  ),

  existingCompanies: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      domain: z.string().optional(),
      country: z.string().optional(),
      status: z.string(),
    }),
  ),

  approvedKnowledge: z.object({
    customerProfile: z
      .object({
        id: z.string(),
        version: z.number().int().positive(),
        industries: z.array(z.string()),
        companyTypes: z.array(z.string()),
        countries: z.array(z.string()),
        positiveSignals: z.array(z.string()),
        negativeSignals: z.array(z.string()),
        requiredAttributes: z.array(z.string()),
      })
      .optional(),
    buyerPersonas: z.array(
      z.object({
        id: z.string(),
        version: z.number().int().positive(),
        jobTitles: z.array(z.string()),
        departments: z.array(z.string()),
        painPoints: z.array(z.string()),
        buyingMotivations: z.array(z.string()),
      }),
    ),
    valuePropositions: z.array(
      z.object({
        id: z.string(),
        version: z.number().int().positive(),
        positioning: z.string(),
        benefits: z.array(z.string()),
        differentiators: z.array(z.string()),
        approvedClaims: z.array(z.string()),
        forbiddenClaims: z.array(z.string()),
      }),
    ),
  }),

  humanDecisions: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      decision: z.enum(['ACCEPTED', 'REJECTED']),
      reason: z.string().optional(),
      sourceIds: z.array(z.string()),
      decidedAt: z.string(),
      decidedBy: z.string(),
    }),
  ),
});

export type ResearchContext = z.infer<typeof ResearchContextSchema>;
export type AssertableFact = z.infer<typeof AssertableFactSchema>;
export type RedactedFact = z.infer<typeof RedactedFactSchema>;
export type FactSubject = z.infer<typeof FactSubjectSchema>;
export type ResolvedSource = z.infer<typeof ResolvedSourceSchema>;
export type TargetMarketContext = z.infer<typeof TargetMarketContextSchema>;
