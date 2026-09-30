import type {
  OutreachOutboundStatus,
  OutreachSentCopyStatus,
  OutreachTestDeliveryStatus,
} from '@ai-sdr/contracts';

export type {
  OutreachOutboundStatus,
  OutreachSentCopyStatus,
  OutreachTestDeliveryStatus,
};

/** One immutable outbound message (DB-backed queue row). */
export interface OutboundRecord {
  id: string;
  batchId: string;
  draftId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  emailAccountId: string | null;
  senderProfileId: string | null;
  recipientEmail: string;
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  language: string;
  status: OutreachOutboundStatus;
  queuedAt: Date;
  nextEligibleAt: Date;
  attemptCount: number;
  lastAttemptAt: Date | null;
  lockedUntil: Date | null;
  smtpSubmittedAt: Date | null;
  messageId: string;
  providerMessageId: string | null;
  failureCode: string | null;
  sentCopyStatus: OutreachSentCopyStatus;
  sentCopyAttempts: number;
  sentCopyError: string | null;
  sentCopyAppendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOutboundData {
  batchId: string;
  draftId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  emailAccountId: string | null;
  senderProfileId: string | null;
  recipientEmail: string;
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  language: string;
  messageId: string;
  nextEligibleAt: Date;
}

export interface SendStateCounts {
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

/**
 * One **test** copy of a prepared draft sent to an explicitly supplied test
 * recipient. Tracked separately from production outbound rows; it never advances
 * production state.
 */
export interface TestDeliveryRecord {
  id: string;
  batchId: string;
  draftId: string;
  opportunityId: string;
  leadId: string;
  emailAccountId: string | null;
  senderProfileId: string | null;
  originalRecipient: string;
  testRecipient: string;
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  subject: string;
  subjectPrefixed: boolean;
  language: string;
  status: OutreachTestDeliveryStatus;
  messageId: string;
  providerMessageId: string | null;
  failureCode: string | null;
  smtpSubmittedAt: Date | null;
  sentCopyStatus: OutreachSentCopyStatus;
  sentCopyAttempts: number;
  sentCopyError: string | null;
  sentCopyAppendedAt: Date | null;
  rawMessage: Uint8Array<ArrayBuffer> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTestDeliveryData {
  batchId: string;
  draftId: string;
  opportunityId: string;
  leadId: string;
  emailAccountId: string | null;
  senderProfileId: string | null;
  originalRecipient: string;
  testRecipient: string;
  fromName: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  subject: string;
  subjectPrefixed: boolean;
  language: string;
  status: OutreachTestDeliveryStatus;
  messageId: string;
  providerMessageId: string | null;
  failureCode: string | null;
  smtpSubmittedAt: Date | null;
  rawMessage: Uint8Array<ArrayBuffer> | null;
}
