import type { QuoteFollowUpStatus } from '@ai-sdr/contracts';

export type { QuoteFollowUpStatus };

/** Persisted reply-check schedule for one sent price inquiry. */
export interface QuoteFollowUpRecord {
  id: string;
  priceInquiryDraftId: string;
  outboundMessageId: string | null;
  emailAccountId: string | null;
  opportunityId: string;
  leadId: string;
  status: QuoteFollowUpStatus;
  attemptCount: number;
  nextCheckAt: Date;
  lastCheckedAt: Date | null;
  lockedUntil: Date | null;
  completedAt: Date | null;
  lastResult: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnsureFollowUpData {
  priceInquiryDraftId: string;
  outboundMessageId: string | null;
  emailAccountId: string | null;
  opportunityId: string;
  leadId: string;
  nextCheckAt: Date;
}

/** Per-inquiry clarification + follow-up view for the research result. */
export interface InquiryClarificationView {
  draftId: string;
  quoteId: string | null;
  quotePriceText: string | null;
  quoteCurrency: string | null;
  followUpStatus: QuoteFollowUpStatus | null;
  attemptCount: number;
  nextCheckAt: Date | null;
  lastCheckedAt: Date | null;
}
