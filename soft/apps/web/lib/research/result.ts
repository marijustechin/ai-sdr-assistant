/** Read-only shapes for the publishable research result (never secrets). */

export type ResearchClarificationState =
  | "AWAITING_REPLY"
  | "REPLY_RECEIVED"
  | "QUOTE_RECEIVED"
  | "NO_RESPONSE";

export type QuoteFollowUpStatus = "SCHEDULED" | "COMPLETED" | "EXPIRED";

export interface ResearchResultCountsRead {
  evidenceCount: number;
  sourceCount: number;
  currentSellers: number;
  potentialBuyers: number;
  publicPriceObservations: number;
  pendingClarifications: number;
  repliesReceived: number;
  quotesReceived: number;
  noResponseInquiries: number;
}

export interface ResearchResultInquiryRead {
  draftId: string;
  companyId: string;
  companyName: string;
  productName: string;
  recipientEmail: string | null;
  inquiryStatus: string;
  clarificationState: ResearchClarificationState;
  quoteId: string | null;
  quotePriceText: string | null;
  quoteCurrency: string | null;
  followUpStatus: QuoteFollowUpStatus | null;
  attemptCount: number;
  nextCheckAt: string | null;
  lastCheckedAt: string | null;
}

export interface ResearchResultRead {
  runId: string;
  opportunityId: string;
  status: string;
  researchCompletedAt: string | null;
  lastEnrichedAt: string | null;
  counts: ResearchResultCountsRead;
  inquiries: ResearchResultInquiryRead[];
}

export const CLARIFICATION_STATE_LABEL: Record<
  ResearchClarificationState,
  string
> = {
  AWAITING_REPLY: "Awaiting reply",
  REPLY_RECEIVED: "Reply received — no price provided",
  QUOTE_RECEIVED: "Quote received",
  NO_RESPONSE: "No response",
};

export const CLARIFICATION_STATE_TONE: Record<
  ResearchClarificationState,
  "neutral" | "info" | "success" | "warning" | "danger" | "outline"
> = {
  AWAITING_REPLY: "warning",
  REPLY_RECEIVED: "info",
  QUOTE_RECEIVED: "success",
  NO_RESPONSE: "neutral",
};
