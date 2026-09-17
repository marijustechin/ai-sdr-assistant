/**
 * Read-only shapes returned by the internal research API.
 *
 * These mirror the API response records (see `apps/api/src/modules/
 * market-researcher|evidence/domain/types.ts`). They are display types only —
 * the dashboard never derives new structured facts from them.
 */

export type TargetMarketStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface TargetMarketRead {
  id: string;
  country: string;
  segment: string;
  lifecycleStatus: TargetMarketStatus;
}

export type OpportunityStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type OfferCommercialStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface OfferRead {
  id: string;
  productId: string;
  name: string;
  commercialStatus: OfferCommercialStatus;
}

export interface OpportunityRead {
  id: string;
  offerId: string;
  name: string;
  objective: string | null;
  lifecycleStatus: OpportunityStatus;
  contextVersion: number;
  targetMarkets: TargetMarketRead[];
}

export type ResearchRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ResearchRunPauseReason =
  | "BUDGET_EXHAUSTED"
  | "ACCESS_BLOCKED"
  | "CONTEXT_CHANGED"
  | "DIMINISHING_RETURNS"
  | "NEEDS_HUMAN";

export interface ResearchRunSummary {
  id: string;
  opportunityId: string;
  status: ResearchRunStatus;
  contextVersion: number;
  pauseReason: ResearchRunPauseReason | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  checkpointAt: string | null;
}

export type ResearchQueryStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface ResearchQueryRead {
  id: string;
  researchRunId: string;
  queryText: string;
  provider: string | null;
  status: ResearchQueryStatus;
  executedAt: string | null;
  resultCount: number | null;
  errorCode: string | null;
  errorNote: string | null;
  createdAt: string;
}

export interface ResearchRunDetail {
  id: string;
  opportunityId: string;
  status: ResearchRunStatus;
  contextVersion: number;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorCode: string | null;
  errorNote: string | null;
  pauseReason: ResearchRunPauseReason | null;
  pauseNote: string | null;
  checkpoint: unknown;
  checkpointAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetMarketIds: string[];
  queries: ResearchQueryRead[];
}

export interface SourceRead {
  id: string;
  url: string;
  title: string | null;
  publisher: string | null;
  sourceType: string | null;
}

export type EvidenceVerificationStatus = "VERIFIED" | "UNVERIFIED";

export interface EvidenceRead {
  id: string;
  sourceReferenceId: string;
  researchRunId: string;
  evidenceText: string;
  verificationStatus: EvidenceVerificationStatus;
  retrievedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: SourceRead;
}

export type ClaimType = "FACT" | "INFERENCE" | "UNKNOWN";
export type ClaimConfidence = "HIGH" | "MEDIUM" | "LOW";
export type ClaimEvidenceStance = "SUPPORTS" | "REFUTES" | "CONTEXT";
export type ClaimLifecycleStatus = "CURRENT" | "RETRACTED" | "REPLACED";

export interface ClaimEvidenceLinkRead {
  id: string;
  evidenceId: string;
  stance: ClaimEvidenceStance;
}

export interface ClaimRead {
  id: string;
  researchRunId: string;
  type: ClaimType;
  statement: string;
  confidence: ClaimConfidence;
  lifecycleStatus: ClaimLifecycleStatus;
  correctionReason: string | null;
  correctedAt: string | null;
  replacedByClaimId: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: ClaimEvidenceLinkRead[];
}

export type OfferingVatStatus =
  | "INCLUDED"
  | "EXCLUDED"
  | "NOT_STATED"
  | "UNKNOWN";
export type OfferingPriceBasis = "RETAIL_LIST" | "TRADE_B2B" | "UNKNOWN";
export type OfferingSampleKind = "SAMPLE" | "FULL_PRODUCT" | "UNKNOWN";
export type OfferingMatchType =
  | "EXACT_MATCH"
  | "ADJACENT"
  | "SUBSTITUTE"
  | "UNKNOWN";

export interface OfferingRead {
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
  priceAmountNumeric: number | null;
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
  createdAt: string;
  updatedAt: string;
  evidence: EvidenceRead;
}
