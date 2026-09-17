import { z } from 'zod';

/**
 * Market-research persistence contracts (write side).
 *
 * A run owns discovery queries and the evidence/claim records produced during
 * it. Sources are deduplicated by URL; evidence is the raw observation extracted
 * from a source; claims are the conclusions drawn from evidence. These schemas
 * validate request bodies only; response shapes are returned by the API modules.
 */

export const ResearchRunStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const ResearchRunPauseReasonSchema = z.enum([
  'BUDGET_EXHAUSTED',
  'ACCESS_BLOCKED',
  'CONTEXT_CHANGED',
  'DIMINISHING_RETURNS',
  'NEEDS_HUMAN',
]);

export const ResearchQueryStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]);

export const EvidenceVerificationStatusSchema = z.enum([
  'VERIFIED',
  'UNVERIFIED',
]);

export const ClaimTypeSchema = z.enum(['FACT', 'INFERENCE', 'UNKNOWN']);

export const ClaimConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const ClaimEvidenceStanceSchema = z.enum([
  'SUPPORTS',
  'REFUTES',
  'CONTEXT',
]);

/**
 * Correction lifecycle of a claim. Deliberately separate from `ClaimType`
 * (FACT/INFERENCE/UNKNOWN) and from evidence verification status.
 */
export const ClaimLifecycleStatusSchema = z.enum([
  'CURRENT',
  'RETRACTED',
  'REPLACED',
]);

/** A correction either retracts a claim or replaces it with another claim. */
export const ClaimCorrectionKindSchema = z.enum(['RETRACTION', 'REPLACEMENT']);

/** Run-scoped progress. Not a workflow engine: coverage + pending follow-ups. */
export const ResearchRunCheckpointSchema = z.strictObject({
  coverage: z
    .array(
      z.strictObject({
        targetMarketId: z.string().min(1),
        dimension: z.string().trim().min(1).max(120),
        status: z.string().trim().min(1).max(60),
        note: z.string().max(2000).optional(),
      }),
    )
    .optional(),
  pendingFollowUps: z
    .array(
      z.strictObject({
        kind: z.string().trim().min(1).max(60),
        ref: z.string().trim().min(1).max(500),
        note: z.string().max(2000).optional(),
      }),
    )
    .optional(),
  notes: z.string().max(4000).optional(),
});

/**
 * Creates a run for an existing opportunity. Scope is derived from the
 * opportunity's attached target markets; the body carries no business data.
 */
export const CreateResearchRunSchema = z.strictObject({}).default({});

/**
 * Lifecycle-only update. `PAUSED` requires a `pauseReason`; `FAILED` requires an
 * `errorCode`; a non-paused status must not carry a pause reason. `contextVersion`
 * is only used to explicitly acknowledge (not silently rebase) a context change.
 */
export const UpdateResearchRunSchema = z
  .strictObject({
    status: ResearchRunStatusSchema.optional(),
    pauseReason: ResearchRunPauseReasonSchema.optional(),
    pauseNote: z.string().trim().min(1).max(4000).optional(),
    errorCode: z.string().trim().min(1).max(120).optional(),
    errorNote: z.string().trim().min(1).max(4000).optional(),
    checkpoint: ResearchRunCheckpointSchema.optional(),
    contextVersion: z.number().int().positive().optional(),
  })
  .refine(
    (value) => value.status !== 'PAUSED' || value.pauseReason !== undefined,
    { message: 'a PAUSED run requires a pauseReason' },
  )
  .refine(
    (value) =>
      value.status === undefined ||
      value.status === 'PAUSED' ||
      value.pauseReason === undefined,
    { message: 'pauseReason is only valid for a PAUSED run' },
  )
  .refine(
    (value) => value.status !== 'FAILED' || value.errorCode !== undefined,
    { message: 'a FAILED run requires an errorCode' },
  );

export const RecordResearchQuerySchema = z.strictObject({
  queryText: z.string().trim().min(1).max(4000),
  provider: z.string().trim().min(1).max(120).optional(),
  status: ResearchQueryStatusSchema.optional(),
  executedAt: z.coerce.date().optional(),
  resultCount: z.number().int().min(0).optional(),
  errorCode: z.string().trim().min(1).max(120).optional(),
  errorNote: z.string().trim().min(1).max(4000).optional(),
});

/** Registers a discovered source; the same URL is never stored twice. */
export const RegisterSourceSchema = z.strictObject({
  url: z.url().max(2048),
  title: z.string().trim().min(1).max(512).optional(),
  publisher: z.string().trim().min(1).max(255).optional(),
  sourceType: z.string().trim().min(1).max(64).optional(),
});

/**
 * Persists a factual observation extracted from a source. The URL is resolved
 * to a deduplicated source (created if new). `UNVERIFIED` stays distinguishable
 * from `VERIFIED`.
 */
export const PersistEvidenceSchema = z.strictObject({
  url: z.url().max(2048),
  title: z.string().trim().min(1).max(512).optional(),
  publisher: z.string().trim().min(1).max(255).optional(),
  sourceType: z.string().trim().min(1).max(64).optional(),
  evidenceText: z.string().trim().min(1).max(20000),
  verificationStatus: EvidenceVerificationStatusSchema.optional(),
  retrievedAt: z.coerce.date().optional(),
});

/**
 * Persists a conclusion. `FACT` and `INFERENCE` claims require at least one
 * evidence link; an `UNKNOWN` claim must not carry evidence or a value.
 */
export const PersistClaimSchema = z
  .strictObject({
    type: ClaimTypeSchema,
    statement: z.string().trim().min(1).max(20000),
    confidence: ClaimConfidenceSchema.optional(),
    evidence: z
      .array(
        z.strictObject({
          evidenceId: z.string().min(1),
          stance: ClaimEvidenceStanceSchema.optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (value) =>
      (value.type !== 'FACT' && value.type !== 'INFERENCE') ||
      (value.evidence !== undefined && value.evidence.length > 0),
    { message: 'a FACT or INFERENCE claim requires at least one evidence link' },
  )
  .refine(
    (value) =>
      value.type !== 'UNKNOWN' ||
      value.evidence === undefined ||
      value.evidence.length === 0,
    { message: 'an UNKNOWN claim must not carry evidence' },
  );

/**
 * Corrects an existing claim without editing or deleting it. A `REPLACEMENT`
 * must name the replacement claim (same run, currently `CURRENT`); a
 * `RETRACTION` must not. The reason and correction timestamp are stored on the
 * original claim, and the replacement relationship is recorded.
 */
export const CorrectClaimSchema = z
  .strictObject({
    kind: ClaimCorrectionKindSchema,
    reason: z.string().trim().min(1).max(2000),
    replacementClaimId: z.uuid().optional(),
  })
  .refine(
    (value) =>
      value.kind !== 'REPLACEMENT' || value.replacementClaimId !== undefined,
    { message: 'a REPLACEMENT correction requires replacementClaimId' },
  )
  .refine(
    (value) =>
      value.kind !== 'RETRACTION' || value.replacementClaimId === undefined,
    { message: 'a RETRACTION correction must not carry replacementClaimId' },
  );

/**
 * A structured, evidence-linked company offering. Every value is explicit; an
 * unrecorded field is omitted (stored null / `UNKNOWN`) and never inferred.
 * Provenance is mandatory: the offering names the source and evidence it came
 * from, and optionally the CURRENT claim it supports.
 */
export const OfferingVatStatusSchema = z.enum([
  'INCLUDED',
  'EXCLUDED',
  'NOT_STATED',
  'UNKNOWN',
]);

export const OfferingPriceBasisSchema = z.enum([
  'RETAIL_LIST',
  'TRADE_B2B',
  'UNKNOWN',
]);

export const OfferingSampleKindSchema = z.enum([
  'SAMPLE',
  'FULL_PRODUCT',
  'UNKNOWN',
]);

export const OfferingMatchTypeSchema = z.enum([
  'EXACT_MATCH',
  'ADJACENT',
  'SUBSTITUTE',
  'UNKNOWN',
]);

const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).optional();

export const CreateOfferingSchema = z
  .strictObject({
    companyText: optionalText(255),
    companyLocationText: optionalText(255),
    marketServedText: optionalText(255),
    productText: optionalText(512),
    applicationText: optionalText(255),
    treatmentText: optionalText(255),
    dimensionsText: optionalText(255),
    priceText: optionalText(2000),
    priceCurrency: optionalText(12),
    priceUnit: optionalText(64),
    vatStatus: OfferingVatStatusSchema.optional(),
    priceBasis: OfferingPriceBasisSchema.optional(),
    sampleKind: OfferingSampleKindSchema.optional(),
    matchType: OfferingMatchTypeSchema.optional(),
    sourceReferenceId: z.uuid(),
    evidenceId: z.uuid(),
    claimId: z.uuid().optional(),
  })
  .refine(
    (value) => value.companyText !== undefined || value.productText !== undefined,
    { message: 'an offering requires at least a company or a product text' },
  );

export type ResearchRunStatus = z.infer<typeof ResearchRunStatusSchema>;
export type ResearchRunPauseReason = z.infer<
  typeof ResearchRunPauseReasonSchema
>;
export type ResearchQueryStatus = z.infer<typeof ResearchQueryStatusSchema>;
export type EvidenceVerificationStatus = z.infer<
  typeof EvidenceVerificationStatusSchema
>;
export type ClaimType = z.infer<typeof ClaimTypeSchema>;
export type ClaimConfidence = z.infer<typeof ClaimConfidenceSchema>;
export type ClaimEvidenceStance = z.infer<typeof ClaimEvidenceStanceSchema>;
export type ClaimLifecycleStatus = z.infer<typeof ClaimLifecycleStatusSchema>;
export type ClaimCorrectionKind = z.infer<typeof ClaimCorrectionKindSchema>;
export type ResearchRunCheckpoint = z.infer<typeof ResearchRunCheckpointSchema>;
export type CreateResearchRunInput = z.infer<typeof CreateResearchRunSchema>;
export type UpdateResearchRunInput = z.infer<typeof UpdateResearchRunSchema>;
export type RecordResearchQueryInput = z.infer<
  typeof RecordResearchQuerySchema
>;
export type RegisterSourceInput = z.infer<typeof RegisterSourceSchema>;
export type PersistEvidenceInput = z.infer<typeof PersistEvidenceSchema>;
export type PersistClaimInput = z.infer<typeof PersistClaimSchema>;
export type CorrectClaimInput = z.infer<typeof CorrectClaimSchema>;
export type OfferingVatStatus = z.infer<typeof OfferingVatStatusSchema>;
export type OfferingPriceBasis = z.infer<typeof OfferingPriceBasisSchema>;
export type OfferingSampleKind = z.infer<typeof OfferingSampleKindSchema>;
export type OfferingMatchType = z.infer<typeof OfferingMatchTypeSchema>;
export type CreateOfferingInput = z.infer<typeof CreateOfferingSchema>;
