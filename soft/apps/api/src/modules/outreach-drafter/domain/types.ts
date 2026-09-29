import type {
  OutreachApprovalStatus,
  OutreachBatchStatus,
  OutreachDecisionSource,
  OutreachDecisionStatus,
  OutreachPreparationStatus,
} from '@ai-sdr/contracts';

export type {
  OutreachApprovalStatus,
  OutreachBatchStatus,
  OutreachDecisionSource,
  OutreachDecisionStatus,
  OutreachPreparationStatus,
};

/** Non-secret sender identity actually used for a draft (never credentials). */
export interface SenderSnapshot {
  senderName: string;
  /** Canonical role/title, passed through verbatim (never translated). */
  senderTitle: string | null;
  companyName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  phone: string | null;
  website: string | null;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  includeLogoInSignature: boolean;
  logoUrl: string | null;
}

/**
 * Human outreach decision for one (opportunity, company) scope. Kept separate
 * from research evidence and the agent qualification; a human exclusion
 * overrides both.
 */
export interface OutreachDecisionRecord {
  id: string;
  opportunityId: string;
  companyId: string;
  decision: OutreachDecisionStatus;
  note: string | null;
  decidedByKind: OutreachDecisionSource;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetOutreachDecisionData {
  decision: OutreachDecisionStatus;
  note?: string | null;
}

export interface OutreachDraftRecord {
  id: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  contactId: string | null;
  recipientEmail: string | null;
  language: string;
  preparationStatus: OutreachPreparationStatus;
  subject: string | null;
  body: string | null;
  /** Human-editable canonical message body (without closing/signature). */
  canonicalBody: string | null;
  /** Generated HTML body (text body + HTML signature); never trusted HTML. */
  htmlBody: string | null;
  rationale: string;
  recipientRationale: string;
  missingFields: string[];
  contextVersion: number | null;
  evidenceId: string | null;
  claimId: string | null;
  sourceReferenceId: string | null;
  senderProfileId: string | null;
  /** Mailbox connection resolved from the sender profile (no secret snapshot). */
  emailAccountId: string | null;
  senderSnapshot: SenderSnapshot | null;
  version: number;
  /** Batch this version belongs to (review grouping); null when unbatched. */
  batchId: string | null;
  /** True once a human revised this draft (exception editing). */
  customized: boolean;
  approvalStatus: OutreachApprovalStatus;
  approvedAt: Date | null;
  createdAt: Date;
  /** True when a current input (lead qualification/review, recipient, sender) changed. */
  inputsStale: boolean;
  staleReasons: string[];
}

export interface CreateDraftData {
  opportunityId: string;
  leadId: string;
  companyId: string;
  contactId?: string;
  recipientEmail?: string;
  language: string;
  preparationStatus: OutreachPreparationStatus;
  subject?: string;
  body?: string;
  canonicalBody?: string;
  htmlBody?: string;
  rationale: string;
  recipientRationale: string;
  missingFields: string[];
  contextVersion?: number;
  evidenceId?: string;
  claimId?: string;
  sourceReferenceId?: string;
  senderProfileId?: string;
  emailAccountId?: string;
  senderSnapshot?: SenderSnapshot;
  version: number;
  fingerprint: string;
  batchId?: string;
  customized?: boolean;
  approvalStatus?: OutreachApprovalStatus;
}

/** A whole-batch review unit for one opportunity scope. */
export interface OutreachBatchRecord {
  id: string;
  opportunityId: string;
  targetMarketId: string | null;
  senderProfileId: string | null;
  language: string;
  status: OutreachBatchStatus;
  approvedByKind: OutreachDecisionSource;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBatchData {
  opportunityId: string;
  targetMarketId: string | null;
  senderProfileId: string | null;
  language: string;
}

/** Live classification counts for the batch review surface. */
export interface OutreachBatchCounts {
  eligibleLeads: number;
  excludedByDecision: number;
  withoutRecipient: number;
  generatedDrafts: number;
  approvedDrafts: number;
  pendingDrafts: number;
}

export interface OutreachBatchPreview {
  draftId: string;
  leadId: string;
  recipientEmail: string | null;
  subject: string | null;
  bodyExcerpt: string;
}

export interface OutreachBatchSummary {
  batch: OutreachBatchRecord;
  counts: OutreachBatchCounts;
  drafts: OutreachDraftRecord[];
  representative: OutreachBatchPreview[];
}
