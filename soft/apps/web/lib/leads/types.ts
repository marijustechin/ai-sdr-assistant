/**
 * Read-only shapes returned by the internal potential-buyer API.
 *
 * These mirror `apps/api/src/modules/lead-discoverer/domain/types.ts`. They are
 * display types only — the dashboard never derives demand, contacts or scores
 * from them.
 */

export type LeadReviewStatus = "UNREVIEWED" | "SHORTLISTED" | "REJECTED";

export type LeadObservedRole =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "IMPORTER"
  | "RETAILER"
  | "FABRICATOR"
  | "INSTALLER"
  | "BUILDER"
  | "DESIGNER"
  | "COMPETITOR"
  | "END_USER"
  | "OTHER"
  | "UNKNOWN";

export interface LeadCompanyRead {
  id: string;
  name: string;
  normalizedName: string;
  website: string | null;
  country: string | null;
}

export interface LeadSourceRead {
  id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
}

export type EvidenceVerificationStatus = "VERIFIED" | "UNVERIFIED";

export interface LeadEvidenceRead {
  id: string;
  researchRunId: string;
  evidenceText: string;
  verificationStatus: EvidenceVerificationStatus;
  retrievedAt: string | null;
  source: LeadSourceRead;
}

export type ClaimType = "FACT" | "INFERENCE" | "UNKNOWN";
export type ClaimConfidence = "HIGH" | "MEDIUM" | "LOW";
export type ClaimLifecycleStatus = "CURRENT" | "RETRACTED" | "REPLACED";

export interface LeadClaimRead {
  id: string;
  type: ClaimType;
  statement: string;
  confidence: ClaimConfidence;
  lifecycleStatus: ClaimLifecycleStatus;
  correctionReason: string | null;
  correctedAt: string | null;
  replacedByClaimId: string | null;
}

export interface LeadRead {
  id: string;
  opportunityId: string;
  companyId: string;
  company: LeadCompanyRead;
  observedActivityText: string;
  observedRoles: LeadObservedRole[];
  buyerFitHypothesisText: string;
  unknownsText: string | null;
  nextVerificationStepText: string | null;
  reviewStatus: LeadReviewStatus;
  reviewReason: string | null;
  reviewedAt: string | null;
  sourceReferenceId: string;
  evidenceId: string;
  claimId: string | null;
  dedupKey: string;
  /** True when the supporting claim is no longer CURRENT. */
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
  evidence: LeadEvidenceRead;
  claim: LeadClaimRead | null;
}

export interface LeadReviewActionResult {
  ok: boolean;
  message?: string;
  lead?: LeadRead;
}
