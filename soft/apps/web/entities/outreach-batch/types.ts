import type { OutreachDraftRead } from "@entities/outreach-draft";

export type OutreachBatchStatus =
  | "DRAFT"
  | "APPROVED"
  | "QUEUED"
  | "SENDING"
  | "SENT"
  | "CANCELLED";

export interface OutreachBatchRead {
  id: string;
  opportunityId: string;
  targetMarketId: string | null;
  senderProfileId: string | null;
  language: string;
  status: OutreachBatchStatus;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachBatchCountsRead {
  eligibleLeads: number;
  excludedByDecision: number;
  withoutRecipient: number;
  generatedDrafts: number;
  approvedDrafts: number;
  pendingDrafts: number;
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

export const OUTREACH_BATCH_STATUS_LABEL: Record<OutreachBatchStatus, string> = {
  DRAFT: "In review",
  APPROVED: "Approved",
  QUEUED: "Queued to send",
  SENDING: "Sending",
  SENT: "Sent",
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
  CANCELLED: "neutral",
};
