/**
 * Read-only shapes returned by the internal quote-collection API. Mirrors the
 * API contract; never carries transport secrets.
 */

export type QuoteOutboundStatus = "SUBMITTED" | "FAILED";
export type QuoteInboundStatus = "MATCHED" | "UNMATCHED" | "EXTRACTED";
export type QuoteMatchConfidence = "HEADER" | "FALLBACK" | "NONE";
export type MarketResearchPriceState =
  | "PRICE_INQUIRY_PREPARED"
  | "AWAITING_REPLY"
  | "REPLY_RECEIVED"
  | "QUOTE_EXTRACTED"
  | "NO_RESPONSE";

export interface QuoteOutboundMessageRead {
  id: string;
  priceInquiryDraftId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  productId: string;
  senderProfileId: string | null;
  emailAccountId: string | null;
  fromEmail: string;
  replyToEmail: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  messageId: string;
  providerMessageId: string | null;
  submissionStatus: QuoteOutboundStatus;
  failureCode: string | null;
  sentAt: string;
  createdAt: string;
}

export interface QuoteInboundMessageRead {
  id: string;
  emailAccountId: string | null;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  mailboxUid: string;
  providerMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  toEmail: string | null;
  subject: string | null;
  bodyText: string;
  receivedAt: string | null;
  processingStatus: QuoteInboundStatus;
  matchConfidence: QuoteMatchConfidence;
  researchRunId: string | null;
  sourceReferenceId: string | null;
  evidenceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQuoteRead {
  id: string;
  inboundMessageId: string;
  outboundMessageId: string | null;
  priceInquiryDraftId: string | null;
  researchRunId: string | null;
  priceText: string | null;
  priceAmount: number | null;
  currency: string | null;
  priceUnit: string | null;
  moqText: string | null;
  incoterm: string | null;
  loadingLocationText: string | null;
  leadTimeText: string | null;
  validityText: string | null;
  vatIncluded: boolean | null;
  qualificationText: string | null;
  fieldProvenance: Record<string, string> | null;
  warnings: string[];
  sourceReferenceId: string | null;
  evidenceId: string | null;
  createdAt: string;
}

export interface QuoteCollectionItemRead {
  draftId: string;
  marketResearchState: MarketResearchPriceState;
  outbound: QuoteOutboundMessageRead | null;
  inboundMessages: QuoteInboundMessageRead[];
  quotes: SupplierQuoteRead[];
}
