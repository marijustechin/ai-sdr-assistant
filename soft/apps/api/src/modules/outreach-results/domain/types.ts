import type {
  OutreachHandoffState,
  OutreachReplyClassification,
  OutreachReplySource,
} from '@ai-sdr/contracts';

export type {
  OutreachHandoffState,
  OutreachReplyClassification,
  OutreachReplySource,
};

/** One correlated inbound reply (original message + provenance preserved). */
export interface OutreachReplyRecord {
  id: string;
  batchId: string;
  outboundMessageId: string | null;
  opportunityId: string;
  leadId: string | null;
  companyId: string | null;
  draftId: string | null;
  emailAccountId: string;
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: Date | null;
  classification: OutreachReplyClassification;
  classificationSource: OutreachReplySource;
  classificationReason: string | null;
  handoffState: OutreachHandoffState;
  excerpt: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReplyData {
  batchId: string;
  outboundMessageId: string | null;
  opportunityId: string;
  leadId: string | null;
  companyId: string | null;
  draftId: string | null;
  emailAccountId: string;
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: Date | null;
  classification: OutreachReplyClassification;
  classificationSource: OutreachReplySource;
  classificationReason: string | null;
  handoffState: OutreachHandoffState;
  excerpt: string | null;
}

/** Minimal outbound reference used for correlation and the results table. */
export interface OutboundRef {
  id: string;
  messageId: string;
  recipientEmail: string;
  subject: string;
  sentAt: Date;
  leadId: string;
  companyId: string;
  draftId: string;
  emailAccountId: string;
  opportunityId: string;
}

/** One row of the results table (one per sent outreach message). */
export interface OutreachResultRow {
  outboundMessageId: string;
  companyId: string;
  companyName: string;
  recipientEmail: string;
  sentAt: string | null;
  replyStatus: 'REPLIED' | 'NO_RESPONSE';
  outcome: OutreachReplyClassification | null;
  handoffState: OutreachHandoffState | 'NONE';
  humanAction: string;
  notes: string | null;
  excerpt: string | null;
  replyId: string | null;
  classificationSource: OutreachReplySource | null;
}

export interface OutreachBatchResultCounts {
  sent: number;
  replies: number;
  positiveReplies: number;
  negativeReplies: number;
  noResponse: number;
  humanFollowUpRequired: number;
}

export interface OutreachBatchResults {
  batchId: string;
  opportunityId: string;
  counts: OutreachBatchResultCounts;
  rows: OutreachResultRow[];
  replies: OutreachReplyRecord[];
}
