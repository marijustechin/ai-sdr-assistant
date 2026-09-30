import type { OutreachDraftRead } from "@entities/outreach-draft";

export type OutreachBatchStatus =
  | "DRAFT"
  | "APPROVED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export interface OutreachBatchRead {
  id: string;
  opportunityId: string;
  targetMarketId: string | null;
  senderProfileId: string | null;
  language: string;
  status: OutreachBatchStatus;
  approvedAt: string | null;
  paused: boolean;
  pacingSeconds: number | null;
  startedAt: string | null;
  messageStrategy: OutreachMessageStrategyRead | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachMessageStrategyRead {
  subject?: string | null;
  proposition?: string | null;
  terms?: string | null;
  cta?: string | null;
}

export interface OutreachBatchCountsRead {
  leadCandidates: number;
  eligibleLeads: number;
  rejectedOrStale: number;
  excludedByDecision: number;
  withoutRecipient: number;
  generatedDrafts: number;
  approvedDrafts: number;
  pendingDrafts: number;
  regeneratableDrafts: number;
  customizedDrafts: number;
}

export interface OutreachBatchPreviewRead {
  draftId: string;
  leadId: string;
  recipientEmail: string | null;
  subject: string | null;
  bodyExcerpt: string;
}

export interface OutreachBatchSummaryRead {
  batch: OutreachBatchRead;
  counts: OutreachBatchCountsRead;
  drafts: OutreachDraftRead[];
  representative: OutreachBatchPreviewRead[];
}

/** Send-layer state derived from the DB-backed outbound queue. */
export interface OutreachSendStateRead {
  approved: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  pending: number;
  sentCopyFailures: number;
  pacingSeconds: number;
  nextScheduledAt: string | null;
}

/** Controlled send-test preview: selectable drafts + recent test deliveries. */
export interface OutreachTestPreviewDraftRead {
  draftId: string;
  leadId: string;
  companyId: string;
  recipientEmail: string | null;
  subject: string | null;
  approvalStatus: "PENDING" | "APPROVED";
  preparationStatus: "PREPARED" | "BLOCKED";
  ready: boolean;
  blockedReason: string | null;
}

export interface OutreachTestDeliverySummaryRead {
  id: string;
  draftId: string;
  batchId: string;
  testRecipient: string;
  originalRecipient: string;
  subject: string;
  subjectPrefixed: boolean;
  status: "SENT" | "FAILED";
  sentCopyStatus: "PENDING" | "APPENDED" | "FAILED";
  failureCode: string | null;
  createdAt: string;
}

export interface OutreachTestPreviewRead {
  batchId: string;
  language: string;
  allowlist: string[];
  readyCount: number;
  blockedCount: number;
  drafts: OutreachTestPreviewDraftRead[];
  lastDeliveries: OutreachTestDeliverySummaryRead[];
}

export interface SendOutreachTestPreviewResultRead {
  batchId: string;
  scope: "ALL" | "SELECTED";
  testRecipients: string[];
  subjectPrefix: string | null;
  deliveries: OutreachTestDeliverySummaryRead[];
  sent: number;
  failed: number;
  appended: number;
  copyFailures: number;
  productionUnchanged: boolean;
}

export const OUTREACH_BATCH_STATUS_LABEL: Record<OutreachBatchStatus, string> = {
  DRAFT: "In review",
  APPROVED: "Approved",
  QUEUED: "Queued to send",
  SENDING: "Sending",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const OUTREACH_BATCH_STATUS_TONE: Record<
  OutreachBatchStatus,
  "neutral" | "info" | "success" | "warning" | "outline"
> = {
  DRAFT: "warning",
  APPROVED: "success",
  QUEUED: "info",
  SENDING: "info",
  SENT: "success",
  FAILED: "warning",
  CANCELLED: "neutral",
};
