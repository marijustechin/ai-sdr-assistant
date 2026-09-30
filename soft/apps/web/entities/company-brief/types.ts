export type BriefFindingKind =
  | "KNOWN_FACT"
  | "RECENT_ENRICHMENT"
  | "COMMERCIAL_HYPOTHESIS";

export type BriefSourceKind =
  | "PLATFORM"
  | "FIRST_PARTY"
  | "REGISTRY"
  | "NEWS"
  | "SOCIAL"
  | "MARKET_RESEARCH"
  | "OTHER";

export type CompanyBriefStatus =
  | "COMPILED"
  | "ENRICHMENT_REQUESTED"
  | "ENRICHED";

export interface BriefSourceRead {
  url: string;
  title?: string;
  publisher?: string;
  retrievedAt: string;
  kind?: BriefSourceKind;
}

export interface BriefFindingRead {
  statement: string;
  detail?: string;
  kind: BriefFindingKind;
  sources?: BriefSourceRead[];
}

export interface BriefContentRead {
  atAGlance: string[];
  companyOverview: BriefFindingRead[];
  relevantProductsOperations: BriefFindingRead[];
  whyThisAccountFits: BriefFindingRead[];
  existingRelationshipOutreach: BriefFindingRead[];
  keyPeopleContacts: BriefFindingRead[];
  financialSizeSignals: BriefFindingRead[];
  marketsCustomersChannels: BriefFindingRead[];
  recentActivity: BriefFindingRead[];
  reputationPublicFeedback: BriefFindingRead[];
  commercialHypotheses: BriefFindingRead[];
  thingsToKnowBeforeMeeting: BriefFindingRead[];
  questionsWorthAsking: string[];
  unknownsGaps: string[];
}

export interface CompanyBriefRead {
  id: string;
  opportunityId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBriefSnapshotMetaRead {
  version: number;
  status: CompanyBriefStatus;
  preparedAt: string;
  lastRefreshedAt: string;
  sourceCount: number;
}

export interface CompanyBriefSnapshotRead extends CompanyBriefSnapshotMetaRead {
  id: string;
  briefId: string;
  content: BriefContentRead;
  enrichmentNote: string | null;
  createdAt: string;
}

export interface CompanyBriefViewRead {
  brief: CompanyBriefRead;
  latest: CompanyBriefSnapshotRead;
  history: CompanyBriefSnapshotMetaRead[];
}

export const BRIEF_FINDING_KIND_LABEL: Record<BriefFindingKind, string> = {
  KNOWN_FACT: "Known fact",
  RECENT_ENRICHMENT: "Recent enrichment",
  COMMERCIAL_HYPOTHESIS: "Commercial hypothesis",
};

export const BRIEF_SECTION_LABEL: Record<keyof BriefContentRead, string> = {
  atAGlance: "At a glance",
  companyOverview: "Company overview",
  relevantProductsOperations: "Relevant products / operations",
  whyThisAccountFits: "Why this account may fit our offer",
  existingRelationshipOutreach: "Existing relationship / outreach history",
  keyPeopleContacts: "Key people / contacts",
  financialSizeSignals: "Financial / company-size signals",
  marketsCustomersChannels: "Markets / customers / channels",
  recentActivity: "Recent activity",
  reputationPublicFeedback: "Reputation / public feedback",
  commercialHypotheses: "Commercial hypotheses",
  thingsToKnowBeforeMeeting: "Things to know before the meeting",
  questionsWorthAsking: "Questions worth asking",
  unknownsGaps: "Unknowns / gaps",
};
