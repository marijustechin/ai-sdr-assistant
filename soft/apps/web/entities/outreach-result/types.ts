export type OutreachReplyClassification =
  | "INTERESTED"
  | "PRICE_REQUEST"
  | "MORE_INFO"
  | "NOT_INTERESTED"
  | "WRONG_CONTACT"
  | "OUT_OF_OFFICE"
  | "OTHER";

export type OutreachReplySource = "AUTO" | "HUMAN";
export type OutreachHandoffState = "NO_HANDOFF" | "HANDOFF_TO_HUMAN";

export interface OutreachReplyRead {
  id: string;
  batchId: string;
  outboundMessageId: string | null;
  opportunityId: string;
  leadId: string | null;
  companyId: string | null;
  fromEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: string | null;
  classification: OutreachReplyClassification;
  classificationSource: OutreachReplySource;
  classificationReason: string | null;
  handoffState: OutreachHandoffState;
  excerpt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface OutreachResultRowRead {
  outboundMessageId: string;
  companyId: string;
  companyName: string;
  recipientEmail: string;
  sentAt: string | null;
  replyStatus: "REPLIED" | "NO_RESPONSE";
  outcome: OutreachReplyClassification | null;
  handoffState: OutreachHandoffState | "NONE";
  humanAction: string;
  notes: string | null;
  excerpt: string | null;
  replyId: string | null;
  classificationSource: OutreachReplySource | null;
}

export interface OutreachBatchResultCountsRead {
  sent: number;
  replies: number;
  positiveReplies: number;
  negativeReplies: number;
  noResponse: number;
  humanFollowUpRequired: number;
}

export interface OutreachBatchResultsRead {
  batchId: string;
  opportunityId: string;
  counts: OutreachBatchResultCountsRead;
  rows: OutreachResultRowRead[];
  replies: OutreachReplyRead[];
}

export const OUTREACH_POSITIVE_CLASSIFICATIONS: OutreachReplyClassification[] = [
  "INTERESTED",
  "PRICE_REQUEST",
  "MORE_INFO",
];

export function isPositiveClassification(
  value: OutreachReplyClassification | null,
): boolean {
  return value !== null && OUTREACH_POSITIVE_CLASSIFICATIONS.includes(value);
}

export const OUTREACH_CLASSIFICATION_LABEL: Record<
  OutreachReplyClassification,
  string
> = {
  INTERESTED: "Interested",
  PRICE_REQUEST: "Price request",
  MORE_INFO: "More info requested",
  NOT_INTERESTED: "Not interested",
  WRONG_CONTACT: "Wrong contact",
  OUT_OF_OFFICE: "Out of office",
  OTHER: "Other",
};

export const OUTREACH_CLASSIFICATION_TONE: Record<
  OutreachReplyClassification,
  "neutral" | "info" | "success" | "warning" | "outline"
> = {
  INTERESTED: "success",
  PRICE_REQUEST: "success",
  MORE_INFO: "success",
  NOT_INTERESTED: "neutral",
  WRONG_CONTACT: "warning",
  OUT_OF_OFFICE: "info",
  OTHER: "outline",
};
