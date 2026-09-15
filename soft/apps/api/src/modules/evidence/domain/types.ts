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
