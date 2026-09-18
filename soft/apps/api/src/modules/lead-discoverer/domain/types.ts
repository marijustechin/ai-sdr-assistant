import type {
  AgentQualificationStatus,
  LeadObservedRole,
  LeadReviewStatus,
} from '@ai-sdr/contracts';

export type { AgentQualificationStatus, LeadObservedRole, LeadReviewStatus };

export interface CompanyRecord {
  id: string;
  name: string;
  normalizedName: string;
  website: string | null;
  country: string | null;
}

export interface LeadSourceRecord {
  id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
}

export interface LeadEvidenceRecord {
  id: string;
  researchRunId: string;
  evidenceText: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  retrievedAt: Date | null;
  source: LeadSourceRecord;
}

export interface LeadClaimRecord {
  id: string;
  type: 'FACT' | 'INFERENCE' | 'UNKNOWN';
  statement: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  lifecycleStatus: 'CURRENT' | 'RETRACTED' | 'REPLACED';
  correctionReason: string | null;
  correctedAt: Date | null;
  replacedByClaimId: string | null;
}

export interface LeadRecord {
  id: string;
  opportunityId: string;
  companyId: string;
  company: CompanyRecord;
  observedActivityText: string;
  observedRoles: LeadObservedRole[];
  buyerFitHypothesisText: string;
  unknownsText: string | null;
  nextVerificationStepText: string | null;
  reviewStatus: LeadReviewStatus;
  reviewReason: string | null;
  reviewedAt: Date | null;
  /** Agent qualification, separate from operator review. */
  agentQualificationStatus: AgentQualificationStatus;
  agentQualificationReason: string | null;
  agentAssessedAt: Date | null;
  /**
   * True when the supporting claim is no longer CURRENT, so any prior agent
   * qualification rests on superseded evidence and must be reassessed.
   */
  agentQualificationStale: boolean;
  /**
   * True when the candidate may proceed to contact discovery: not explicitly
   * rejected by a human, not resting on superseded evidence, and either
   * agent-qualified or human-shortlisted.
   */
  eligibleForContactDiscovery: boolean;
  sourceReferenceId: string;
  evidenceId: string;
  claimId: string | null;
  dedupKey: string;
  /**
   * True when the supporting claim is no longer `CURRENT` (replaced/retracted):
   * the lead must be re-reviewed rather than silently supporting a finding.
   */
  needsReview: boolean;
  createdAt: Date;
  updatedAt: Date;
  evidence: LeadEvidenceRecord;
  claim: LeadClaimRecord | null;
}

export interface CreateLeadData {
  opportunityId: string;
  companyName: string;
  website?: string;
  country?: string;
  observedActivityText: string;
  observedRoles: LeadObservedRole[];
  buyerFitHypothesisText: string;
  unknownsText?: string;
  nextVerificationStepText?: string;
  sourceReferenceId: string;
  evidenceId: string;
  claimId?: string;
}

export interface UpdateLeadReviewData {
  reviewStatus: LeadReviewStatus;
  reviewReason?: string;
}

export interface UpdateQualificationData {
  status: AgentQualificationStatus;
  reason?: string;
}

/** Typed failure raised by the repository and mapped to HTTP by the service. */
export class LeadError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'LeadError';
  }
}
