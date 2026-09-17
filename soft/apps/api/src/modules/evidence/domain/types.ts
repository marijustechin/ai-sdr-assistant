/**
 * Domain types for the `evidence` module (no NestJS, Prisma, or HTTP imports).
 */

export type EvidenceVerificationStatus = 'VERIFIED' | 'UNVERIFIED';
export type ClaimType = 'FACT' | 'INFERENCE' | 'UNKNOWN';
export type ClaimConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ClaimEvidenceStance = 'SUPPORTS' | 'REFUTES' | 'CONTEXT';

/**
 * Correction lifecycle of a claim. Separate from `ClaimType` and from evidence
 * verification status. A `REPLACED` claim points at its replacement; a
 * `RETRACTED` claim has no replacement.
 */
export type ClaimLifecycleStatus = 'CURRENT' | 'RETRACTED' | 'REPLACED';
export type ClaimCorrectionKind = 'RETRACTION' | 'REPLACEMENT';

/** Reasons a claim correction is rejected. */
export type ClaimCorrectionErrorCode =
  | 'claim_not_found'
  | 'claim_already_corrected'
  | 'replacement_claim_not_found'
  | 'claim_replacement_self'
  | 'replacement_claim_not_current'
  | 'claim_replacement_cycle';

/** Typed, non-sensitive error raised by the correction write path. */
export class ClaimCorrectionError extends Error {
  constructor(readonly code: ClaimCorrectionErrorCode) {
    super(code);
    this.name = 'ClaimCorrectionError';
  }
}

export interface SourceReferenceRecord {
  id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceRecord {
  id: string;
  sourceReferenceId: string;
  researchRunId: string;
  evidenceText: string;
  verificationStatus: EvidenceVerificationStatus;
  retrievedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  source: SourceReferenceRecord;
}

export interface ClaimEvidenceRecord {
  id: string;
  evidenceId: string;
  stance: ClaimEvidenceStance;
}

export interface ClaimRecord {
  id: string;
  researchRunId: string;
  type: ClaimType;
  statement: string;
  confidence: ClaimConfidence;
  lifecycleStatus: ClaimLifecycleStatus;
  correctionReason: string | null;
  correctedAt: Date | null;
  replacedByClaimId: string | null;
  createdAt: Date;
  updatedAt: Date;
  evidence: ClaimEvidenceRecord[];
}

export interface RegisterSourceData {
  url: string;
  title?: string;
  publisher?: string;
  sourceType?: string;
}

export interface PersistEvidenceData {
  researchRunId: string;
  sourceReferenceId: string;
  evidenceText: string;
  verificationStatus?: EvidenceVerificationStatus;
  retrievedAt?: Date;
}

export interface EvidenceLinkInput {
  evidenceId: string;
  stance?: ClaimEvidenceStance;
}

export interface PersistClaimData {
  researchRunId: string;
  type: ClaimType;
  statement: string;
  confidence?: ClaimConfidence;
  evidence: EvidenceLinkInput[];
}

export interface CorrectClaimData {
  kind: ClaimCorrectionKind;
  reason: string;
  replacementClaimId?: string;
}

export type OfferingVatStatus =
  | 'INCLUDED'
  | 'EXCLUDED'
  | 'NOT_STATED'
  | 'UNKNOWN';
export type OfferingPriceBasis = 'RETAIL_LIST' | 'TRADE_B2B' | 'UNKNOWN';
export type OfferingSampleKind = 'SAMPLE' | 'FULL_PRODUCT' | 'UNKNOWN';
export type OfferingMatchType =
  | 'EXACT_MATCH'
  | 'ADJACENT'
  | 'SUBSTITUTE'
  | 'UNKNOWN';

/** Reasons an offering write is rejected. */
export type OfferingErrorCode =
  | 'offering_evidence_not_in_run'
  | 'offering_source_mismatch'
  | 'offering_claim_not_in_run'
  | 'offering_claim_not_current';

export class OfferingError extends Error {
  constructor(readonly code: OfferingErrorCode) {
    super(code);
    this.name = 'OfferingError';
  }
}

export interface OfferingRecord {
  id: string;
  researchRunId: string;
  companyText: string | null;
  companyLocationText: string | null;
  marketServedText: string | null;
  productText: string | null;
  applicationText: string | null;
  treatmentText: string | null;
  dimensionsText: string | null;
  priceText: string | null;
  priceCurrency: string | null;
  priceUnit: string | null;
  vatStatus: OfferingVatStatus;
  priceBasis: OfferingPriceBasis;
  sampleKind: OfferingSampleKind;
  matchType: OfferingMatchType;
  sourceReferenceId: string;
  evidenceId: string;
  claimId: string | null;
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
  evidence: EvidenceRecord;
}

export interface CreateOfferingData {
  researchRunId: string;
  companyText?: string;
  companyLocationText?: string;
  marketServedText?: string;
  productText?: string;
  applicationText?: string;
  treatmentText?: string;
  dimensionsText?: string;
  priceText?: string;
  priceCurrency?: string;
  priceUnit?: string;
  vatStatus?: OfferingVatStatus;
  priceBasis?: OfferingPriceBasis;
  sampleKind?: OfferingSampleKind;
  matchType?: OfferingMatchType;
  sourceReferenceId: string;
  evidenceId: string;
  claimId?: string;
}
